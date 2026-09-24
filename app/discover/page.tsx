'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LocationIcon } from '@/components/icons'
import { Spinner, Input, Button, ToggleGroup, ToggleGroupItem } from '@/components/ui'
import { LocationPermissionModal } from '@/components/location'
import { DynamicDiscoverMap } from '@/components/map/DynamicDiscoverMap'
import { DiscoverSheet } from '@/components/discover/DiscoverSheet'
import { DiscoverCards } from '@/components/discover/DiscoverCards'
import { useLocation } from '@/lib/useLocation'
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
    const ok = await geocodeAddress(locationQuery.trim())
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

  const showManualEntry =
    manualMode ||
    ((permissionState === 'denied' || permissionState === 'unsupported') && !coordinates)

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
    <div className="min-h-screen bg-surface-page flex flex-col">
      <LocationPermissionModal
        isOpen={showPermissionModal}
        onRequestPermission={requestPermission}
        onSkip={() => setManualMode(true)}
      />

      <header className="px-4 pt-6 pb-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-white">Discover</h1>
              <p className="text-sm text-white/50">
                The map as we have it. Ember is loved. The rest is waiting.
              </p>
            </div>
            {coordinates && (
              <ToggleGroup ariaLabel="View as map or cards">
                <ToggleGroupItem value="map" selected={view === 'map'} onValueSelect={() => setView('map')}>
                  Map
                </ToggleGroupItem>
                <ToggleGroupItem value="cards" selected={view === 'cards'} onValueSelect={() => setView('cards')}>
                  Cards
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          </div>
          {locationName && !showManualEntry && (
            <p className="text-white/50 text-sm mt-2 flex items-center gap-1">
              <LocationIcon size={12} />
              {locationName}
              <button
                onClick={() => setManualMode(true)}
                className="ml-2 underline hover:text-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
              >
                Change
              </button>
            </p>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col pb-20">
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
                <Button onClick={handleManualLocation} disabled={locationLoading}>
                  {locationLoading ? 'Finding…' : 'Go'}
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
            </div>
          </div>
        )}

        {coordinates && !showManualEntry && view === 'map' && (
          <div className="flex-1 flex flex-col">
            <div className="relative flex-1 min-h-[420px]" style={{ height: 'calc(100dvh - 240px)' }}>
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
            <p className="text-center text-xs text-white/50 px-4 py-2" aria-live="polite">
              {error ?? caption ?? 'Move the map to explore'}
            </p>
          </div>
        )}

        {coordinates && !showManualEntry && view === 'cards' && (
          <div className="max-w-lg mx-auto w-full px-4 pt-2">
            <DiscoverCards bbox={bbox} saved={saved} onToggleSave={toggleSave} />
          </div>
        )}
      </main>

      <DiscoverSheet
        place={selected}
        isOpen={!!selected}
        onClose={() => setSelectedId(null)}
        saved={selected ? saved.has(selected.id) : false}
        saving={saving}
        onToggleSave={toggleSave}
      />
    </div>
  )
}
