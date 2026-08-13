'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { LocationIcon } from '@/components/icons'
import type { LibraryEntry } from '@/lib/restaurantDiscovery'

type LibraryPhase = 'locating' | 'manual-location' | 'loading' | 'ready' | 'error'

export default function LibraryPage() {
  const [phase, setPhase] = useState<LibraryPhase>('locating')
  const [places, setPlaces] = useState<LibraryEntry[]>([])
  const [locationName, setLocationName] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [locationError, setLocationError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadLibrary = useCallback(async (lat: number, lng: number, name?: string) => {
    setPhase('loading')
    if (name) setLocationName(name)

    if (!name) {
      fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data?.formattedAddress) setLocationName(data.formattedAddress) })
        .catch(() => {})
    }

    try {
      const res = await fetch(`/api/library?lat=${lat}&lng=${lng}&radius=16`)
      if (!res.ok) throw new Error('Failed to load library')
      const data = await res.json()
      setPlaces(data.places || [])
      setPhase('ready')
    } catch {
      setError('Could not load the library. Please try again.')
      setPhase('error')
    }
  }, [])

  // Try geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setPhase('manual-location')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => loadLibrary(pos.coords.latitude, pos.coords.longitude),
      () => setPhase('manual-location')
    )
  }, [loadLibrary])

  const handleManualLocation = useCallback(async () => {
    if (!locationQuery.trim()) {
      setLocationError('Enter a city or zip code')
      return
    }
    setLocationError(null)
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: locationQuery }),
      })
      const data = await res.json()
      if (!res.ok || !data.location) {
        setLocationError(data.error || 'Could not find that location')
        return
      }
      loadLibrary(data.location.lat, data.location.lng, data.formattedAddress)
    } catch {
      setLocationError('Could not find that location. Try a different city or zip.')
    }
  }, [locationQuery, loadLibrary])

  return (
    <div className="min-h-screen bg-[#222222]">
      {/* Header - matches app's dark page pattern */}
      <header className="px-4 py-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-white">The Library</h1>
          <p className="text-sm text-white/50">
            Places locals love, nominated by the community
          </p>
          {locationName && (
            <p className="text-white/40 text-sm mt-2 flex items-center gap-1">
              <LocationIcon size={12} />
              {locationName}
              <button
                onClick={() => setPhase('manual-location')}
                className="ml-2 underline hover:text-white/70"
              >
                change
              </button>
            </p>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-24">

        {(phase === 'locating' || phase === 'loading') && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#EA4D19] border-t-transparent mx-auto mb-4" />
              <p className="text-white/60">
                {phase === 'locating' ? 'Finding your area...' : 'Opening the library...'}
              </p>
            </div>
          </div>
        )}

        {phase === 'manual-location' && (
          <div className="max-w-sm mx-auto py-12 text-center space-y-3">
            <p className="text-white/70">Where should we look?</p>
            <label htmlFor="library-location" className="sr-only">City or zip code</label>
            <input
              id="library-location"
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualLocation()}
              placeholder="City or zip code..."
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-[#EA4D19]"
            />
            {locationError && <p role="alert" className="text-red-400 text-sm">{locationError}</p>}
            <button
              onClick={handleManualLocation}
              className="w-full px-6 py-3 rounded-xl font-bold bg-[#EA4D19] text-white hover:bg-orange-600 transition"
            >
              Browse the Library
            </button>
          </div>
        )}

        {phase === 'error' && (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => setPhase('manual-location')}
              className="px-6 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {phase === 'ready' && places.length === 0 && (
          <div className="text-center py-16 max-w-md mx-auto">
            <div className="text-6xl mb-4">📖</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              The library is empty here — for now
            </h2>
            <p className="text-white/60 mb-8">
              No one has nominated a place in this area yet. Know a spot you love?
              Be the first to put it on the shelf.
            </p>
            <div className="space-y-3">
              <Link
                href="/discover"
                className="block w-full px-6 py-3 rounded-xl font-bold bg-[#EA4D19] text-white hover:bg-orange-600 transition"
              >
                Discover Places Near You
              </Link>
              <p className="text-white/40 text-sm">
                Swipe through local spots, save the ones you love, then nominate them.
              </p>
            </div>
          </div>
        )}

        {phase === 'ready' && places.length > 0 && (
          <div className="space-y-4">
            {places.map((place) => (
              <Link
                key={place.id}
                href={`/restaurant/${place.id}`}
                className="bg-[#333333] rounded-xl overflow-hidden hover:bg-[#3a3a3a] transition group"
              >
                {place.photoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={place.photoUrl}
                    alt={place.name}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-24 bg-gradient-to-br from-orange-900/40 to-red-900/40 flex items-center justify-center">
                    <span className="text-3xl">🍽️</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-white text-lg leading-tight group-hover:text-orange-300 transition">
                      {place.name}
                    </h3>
                    <span className="text-white/40 text-xs whitespace-nowrap pt-1">
                      {place.distanceKm} km
                    </span>
                  </div>
                  <p className="text-white/50 text-sm mb-2">{place.address}</p>

                  <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-300 px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2">
                    ❤️ {place.nominationCount} nomination{place.nominationCount === 1 ? '' : 's'}
                  </span>

                  {place.favoriteDishes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {place.favoriteDishes.slice(0, 3).map((dish) => (
                        <span key={dish} className="bg-white/10 text-white/70 px-2 py-0.5 rounded text-xs">
                          {dish}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
