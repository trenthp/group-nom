'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { LocationIcon } from '@/components/icons'
import { Spinner, NominationBadge, Input, Button } from '@/components/ui'
import { LocationPermissionModal } from '@/components/location'
import { DynamicMap, MapToggle } from '@/components/map'
import { useLocation } from '@/lib/useLocation'
import type { LibraryEntry } from '@/lib/restaurantDiscovery'

type LibraryPhase = 'idle' | 'loading' | 'ready' | 'error'

export default function LibraryPage() {
  const {
    permissionState,
    coordinates,
    locationName,
    isLoading: locationLoading,
    error: locationError,
    requestPermission,
    geocodeAddress,
  } = useLocation()

  const [phase, setPhase] = useState<LibraryPhase>('idle')
  const [places, setPlaces] = useState<LibraryEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'map'>('list')
  // Pre-unlock members see Today's Five; the count is the tease
  const [limited, setLimited] = useState<{ totalNearby: number } | null>(null)

  // Manual location entry (chosen via skip, forced when denied/unsupported)
  const [manualMode, setManualMode] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const loadLibrary = useCallback(async (lat: number, lng: number) => {
    setPhase('loading')
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const res = await fetch(`/api/library?lat=${lat}&lng=${lng}&radius=16&tz=${encodeURIComponent(tz)}`)
      if (!res.ok) throw new Error('Failed to load library')
      const data = await res.json()
      setPlaces(data.places || [])
      setLimited(data.limited ? { totalNearby: data.totalNearby ?? 0 } : null)
      setPhase('ready')
    } catch {
      setError('Could not load the library. Please try again.')
      setPhase('error')
    }
  }, [])

  // Load whenever we get coordinates (GPS grant or manual geocode)
  useEffect(() => {
    if (coordinates) {
      loadLibrary(coordinates.lat, coordinates.lng)
    }
  }, [coordinates, loadLibrary])

  const handleManualLocation = useCallback(async () => {
    if (!locationQuery.trim()) {
      setInputError('Enter a city or zip code')
      return
    }
    setInputError(null)
    const ok = await geocodeAddress(locationQuery.trim())
    if (ok) {
      setManualMode(false)
      setLocationQuery('')
    }
  }, [locationQuery, geocodeAddress])

  const showManualEntry =
    manualMode ||
    ((permissionState === 'denied' || permissionState === 'unsupported') && !coordinates)

  const showPermissionModal =
    permissionState === 'prompt' && !manualMode && !coordinates

  const locating =
    !coordinates && !showManualEntry &&
    (permissionState === 'checking' || permissionState === 'prompt' || locationLoading)

  return (
    <div className="min-h-screen bg-surface-page">
      <LocationPermissionModal
        isOpen={showPermissionModal}
        onRequestPermission={requestPermission}
        onSkip={() => setManualMode(true)}
      />

      {/* Header - matches app's dark page pattern */}
      <header className="px-4 py-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-white">{limited ? "Today's Five" : 'The Library'}</h1>
              <p className="text-sm text-white/50">
                {limited
                  ? 'Five places locals love, picked for you today'
                  : 'Places locals love, nominated by the community'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/nominate"
                className="px-3 py-1.5 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
              >
                + Nominate
              </Link>
              {phase === 'ready' && places.length > 0 && (
                <MapToggle view={view} onViewChange={setView} />
              )}
            </div>
          </div>
          {locationName && !showManualEntry && (
            <p className="text-white/50 text-sm mt-2 flex items-center gap-1">
              <LocationIcon size={12} />
              {locationName}
              <button
                onClick={() => setManualMode(true)}
                className="ml-2 underline hover:text-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
              >
                change
              </button>
            </p>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-24">

        {(locating || phase === 'loading') && !showManualEntry && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Spinner size="lg" className="h-10 w-10 mx-auto mb-4" />
              <p className="text-white/60">
                {phase === 'loading' ? 'Opening the library...' : 'Finding your area...'}
              </p>
            </div>
          </div>
        )}

        {showManualEntry && (
          <div className="max-w-sm mx-auto py-12 text-center space-y-3">
            <p className="text-white/70">Where should we look?</p>
            {permissionState === 'denied' && (
              <p className="text-white/50 text-sm">
                Location access is blocked — enter a place instead, or enable
                location in your browser settings.
              </p>
            )}
            <Input
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualLocation()}
              placeholder="City or zip code..."
              aria-label="City or zip code"
              autoFocus
              error={inputError ?? locationError ?? undefined}
            />
            <Button
              variant="primary"
              className="w-full"
              onClick={handleManualLocation}
              disabled={locationLoading}
            >
              {locationLoading ? 'Searching...' : 'Browse the Library'}
            </Button>
            {coordinates && (
              <Button variant="ghost" className="w-full" onClick={() => setManualMode(false)}>
                Cancel
              </Button>
            )}
          </div>
        )}

        {phase === 'error' && !showManualEntry && (
          <div className="text-center py-20">
            <p role="alert" className="text-red-400 mb-4">{error}</p>
            <Button
              variant="secondary"
              onClick={() => {
                if (coordinates) {
                  loadLibrary(coordinates.lat, coordinates.lng)
                } else {
                  setManualMode(true)
                }
              }}
            >
              Try Again
            </Button>
          </div>
        )}

        {phase === 'ready' && !showManualEntry && limited && places.length > 0 && (
          <div className="mb-4 rounded-card bg-surface-card border border-brand/40 p-4">
            <p className="text-white font-semibold mb-1">
              {limited.totalNearby > places.length
                ? `${limited.totalNearby - places.length} more loved places nearby`
                : 'The whole library'}
              {' '}open with your first nomination.
            </p>
            <p className="text-white/60 text-sm mb-3">
              A new five arrives at midnight. Or add a place you love and see everything, for good.
            </p>
            <Link
              href="/nominate"
              className="inline-block px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
            >
              Nominate a place
            </Link>
          </div>
        )}

        {phase === 'ready' && !showManualEntry && places.length === 0 && (
          <div className="text-center py-16 max-w-md mx-auto">
            <div aria-hidden="true" className="text-6xl mb-4">📖</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              The library is empty here — for now
            </h2>
            <p className="text-white/60 mb-8">
              No one has nominated a place in this area yet. Know a spot you love?
              Be the first to put it on the shelf.
            </p>
            <div className="space-y-3">
              <Link
                href="/nominate"
                className="block w-full px-6 py-3 rounded-xl font-bold bg-brand text-white hover:bg-brand-hover transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
              >
                Nominate a place you love
              </Link>
              <p className="text-white/50 text-sm">
                Search for it by name, add a photo and why — and put your town on the map.
              </p>
            </div>
          </div>
        )}

        {phase === 'ready' && !showManualEntry && places.length > 0 && view === 'map' && (
          <DynamicMap
            places={places}
            userLocation={coordinates ?? undefined}
            detailHref={(place) => `/restaurant/${place.id}`}
            height="65vh"
            className="rounded-card overflow-hidden"
          />
        )}

        {phase === 'ready' && !showManualEntry && places.length > 0 && view === 'list' && (
          <div className="space-y-4">
            {places.map((place) => (
              <Link
                key={place.id}
                href={`/restaurant/${place.id}`}
                className="block bg-surface-card rounded-xl overflow-hidden hover:bg-surface-card-hover transition group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
                    <span aria-hidden="true" className="text-3xl">🍽️</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-white text-lg leading-tight group-hover:text-orange-300 transition">
                      {place.name}
                    </h3>
                    <span className="text-white/50 text-xs whitespace-nowrap pt-1">
                      {place.distanceKm} km
                    </span>
                  </div>
                  <p className="text-white/50 text-sm mb-2">{place.address}</p>

                  <NominationBadge count={place.nominationCount} className="mb-2" />

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
