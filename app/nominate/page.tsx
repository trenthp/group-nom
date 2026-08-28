'use client'

/**
 * /nominate — the front door of the nomination flow.
 *
 * "What place do you love?" → name search near the member → pick it →
 * hand off to /nominate/[restaurantId] for photo + why. Search covers the
 * whole seeded DB, not just the library: this is how unnominated places
 * get onto the shelf.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LocationIcon } from '@/components/icons'
import { Spinner, NominationBadge, Input, Button } from '@/components/ui'
import { LocationPermissionModal } from '@/components/location'
import { useLocation } from '@/lib/useLocation'
import type { SearchHit } from '@/lib/restaurantSearch'

export default function NominateSearchPage() {
  const router = useRouter()
  const {
    permissionState,
    coordinates,
    locationName,
    isLoading: locationLoading,
    error: locationError,
    requestPermission,
    geocodeAddress,
  } = useLocation()

  const [manualMode, setManualMode] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const requestSeq = useRef(0)

  // Add-a-place fallback: the place isn't in the seed
  const [adding, setAdding] = useState(false)
  const [addName, setAddName] = useState('')
  const [addAddress, setAddAddress] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [twin, setTwin] = useState<{ id: string; name: string; address: string; nominationCount: number } | null>(null)

  const submitPlace = async () => {
    setAddError(null)
    setTwin(null)
    setAddBusy(true)
    try {
      const res = await fetch('/api/restaurants/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName, address: addAddress }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409 && data.existing) {
        setTwin(data.existing)
        return
      }
      if (!res.ok) throw new Error(data.error || 'Could not add the place')
      router.push(`/nominate/${data.restaurant.id}`)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Could not add the place')
    } finally {
      setAddBusy(false)
    }
  }

  const runSearch = useCallback(async (q: string, lat: number, lng: number) => {
    const seq = ++requestSeq.current
    if (q.trim().length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    setSearching(true)
    setSearchError(null)
    try {
      const res = await fetch(
        `/api/restaurants/search?q=${encodeURIComponent(q.trim())}&lat=${lat}&lng=${lng}`
      )
      if (seq !== requestSeq.current) return // a newer keystroke won
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(data.results ?? [])
      setSearched(true)
    } catch {
      if (seq === requestSeq.current) setSearchError('Search didn’t go through. Try again.')
    } finally {
      if (seq === requestSeq.current) setSearching(false)
    }
  }, [])

  // Debounced search as they type
  useEffect(() => {
    if (!coordinates) return
    const handle = setTimeout(() => runSearch(query, coordinates.lat, coordinates.lng), 250)
    return () => clearTimeout(handle)
  }, [query, coordinates, runSearch])

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
  const showPermissionModal = permissionState === 'prompt' && !manualMode && !coordinates
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

      <header className="px-4 py-6">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="mb-4 text-white/60 flex items-center gap-2 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-white">What place do you love?</h1>
          <p className="text-sm text-white/50 mt-1">
            Somewhere local you&apos;ve been recently. A photo and why — that&apos;s a nomination.
          </p>
          {locationName && !showManualEntry && (
            <p className="text-white/50 text-sm mt-2 flex items-center gap-1">
              <LocationIcon size={12} />
              Near {locationName}
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
        {locating && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Spinner size="lg" className="h-10 w-10 mx-auto mb-4" />
              <p className="text-white/60">Finding your area...</p>
            </div>
          </div>
        )}

        {showManualEntry && (
          <div className="max-w-sm mx-auto py-12 text-center space-y-3">
            <p className="text-white/70">Where is the place?</p>
            {permissionState === 'denied' && (
              <p className="text-white/50 text-sm">
                Location access is blocked — enter a city instead, or enable
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
              {locationLoading ? 'Searching...' : 'Search near here'}
            </Button>
            {coordinates && (
              <Button variant="ghost" className="w-full" onClick={() => setManualMode(false)}>
                Cancel
              </Button>
            )}
          </div>
        )}

        {coordinates && !showManualEntry && (
          <>
            <div className="mb-4">
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name..."
                aria-label="Restaurant name"
                autoFocus
                autoComplete="off"
              />
            </div>

            {searchError && (
              <p role="alert" className="text-red-400 text-sm mb-4">{searchError}</p>
            )}

            {searching && results.length === 0 && (
              <div className="flex justify-center py-8"><Spinner /></div>
            )}

            {!searching && searched && results.length === 0 && !adding && (
              <div className="text-center py-12 max-w-sm mx-auto">
                <p className="text-white font-semibold mb-1">Nothing by that name nearby</p>
                <p className="text-white/50 text-sm mb-5">
                  Try a shorter version of the name, or widen the area with
                  &ldquo;change&rdquo; above. Or put it on the map yourself.
                </p>
                <Button
                  variant="primary"
                  onClick={() => { setAddName(query.trim()); setAdding(true) }}
                >
                  Add &ldquo;{query.trim()}&rdquo; as a new place
                </Button>
              </div>
            )}

            {adding && (
              <div className="bg-surface-card rounded-xl p-5 max-w-sm mx-auto space-y-4">
                <div>
                  <h2 className="text-white font-semibold">Put it on the map</h2>
                  <p className="text-white/50 text-sm">
                    A name and a street address. We&apos;ll find the pin; you add the love.
                  </p>
                </div>
                <Input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Place name"
                  aria-label="Place name"
                  maxLength={120}
                />
                <Input
                  type="text"
                  value={addAddress}
                  onChange={(e) => setAddAddress(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitPlace()}
                  placeholder="Street address, city"
                  aria-label="Street address"
                  maxLength={200}
                  autoFocus
                  error={addError ?? undefined}
                />
                {twin && (
                  <div className="rounded-lg border border-brand/50 bg-brand/10 p-3">
                    <p className="text-white text-sm font-medium mb-1">Is it this one?</p>
                    <p className="text-white/70 text-sm">{twin.name}</p>
                    <p className="text-white/50 text-xs mb-2">{twin.address}</p>
                    <Link
                      href={`/nominate/${twin.id}`}
                      className="inline-block px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      Yes — nominate it
                    </Link>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={() => { setAdding(false); setTwin(null); setAddError(null) }} disabled={addBusy}>
                    Cancel
                  </Button>
                  <Button variant="primary" className="flex-1" onClick={submitPlace} disabled={addBusy || addName.trim().length < 2 || addAddress.trim().length < 5}>
                    {addBusy ? 'Finding it...' : 'Add place'}
                  </Button>
                </div>
              </div>
            )}

            {results.length > 0 && (
              <ul className="space-y-2 list-none p-0 m-0" aria-label="Matching places">
                {results.map((hit) => (
                  <li key={hit.id}>
                    <Link
                      href={`/nominate/${hit.id}`}
                      className="block bg-surface-card rounded-xl p-4 hover:bg-surface-card-hover transition group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-white leading-tight group-hover:text-orange-300 transition truncate">
                            {hit.name}
                          </h3>
                          <p className="text-white/50 text-sm truncate">
                            {[hit.address, hit.city].filter(Boolean).join(', ') || 'Address unknown'}
                          </p>
                          {hit.cuisines.length > 0 && (
                            <p className="text-white/40 text-xs mt-1">{hit.cuisines.join(' · ')}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-white/50 text-xs whitespace-nowrap block">{hit.distanceKm} km</span>
                          {hit.nominationCount > 0 && (
                            <NominationBadge count={hit.nominationCount} size="sm" className="mt-1" />
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {!searched && !searching && query.trim().length < 2 && (
              <p className="text-white/40 text-sm text-center py-8">
                Start typing the name of a place you&apos;ve loved lately.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  )
}
