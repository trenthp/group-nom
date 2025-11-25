'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import RestaurantFilters from '@/components/RestaurantFilters'
import ShareCode from '@/components/ShareCode'
import { getUserLocation } from '@/lib/googleMaps'

export default function SessionSetupPage() {
  console.log('🎯 SETUP PAGE IS RENDERING')

  const params = useParams()
  const router = useRouter()
  const sessionCode = params.code as string

  console.log('📍 Session code:', sessionCode)

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
  const [initialized, setInitialized] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationAddress, setLocationAddress] = useState<string>('')

  // Initialize pending session when component mounts
  useEffect(() => {
    const initSession = async () => {
      try {
        // Get or create user ID
        const storedUserId = localStorage.getItem(`user-${sessionCode}`)
        const userId = storedUserId || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        if (!storedUserId) {
          localStorage.setItem(`user-${sessionCode}`, userId)
        }

        // Initialize pending session
        const response = await fetch('/api/session/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: sessionCode, userId }),
        })

        if (response.status === 409) {
          // Session already exists - that's okay, host might have refreshed
          console.log('Session already exists')
          setInitialized(true)
          return
        }

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to initialize session')
        }

        console.log('Pending session initialized')
        setInitialized(true)
      } catch (err) {
        console.error('Error initializing session:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize session')
      }
    }

    initSession()
  }, [sessionCode])

  // Auto-fetch current location on mount
  useEffect(() => {
    const fetchCurrentLocation = async () => {
      const loc = await getUserLocation()
      if (loc) {
        setLocation(loc)
        setLocationAddress('Using your current location')
      } else {
        // Fallback to NYC
        setLocation({ lat: 40.7128, lng: -74.006 })
        setLocationAddress('New York, NY (default location)')
      }
    }
    fetchCurrentLocation()
  }, [])

  const handleStartSession = async () => {
    console.log('🔥 START SESSION BUTTON CLICKED!')

    // Validate location
    if (!location) {
      setError('Please select a location to search for restaurants')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get user ID or create one
      const storedUserId = localStorage.getItem(`user-${sessionCode}`)
      const userId = storedUserId || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      if (!storedUserId) {
        localStorage.setItem(`user-${sessionCode}`, userId)
      }

      // Create session via API
      console.log('Creating session:', { code: sessionCode, userId, filters, location })

      const response = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: sessionCode,
          userId,
          filters,
          location,
        }),
      })

      console.log('Create session response status:', response.status)

      if (!response.ok) {
        const data = await response.json()
        console.error('Create session error:', data)
        throw new Error(data.error || 'Failed to create session')
      }

      const result = await response.json()
      console.log('Session created successfully:', result)

      // Navigate to the actual session
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
            <div className="text-6xl mb-4 animate-spin">🍽️</div>
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
              <p>Creating session code: <span className="font-bold">{sessionCode}</span></p>
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
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Configure Session</h1>
          <p className="text-orange-100 mb-4">Set your restaurant preferences</p>
        </div>

        <RestaurantFilters filters={filters} onFiltersChange={setFilters} />

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
          {loading ? 'Creating Session...' : 'Start Session'}
        </button>

        <div className="mt-6 text-center text-orange-100 text-sm">
          <p>These filters will apply to all participants in this session.</p>
        </div>

        <div className="mt-8">
          <ShareCode code={sessionCode} />
        </div>

        {locationAddress && (
          <div className="mt-4 text-white text-sm text-center bg-white bg-opacity-20 py-3 px-4 rounded-lg">
            📍 {locationAddress}
          </div>
        )}
      </div>
    </div>
  )
}
