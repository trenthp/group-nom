'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'checking'
export type LocationSource = 'gps' | 'manual' | null

export interface LocationState {
  // Permission
  permissionState: PermissionState

  // Location data
  coordinates: { lat: number; lng: number } | null
  locationName: string
  /** Whether location was obtained via GPS ('gps') or manual entry ('manual') */
  locationSource: LocationSource

  // Loading/error states
  isLoading: boolean
  error: string | null

  // Actions
  requestPermission: () => Promise<boolean>
  setManualLocation: (coords: { lat: number; lng: number }, name: string) => void
  geocodeAddress: (address: string) => Promise<boolean>
  refreshCurrentLocation: () => Promise<boolean>
}

/**
 * Hook for managing location with permission awareness
 *
 * Flow:
 * 1. On mount, checks permission state (doesn't trigger browser prompt)
 * 2. If 'granted', automatically fetches location
 * 3. If 'prompt', waits for requestPermission() call (show modal first)
 * 4. If 'denied', allows manual location entry only
 */
export function useLocation(): LocationState {
  const [permissionState, setPermissionState] = useState<PermissionState>('checking')
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [locationName, setLocationName] = useState('')
  const [locationSource, setLocationSource] = useState<LocationSource>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track if we've already auto-fetched on grant
  const hasFetchedRef = useRef(false)

  // Reverse geocode coordinates to get a friendly name
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      })
      if (response.ok) {
        const data = await response.json()
        return data.formattedAddress || data.city || 'Current Location'
      }
    } catch {
      // Non-fatal
    }
    return 'Current Location'
  }, [])

  // Get current position from browser
  const getCurrentPosition = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {
          resolve(null)
        },
        { timeout: 10000, maximumAge: 300000 } // 10s timeout, 5min cache
      )
    })
  }, [])

  // Fetch location and reverse geocode
  const fetchLocation = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    const coords = await getCurrentPosition()

    if (coords) {
      setCoordinates(coords)
      const name = await reverseGeocode(coords.lat, coords.lng)
      setLocationName(name)
      setLocationSource('gps')
      setIsLoading(false)
      return true
    } else {
      setError('Unable to get your location')
      setIsLoading(false)
      return false
    }
  }, [getCurrentPosition, reverseGeocode])

  // Check permission state on mount
  useEffect(() => {
    async function checkPermission() {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        setPermissionState('unsupported')
        setError('Geolocation is not supported by your browser')
        return
      }

      // Check if Permissions API is supported
      if (!navigator.permissions) {
        // Fallback: assume 'prompt' state - older browsers
        setPermissionState('prompt')
        return
      }

      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' })
        setPermissionState(permission.state as PermissionState)

        // Listen for permission changes (user changed in browser settings)
        permission.addEventListener('change', () => {
          setPermissionState(permission.state as PermissionState)
        })

        // If already granted, fetch location automatically
        if (permission.state === 'granted' && !hasFetchedRef.current) {
          hasFetchedRef.current = true
          fetchLocation()
        }
      } catch {
        // Permissions API failed, assume 'prompt'
        setPermissionState('prompt')
      }
    }

    checkPermission()
  }, [fetchLocation])

  // Request permission (triggers browser prompt)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    const success = await fetchLocation()

    if (success) {
      setPermissionState('granted')
    } else {
      // Check if it was denied
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' })
          setPermissionState(permission.state as PermissionState)
        } catch {
          setPermissionState('denied')
        }
      } else {
        setPermissionState('denied')
      }
    }

    return success
  }, [fetchLocation])

  // Set location manually (for denied state or custom location)
  const setManualLocation = useCallback((coords: { lat: number; lng: number }, name: string) => {
    setCoordinates(coords)
    setLocationName(name)
    setLocationSource('manual')
    setError(null)
  }, [])

  // Geocode an address to coordinates
  const geocodeAddress = useCallback(async (address: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })

      const data = await response.json()

      if (!response.ok || !data.location) {
        throw new Error(data.error || 'Location not found')
      }

      setCoordinates(data.location)
      setLocationName(data.formattedAddress || address)
      setLocationSource('manual')
      setIsLoading(false)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not find that location')
      setIsLoading(false)
      return false
    }
  }, [])

  // Refresh current location (re-fetch from GPS)
  const refreshCurrentLocation = useCallback(async (): Promise<boolean> => {
    if (permissionState !== 'granted') {
      return requestPermission()
    }
    return fetchLocation()
  }, [permissionState, requestPermission, fetchLocation])

  return {
    permissionState,
    coordinates,
    locationName,
    locationSource,
    isLoading,
    error,
    requestPermission,
    setManualLocation,
    geocodeAddress,
    refreshCurrentLocation,
  }
}
