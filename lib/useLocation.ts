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
 * Location with permission awareness (ported from the map branch).
 *
 * Flow:
 * 1. On mount, checks permission state WITHOUT triggering the browser prompt
 * 2. If 'granted', fetches location automatically
 * 3. If 'prompt', waits for requestPermission() — show an explainer modal first
 *    (LocationPermissionModal) so the browser prompt never appears cold
 * 4. If 'denied'/'unsupported', manual entry only
 */
export function useLocation(): LocationState {
  const [permissionState, setPermissionState] = useState<PermissionState>('checking')
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [locationName, setLocationName] = useState('')
  const [locationSource, setLocationSource] = useState<LocationSource>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only auto-fetch once per mount when permission is already granted
  const hasFetchedRef = useRef(false)

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      })
      if (response.ok) {
        const data = await response.json()
        return data.formattedAddress || data.city || 'Current location'
      }
    } catch {
      // Non-fatal — fall through to the generic name
    }
    return 'Current location'
  }, [])

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

  // Check permission state on mount — never triggers the browser prompt
  useEffect(() => {
    let cancelled = false
    let permissionStatus: PermissionStatus | null = null
    let onPermissionChange: (() => void) | null = null

    async function checkPermission() {
      // Yield a microtask so no state lands synchronously in the effect body
      await Promise.resolve()
      if (cancelled) return

      if (!navigator.geolocation) {
        setPermissionState('unsupported')
        setError('Location is not supported by your browser')
        return
      }

      if (!navigator.permissions) {
        // Older browsers without the Permissions API: assume we'd prompt
        setPermissionState('prompt')
        return
      }

      try {
        permissionStatus = await navigator.permissions.query({ name: 'geolocation' })
        if (cancelled) return
        setPermissionState(permissionStatus.state as PermissionState)

        // Track changes made in browser settings while the page is open
        onPermissionChange = () => {
          if (!cancelled && permissionStatus) {
            setPermissionState(permissionStatus.state as PermissionState)
          }
        }
        permissionStatus.addEventListener('change', onPermissionChange)

        if (permissionStatus.state === 'granted' && !hasFetchedRef.current) {
          hasFetchedRef.current = true
          fetchLocation()
        }
      } catch {
        if (!cancelled) setPermissionState('prompt')
      }
    }

    checkPermission()

    return () => {
      cancelled = true
      if (permissionStatus && onPermissionChange) {
        permissionStatus.removeEventListener('change', onPermissionChange)
      }
    }
  }, [fetchLocation])

  // Trigger the browser prompt (call only after the user opted in)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    const success = await fetchLocation()

    if (success) {
      setPermissionState('granted')
    } else {
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

  const setManualLocation = useCallback((coords: { lat: number; lng: number }, name: string) => {
    setCoordinates(coords)
    setLocationName(name)
    setLocationSource('manual')
    setError(null)
  }, [])

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
        throw new Error(data.error || 'Could not find that location')
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
