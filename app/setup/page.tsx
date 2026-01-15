'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import RestaurantFilters from '@/components/RestaurantFilters'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getUserLocation } from '@/lib/googleMaps'
import { USER_TIERS } from '@/lib/userTiers'
import { DEFAULT_FILTERS } from '@/lib/types'

type SetupMode = 'prompt' | 'auto' | 'favorites'

function SetupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reconfigureCode = searchParams.get('reconfigure')
  const { isSignedIn, isLoaded } = useUser()

  // Get restaurant limits for display
  const anonLimit = USER_TIERS.anonymous.maxRestaurantsPerSession
  const authLimit = USER_TIERS.authenticated.maxRestaurantsPerSession

  // Setup mode: prompt (initial screen), auto (filter-based), favorites (pick from saved)
  // Skip prompt if reconfiguring or if user came from sign-in redirect
  const skipPrompt = !!reconfigureCode || searchParams.get('mode') === 'auto'
  const [setupMode, setSetupMode] = useState<SetupMode>(skipPrompt ? 'auto' : 'prompt')

  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS })
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

  // Auto-fetch current location on mount - triggers browser's native location prompt
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
        // Fallback to NYC if location denied
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
      if (reconfigureCode) {
        // Reconfigure existing session
        const userId = localStorage.getItem(`user-${reconfigureCode}`)

        const response = await fetch(`/api/session/${reconfigureCode}/reconfigure`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            filters,
            location,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to reconfigure session')
        }

        // Navigate back to the session
        router.push(`/session/${reconfigureCode}`)
      } else {
        // Create new session via API - code will be generated server-side
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
      }
    } catch (err) {
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
              src="/logo_groupNom.svg"
              alt="Group Nom"
              width={80}
              height={80}
              className="mx-auto rounded-xl mb-4 animate-spin"
            />
            <h1 className="text-3xl font-bold text-white mb-2">
              Starting Your Group
            </h1>
            <p className="text-white text-opacity-90 mb-4">
              Finding your type...
            </p>
          </div>

          <div className="space-y-3 text-sm text-white text-opacity-80">
            <div className="flex items-center justify-center gap-2 fade-in-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <p>Scanning the area...</p>
            </div>
            <div className="flex items-center justify-center gap-2 fade-in-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <p>Curating the good ones…</p>
            </div>
            <div className="flex items-center justify-center gap-2 fade-in-3">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <p>Setting the vibe...</p>
            </div>
          </div>

          <p className="text-xs text-white text-opacity-60 mt-6">
            This may take a few seconds...
          </p>
        </div>
      </div>
    )
  }

  // Show initial prompt screen for mode selection
  if (setupMode === 'prompt' && isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600">
        <Header />
        <div className="flex flex-col items-center p-4 pt-8" style={{ minHeight: 'calc(100vh - 56px)' }}>
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Start a Group Session</h1>
              <p className="text-orange-100 mb-2">Pick your path</p>
              <p className="text-orange-100 text-sm opacity-80">How should we find restaurants?</p>
            </div>

            {/* Anonymous User View */}
            {!isSignedIn && (
              <div className="space-y-3">
                {/* Side-by-side comparison */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Quick Start - 5 restaurants */}
                  <button
                    onClick={() => setSetupMode('auto')}
                    className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30 text-center hover:bg-white/30 transition group"
                  >
                    <div className="text-5xl font-bold text-white mb-1">{anonLimit}</div>
                    <div className="text-white/90 text-sm font-medium">restaurants</div>
                    <div className="mt-3 bg-white text-orange-600 font-semibold py-2.5 rounded-lg group-hover:bg-orange-50 transition text-sm">
                      Quick Start
                    </div>
                  </button>

                  {/* Sign In - 10 restaurants */}
                  <Link
                    href="/sign-in?redirect_url=/setup?mode=auto"
                    className="bg-white rounded-xl p-4 text-center hover:bg-orange-50 transition group"
                  >
                    <div className="text-5xl font-bold text-orange-600 mb-1">{authLimit}</div>
                    <div className="text-orange-600/80 text-sm font-medium">restaurants</div>
                    <div className="mt-3 bg-orange-600 text-white font-semibold py-2.5 rounded-lg group-hover:bg-orange-700 transition text-sm">
                      Sign In
                    </div>
                  </Link>
                </div>

                {/* Create account link */}
                <p className="text-center text-white/80 text-sm">
                  New here?{' '}
                  <Link href="/sign-up?redirect_url=/setup?mode=auto" className="underline font-medium hover:text-white">
                    Create free account
                  </Link>
                </p>
              </div>
            )}

            {/* Authenticated User View - Mode Selection */}
            {isSignedIn && (
              <div className="space-y-4">
                <p className="text-orange-100 text-center mb-2">
                  How do you want to create your session?
                </p>

                {/* Auto-Generate Option */}
                <button
                  onClick={() => setSetupMode('auto')}
                  className="w-full bg-white/20 backdrop-blur-sm rounded-xl p-5 border border-white/30 text-left hover:bg-white/30 transition group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-white font-bold text-lg">Auto-Generate</h2>
                      <p className="text-orange-100 text-sm">
                        Set filters and we'll find {authLimit} restaurants for you
                      </p>
                    </div>
                  </div>
                </button>

                {/* Pick from Favorites Option */}
                <button
                  onClick={() => setSetupMode('favorites')}
                  className="w-full bg-white/20 backdrop-blur-sm rounded-xl p-5 border border-white/30 text-left hover:bg-white/30 transition group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-white font-bold text-lg">Pick from Favorites</h2>
                      <p className="text-orange-100 text-sm">
                        Choose specific restaurants from your saved list
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            <Footer />
          </div>
        </div>
      </div>
    )
  }

  // Show favorites picker mode (placeholder - will implement FavoritesPicker component)
  if (setupMode === 'favorites') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600">
        <Header />
        <div className="flex flex-col items-center p-4 pt-8" style={{ minHeight: 'calc(100vh - 56px)' }}>
          <div className="w-full max-w-md text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Pick from Favorites</h1>
            <p className="text-orange-100 mb-6">Select restaurants from your saved list to add to this session.</p>

            {/* TODO: Replace with FavoritesPicker component */}
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 mb-4">
              <p className="text-orange-100 text-sm">Favorites picker coming soon!</p>
              <p className="text-orange-200 text-xs mt-2">For now, use auto-generate mode.</p>
            </div>

            <button
              onClick={() => setSetupMode('auto')}
              className="w-full bg-white text-orange-600 font-semibold py-3 rounded-lg hover:bg-orange-50 transition"
            >
              Use Auto-Generate Instead
            </button>
            <button
              onClick={() => setSetupMode('prompt')}
              className="w-full mt-3 text-white/80 font-medium py-2 hover:text-white transition"
            >
              Back
            </button>
            <Footer />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600">
      <Header />
      <div className="flex flex-col items-center p-4 pt-8" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {reconfigureCode ? 'Try Again' : 'Configure Group'}
            </h1>
            <p className="text-orange-100 mb-2">
              {reconfigureCode ? 'Change the vibe' : 'Set the vibe'}
            </p>
            <p className="text-orange-100 text-sm opacity-80">
              {reconfigureCode ? 'Your group is waiting.' : 'Everyone plays by the same rules.'}
            </p>
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
            className="w-full bg-white text-orange-600 font-semibold py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition mt-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {reconfigureCode ? 'Try Again' : 'Start Group'}
          </button>

          <Footer />
        </div>
      </div>
    </div>
  )
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center p-4">
        <div className="text-center">
          <Image
            src="/logo_groupNom.svg"
            alt="Group Nom"
            width={64}
            height={64}
            className="mx-auto rounded-xl mb-4 animate-spin"
          />
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    }>
      <SetupPageContent />
    </Suspense>
  )
}
