'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { LocationIcon } from '@/components/icons'
import { Spinner, Input, Button, ViewToggle } from '@/components/ui'
import { LocationPermissionModal } from '@/components/location'
import { DynamicMap } from '@/components/map'
import { PlaceCard, PlacePhoto, PlaceBody, PlaceTitle, PlaceAddress, PlaceMeta } from '@/components/place'
import { useLocation } from '@/lib/useLocation'
import { useMediaQuery, DESKTOP_QUERY } from '@/lib/useMediaQuery'
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
  // Desktop shows the list and the map side by side; the toggle is phone-only
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  // Pre-unlock members see Today's Five; the count is the tease
  const [limited, setLimited] = useState<{ totalNearby: number } | null>(null)

  // Manual location entry (chosen via skip, forced when denied/unsupported)
  const [manualMode, setManualMode] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  // Own flag: the hook's isLoading also covers a GPS lookup that may be
  // hanging, and that must never lock the manual entry
  const [geocoding, setGeocoding] = useState(false)
  // Situational shelves (Phase 6): good-for tags members put on nominations
  const [shelf, setShelf] = useState<string | null>(null)

  const loadLibrary = useCallback(async (lat: number, lng: number, shelfTag: string | null = null) => {
    setPhase('loading')
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const shelfQs = shelfTag ? `&shelf=${encodeURIComponent(shelfTag)}` : ''
      const res = await fetch(`/api/library?lat=${lat}&lng=${lng}&radius=16&tz=${encodeURIComponent(tz)}${shelfQs}`)
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

  // Load whenever we get coordinates (GPS grant or manual geocode) or the shelf changes
  useEffect(() => {
    if (coordinates) {
      loadLibrary(coordinates.lat, coordinates.lng, shelf)
    }
  }, [coordinates, shelf, loadLibrary])

  const handleManualLocation = useCallback(async () => {
    if (!locationQuery.trim()) {
      setInputError('Enter a city or zip code')
      return
    }
    setInputError(null)
    setGeocoding(true)
    const ok = await geocodeAddress(locationQuery.trim()).finally(() => setGeocoding(false))
    if (ok) {
      setManualMode(false)
      setLocationQuery('')
    }
  }, [locationQuery, geocodeAddress])

  // Manual entry whenever we cannot get coordinates and are not waiting on
  // the member: denied, unsupported, or granted-but-the-lookup-failed.
  const showManualEntry =
    manualMode ||
    (!coordinates &&
      !locationLoading &&
      (permissionState === 'denied' ||
        permissionState === 'unsupported' ||
        (permissionState === 'granted' && !!locationError)))

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

      {/* Header: title + view toggle on one row, subtitle full width beneath,
          then the location line with the primary action. Same shape as
          Discover, and nothing in it can outgrow a 390px screen. */}
      <header className="px-4 pt-6 pb-3">
        <div className="max-w-lg md:max-w-3xl lg:max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-white min-w-0">
              {limited ? "Today's Five" : 'The Library'}
            </h1>
            {coordinates && (
              <ViewToggle
                options={[
                  { value: 'list', label: 'List' },
                  { value: 'map', label: 'Map' },
                ]}
                value={view}
                onChange={setView}
                ariaLabel="View as list or map"
                disabled={phase !== 'ready' || places.length === 0}
                className="lg:hidden"
              />
            )}
          </div>
          <p className="text-sm text-white/50 mt-1">
            {limited
              ? 'Five places locals love, picked for you today'
              : 'Places locals love, nominated by the community'}
          </p>
          <div className="flex items-center justify-between gap-3 mt-3">
            {locationName && !showManualEntry ? (
              <p className="text-white/50 text-sm flex items-center gap-1 min-w-0">
                <LocationIcon size={12} className="shrink-0" />
                <span className="truncate">{locationName}</span>
                <button
                  onClick={() => setManualMode(true)}
                  className="ml-2 shrink-0 underline hover:text-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
                >
                  Change
                </button>
              </p>
            ) : (
              <span />
            )}
            {/* Phone only: from md up the top bar carries Nominate */}
            <Link
              href="/nominate"
              className="md:hidden shrink-0 px-3 py-1.5 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
            >
              + Nominate
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg md:max-w-3xl lg:max-w-6xl mx-auto px-4 pb-24">

        {(locating || phase === 'loading') && !showManualEntry && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Spinner size="lg" className="h-10 w-10 mx-auto mb-4" />
              <p className="text-white/60">
                {phase === 'loading' ? 'Opening the library...' : 'Finding your area...'}
              </p>
              {locating && (
                <button
                  onClick={() => setManualMode(true)}
                  className="mt-4 text-sm text-white/50 underline underline-offset-2 hover:text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
                >
                  Enter a city instead
                </button>
              )}
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
              disabled={geocoding}
            >
              {geocoding ? 'Searching...' : 'Browse the Library'}
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

        {/* Shelves — only once the library is open; the five are the five */}
        {!limited && coordinates && !showManualEntry && phase !== 'error' && (
          <div
            className="flex gap-2 overflow-x-auto scrollbar-none sm:flex-wrap pb-3 mb-3 -mx-4 px-4"
            role="group"
            aria-label="Shelves"
          >
            {([
              [null, 'Everything'],
              ['date_night', 'Date night'],
              ['family', 'With kids'],
              ['groups', 'Groups'],
              ['solo', 'Solo'],
              ['quick_bite', 'Quick bite'],
              ['late_night', 'Late night'],
              ['brunch', 'Brunch'],
            ] as Array<[string | null, string]>).map(([tag, label]) => (
              <button
                key={label}
                onClick={() => setShelf(tag)}
                aria-pressed={shelf === tag}
                className={`shrink-0 px-3 py-1.5 rounded-pill text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page ${
                  shelf === tag ? 'bg-brand text-white font-semibold' : 'bg-surface-card text-white/70 hover:bg-surface-card-hover'
                }`}
              >
                {label}
              </button>
            ))}
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

        {phase === 'ready' && !showManualEntry && places.length === 0 && shelf && (
          <div className="text-center py-16 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-white mb-2">Nothing on this shelf yet</h2>
            <p className="text-white/60 mb-6">
              Shelves fill up as members tag what a place is good for. Know one? Nominate it and say so.
            </p>
            <button
              onClick={() => setShelf(null)}
              className="px-5 py-2.5 rounded-xl font-semibold bg-surface-card text-white hover:bg-surface-card-hover transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Back to everything
            </button>
          </div>
        )}

        {phase === 'ready' && !showManualEntry && places.length === 0 && !shelf && (
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

        {/* Phone: list or map. md: a two-column card grid. lg: list beside
            a sticky map, which is the desktop use of the space (and why the
            toggle hides there). */}
        {phase === 'ready' && !showManualEntry && places.length > 0 && (
          <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
            {(view === 'map' || isDesktop) && (
              /* isolate: Leaflet panes are z-index 400 and would otherwise paint over the nav (z-50) */
              <div className="isolate rounded-card overflow-hidden h-[65vh] lg:h-[calc(100dvh-7rem)] lg:sticky lg:top-20 lg:order-last">
                <DynamicMap
                  places={places}
                  userLocation={coordinates ?? undefined}
                  detailHref={(place) => `/restaurant/${place.id}`}
                  height="100%"
                  className="h-full"
                />
              </div>
            )}

            {(view === 'list' || isDesktop) && (
          <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 lg:block lg:space-y-4">
            {places.map((place) => (
              <PlaceCard key={place.id} href={`/restaurant/${place.id}`}>
                <PlacePhoto src={place.photoUrl} alt={place.name} loved height="md" />
                <PlaceBody>
                  <div className="flex items-start justify-between gap-2">
                    <PlaceTitle>{place.name}</PlaceTitle>
                    <span className="text-white/60 text-xs whitespace-nowrap shrink-0 pt-1">
                      {place.distanceKm} km
                    </span>
                  </div>
                  <PlaceAddress>{place.address}</PlaceAddress>
                  <PlaceMeta
                    nominationCount={place.nominationCount}
                    dishes={place.favoriteDishes}
                    maxChips={3}
                  />
                </PlaceBody>
              </PlaceCard>
            ))}
          </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
