'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import RestaurantFilters from '@/components/RestaurantFilters'
import Header from '@/components/Header'
import { getUserLocation } from '@/lib/googleMaps'

export default function SetupPage() {
  const router = useRouter()

  const [filters, setFilters] = useState<{
    minRating: number
    openNow: boolean
    maxReviews: number
    distance: number
  }>({
    minRating: 0,
    openNow: false,
    maxReviews: 0,
    distance: 5,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationAddress, setLocationAddress] = useState<string>('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string>('')

  // Store the current location so we can switch back to it
  const currentLocationRef = useRef<{ coords: { lat: number; lng: number } | null; name: string }>({
    coords: null,
    name: '',
  })

  // Auto-fetch current location on mount
  useEffect(() => {
    const fetchCurrentLocation = async () => {
      setLocationLoading(true)
      const loc = await getUserLocation()
      if (loc) {
        setLocation(loc)
        setLocationAddress('Current Location')
        currentLocationRef.current = { coords: loc, name: 'Current Location' }

        // Reverse geocode to get city/state
        try {
          const response = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: loc.lat, lng: loc.lng }),
          })
          if (response.ok) {
            const data = await response.json()
            if (data.formattedAddress) {
              setLocationAddress(data.formattedAddress)
              currentLocationRef.current.name = data.formattedAddress
            }
          }
        } catch (err) {
          console.error('Error reverse geocoding:', err)
        }
      } else {
        // Fallback to NYC
        setLocation({ lat: 40.7128, lng: -74.006 })
        setLocationAddress('New York, NY')
        currentLocationRef.current = { coords: { lat: 40.7128, lng: -74.006 }, name: 'New York, NY' }
      }
      setLocationLoading(false)
    }
    fetchCurrentLocation()
  }, [])

  const handleUseCurrentLocation = () => {
    setLocationError('')
    if (currentLocationRef.current.coords) {
      setLocation(currentLocationRef.current.coords)
      setLocationAddress(currentLocationRef.current.name)
    }
  }

  const handleCustomLocationSubmit = async (query: string) => {
    setLocationLoading(true)
    setLocationError('')

    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: query }),
      })

      const data = await response.json()

      if (!response.ok || !data.location) {
        throw new Error(data.error || 'Location not found')
      }

      setLocation(data.location)
      setLocationAddress(data.formattedAddress || query)
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'Could not find that location')
    } finally {
      setLocationLoading(false)
    }
  }

  const handleStartSession = async () => {
    // Validate location
    if (!location) {
      setError('Please select a location to search for restaurants')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create session via API - code will be generated server-side
      const response = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters,
          location,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create session')
      }

      const result = await response.json()
      const sessionCode = result.session.code

      // Store user ID for this session
      localStorage.setItem(`user-${sessionCode}`, result.userId)

      // Navigate to the session
      router.push(`/session/${sessionCode}`)
    } catch (err) {
      console.error('Error starting session:', err)
      setError(err instanceof Error ? err.message : 'Failed to start session')
      setLoading(false)
    }
  }

  // Show loading screen while creating session
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex flex-col items-center justify-center p-4">
        <div className="bg-white bg-opacity-20 backdrop-blur rounded-3xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <Image
              src="/logo_groupNom.png"
              alt="Group Nom"
              width={80}
              height={80}
              className="mx-auto rounded-xl mb-4 animate-spin"
            />
            <h1 className="text-3xl font-bold text-white mb-2">
              Starting Your Session
            </h1>
            <p className="text-white text-opacity-90 mb-4">
              Finding the best restaurants for you...
            </p>
          </div>

          <div className="space-y-3 text-sm text-white text-opacity-80">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <p>Searching nearby restaurants</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-150"></div>
              <p>Applying your filters</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-300"></div>
              <p>Creating your session</p>
            </div>
          </div>

          <p className="text-xs text-white text-opacity-60 mt-6">
            This may take a few seconds...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600">
      <Header />
      <div className="flex flex-col items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Configure Session</h1>
            <p className="text-orange-100 mb-4">Set your restaurant preferences</p>
          </div>

        <RestaurantFilters
          filters={filters}
          onFiltersChange={setFilters}
          locationName={locationAddress}
          onCustomLocationSubmit={handleCustomLocationSubmit}
          onUseCurrentLocation={handleUseCurrentLocation}
          locationLoading={locationLoading}
          locationError={locationError}
        />

        {error && (
          <div className="mt-4 bg-red-500 text-white p-4 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={handleStartSession}
          disabled={loading}
          className="w-full bg-white text-orange-600 font-bold py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition mt-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          Start Session
        </button>

        <div className="mt-6 text-center text-orange-100 text-sm">
          <p>These filters will apply to all participants in this session.</p>
        </div>
        </div>
      </div>
    </div>
  )
}
