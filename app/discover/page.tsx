'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LocationIcon } from '@/components/icons'
import { Spinner, Input, Button, ViewToggle } from '@/components/ui'
import { LocationPermissionModal } from '@/components/location'
import { DynamicDiscoverMap } from '@/components/map/DynamicDiscoverMap'
import { DiscoverSheet } from '@/components/discover/DiscoverSheet'
import { DiscoverCards } from '@/components/discover/DiscoverCards'
import { DiscoverPlacePanel } from '@/components/discover/DiscoverPlaceDetail'
import { useLocation } from '@/lib/useLocation'
import { useMediaQuery, DESKTOP_QUERY } from '@/lib/useMediaQuery'
import type { BBox, DiscoverPlace, DiscoverViewport } from '@/lib/discover'

/**
 * Discover — the map as we have it. The library shows what's loved;
 * this shows everything, so members can find what's good and light it up.
 * Open to every member, pre-unlock included (it's public seed data plus a
 * count). Map by default, cards as an optional way through the same view.
 */
type View = 'map' | 'cards'

export default function DiscoverPage() {
  const {
    permissionState,
    coordinates,
    locationName,
    isLoading: locationLoading,
    error: locationError,
    requestPermission,
    geocodeAddress,
  } = useLocation()

  const [view, setView] = useState<View>('map')
  // Desktop shows the map and a docked panel (deck, or the tapped place)
  // side by side; the Map/Cards toggle and the bottom sheet are phone-only.
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [bbox, setBbox] = useState<BBox | null>(null)
  const [data, setData] = useState<DiscoverViewport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; key: number } | undefined>()

  // Manual location entry (chosen via skip, forced when denied/unsupported)
  const [manualMode, setManualMode] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  // Own flag: the hook's isLoading also covers a GPS lookup that may be
  // hanging, and that must never lock the manual entry
  const [geocoding, setGeocoding] = useState(false)

  const requestSeq = useRef(0)

  // Load whatever the map is looking at
  const loadViewport = useCallback(async (box: BBox) => {
    const seq = ++requestSeq.current
    setLoading(true)
    try {
      const qs = `${box.minLng},${box.minLat},${box.maxLng},${box.maxLat}`
      const res = await fetch(`/api/discover?bbox=${encodeURIComponent(qs)}`)
      if (seq !== requestSeq.current) return
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'Could not load the map')
        return
      }
      const json = (await res.json()) as DiscoverViewport
      setError(null)
      setData(json)
      if (json.mode === 'points' && json.places.length > 0) {
        const ids = json.places.map(p => p.id)
        fetch('/api/favorites/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        })
          .then(r => (r.ok ? r.json() : { saved: [] }))
          .then(({ saved: list }: { saved: string[] }) =>
            setSaved(prev => {
              const next = new Set(prev)
              list.forEach(id => next.add(id))
              return next
            })
          )
          .catch(() => { /* non-fatal */ })
      }
    } catch {
      if (seq === requestSeq.current) setError('Could not load the map')
    } finally {
      if (seq === requestSeq.current) setLoading(false)
    }
  }, [])

  const handleViewportChange = useCallback((box: BBox) => {
    setBbox(box)
    loadViewport(box)
  }, [loadViewport])

  // Cards without a map yet: a neighborhood around the member
  useEffect(() => {
    if (coordinates && !bbox) {
      const d = 0.03
      setBbox({
        minLng: coordinates.lng - d,
        minLat: coordinates.lat - d,
        maxLng: coordinates.lng + d,
        maxLat: coordinates.lat + d,
      })
    }
  }, [coordinates, bbox])

  // Manual location → fly the map there
  const lastCoords = useRef<string | null>(null)
  useEffect(() => {
    if (!coordinates) return
    const key = `${coordinates.lat},${coordinates.lng}`
    if (lastCoords.current && lastCoords.current !== key) {
      setFlyTo({ lat: coordinates.lat, lng: coordinates.lng, key: Date.now() })
    }
    lastCoords.current = key
  }, [coordinates])

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

  const selected = useMemo<DiscoverPlace | null>(() => {
    if (!selectedId || data?.mode !== 'points') return null
    return data.places.find(p => p.id === selectedId) ?? null
  }, [selectedId, data])

  const toggleSave = useCallback(async (place: DiscoverPlace) => {
    const isSaved = saved.has(place.id)
    setSaving(true)
    // Optimistic
    setSaved(prev => {
      const next = new Set(prev)
      if (isSaved) next.delete(place.id)
      else next.add(place.id)
      return next
    })
    try {
      const res = isSaved
        ? await fetch(`/api/favorites?localId=${encodeURIComponent(place.id)}`, { method: 'DELETE' })
        : await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ localId: place.id }),
          })
      if (!res.ok) throw new Error('save failed')
    } catch {
      setSaved(prev => {
        const next = new Set(prev)
        if (isSaved) next.add(place.id)
        else next.delete(place.id)
        return next
      })
    } finally {
      setSaving(false)
    }
  }, [saved])

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

  const caption = (() => {
    if (!data) return null
    if (data.mode === 'hexes') {
      if (data.lovedOnly) {
        return `${data.totals.loved} loved place${data.totals.loved === 1 ? '' : 's'} in view · zoom in to see the unlit map`
      }
      const waiting = data.totals.total - data.totals.loved
      return `${data.totals.loved} loved · ${waiting} waiting in view · tap a hex to zoom in`
    }
    const waiting = data.totals.total - data.totals.loved
    return data.truncated
      ? `Showing ${data.totals.total} places · zoom in to see them all`
      : `${data.totals.loved} loved · ${waiting} waiting · tap a dot`
  })()

  return (
    // The body already reserves 4rem for BottomNav (pb-16), so the page
    // fills exactly the space above it and the map can take the remainder
    // without any viewport arithmetic.
    <div className="min-h-[calc(100dvh-4rem)] bg-surface-page flex flex-col">
      <LocationPermissionModal
        isOpen={showPermissionModal}
        onRequestPermission={requestPermission}
        onSkip={() => setManualMode(true)}
      />

      {/* Header: same shape as the Library — title + view toggle, subtitle, location */}
      <header className="px-4 pt-6 pb-3">
        <div className="max-w-lg md:max-w-3xl lg:max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-white min-w-0">Discover</h1>
            {coordinates && (
              <ViewToggle
                options={[
                  { value: 'map', label: 'Map' },
                  { value: 'cards', label: 'Cards' },
                ]}
                value={view}
                onChange={setView}
                ariaLabel="View as map or cards"
                className="lg:hidden"
              />
            )}
          </div>
          <p className="text-sm text-white/50 mt-1">
            The map as we have it. Ember is loved. The rest is waiting.
          </p>
          {locationName && !showManualEntry && (
            <p className="text-white/50 text-sm mt-3 flex items-center gap-1 min-w-0">
              <LocationIcon size={12} className="shrink-0" />
              <span className="truncate">{locationName}</span>
              <button
                onClick={() => setManualMode(true)}
                className="ml-2 shrink-0 underline hover:text-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
              >
                Change
              </button>
            </p>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col pb-6">
        {showManualEntry && (
          <div className="max-w-lg mx-auto w-full px-4 py-8">
            <div className="bg-surface-card rounded-card p-6">
              <h2 className="text-white font-semibold mb-1">Where should we look?</h2>
              <p className="text-white/60 text-sm mb-4">
                {permissionState === 'denied'
                  ? 'Location is off for this site. Enter a city or zip instead.'
                  : 'Enter a city or zip code.'}
              </p>
              <div className="flex gap-2">
                <Input
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualLocation()}
                  placeholder="Orlando, FL or 32801"
                  aria-label="City or zip code"
                  aria-invalid={!!inputError}
                />
                <Button onClick={handleManualLocation} disabled={geocoding}>
                  {geocoding ? 'Finding…' : 'Go'}
                </Button>
              </div>
              {(inputError || locationError) && (
                <p className="text-red-400 text-sm mt-2" role="alert">{inputError || locationError}</p>
              )}
              {coordinates && (
                <button
                  onClick={() => setManualMode(false)}
                  className="mt-3 text-sm text-white/50 underline hover:text-white/70"
                >
                  Keep {locationName || 'current location'}
                </button>
              )}
            </div>
          </div>
        )}

        {locating && !showManualEntry && (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center">
              <Spinner size="lg" className="mx-auto" />
              <p className="mt-3 text-white/50 text-sm">Finding your neighborhood…</p>
              <button
                onClick={() => setManualMode(true)}
                className="mt-4 text-sm text-white/50 underline underline-offset-2 hover:text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
              >
                Enter a city instead
              </button>
            </div>
          </div>
        )}

        {coordinates && !showManualEntry && (
          <div className="flex-1 flex flex-col lg:flex-row lg:gap-4 lg:min-h-0 max-w-lg md:max-w-3xl lg:max-w-6xl mx-auto w-full px-4">
            {/* The map: the phone's map view, and always on desktop */}
            {(view === 'map' || isDesktop) && (
              <div className="flex-1 flex flex-col min-w-0">
                {/* flex-1: the map takes whatever the header and caption leave.
                    isolate: Leaflet panes are z-index 400 and would otherwise
                    paint over the nav (z-50) whenever the two overlap. */}
                <div className="relative isolate flex-1 min-h-[320px] rounded-card overflow-hidden">
                  <DynamicDiscoverMap
                    center={coordinates}
                    zoom={15}
                    data={data}
                    userLocation={coordinates}
                    highlightedId={selectedId ?? undefined}
                    onViewportChange={handleViewportChange}
                    onPlaceClick={setSelectedId}
                    flyTo={flyTo}
                    className="absolute inset-0"
                  />
                  {loading && (
                    <div className="absolute top-3 right-3 z-[1000] bg-black/60 rounded-pill px-3 py-1.5" aria-live="polite">
                      <Spinner size="sm" />
                    </div>
                  )}
                </div>
                <p className="text-center text-xs text-white/50 py-2" aria-live="polite">
                  {error ?? caption ?? 'Move the map to explore'}
                </p>
              </div>
            )}

            {/* The panel: the phone's cards view; on desktop it's docked
                beside the map and holds the deck, or the place you tapped */}
            {(view === 'cards' || isDesktop) && (
              <aside
                className="flex flex-col pt-2 lg:pt-0 lg:w-96 lg:shrink-0 lg:min-h-0 lg:overflow-y-auto scrollbar-none"
                aria-label={isDesktop && selected ? selected.name : 'Cards'}
              >
                {isDesktop && selected ? (
                  <DiscoverPlacePanel
                    place={selected}
                    saved={saved.has(selected.id)}
                    saving={saving}
                    onToggleSave={toggleSave}
                    onClose={() => setSelectedId(null)}
                  />
                ) : (
                  <DiscoverCards bbox={bbox} saved={saved} onToggleSave={toggleSave} />
                )}
              </aside>
            )}
          </div>
        )}
      </main>

      <DiscoverSheet
        place={isDesktop ? null : selected}
        isOpen={!!selected && !isDesktop}
        onClose={() => setSelectedId(null)}
        saved={selected ? saved.has(selected.id) : false}
        saving={saving}
        onToggleSave={toggleSave}
      />
    </div>
  )
}
