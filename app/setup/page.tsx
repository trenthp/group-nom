'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import RestaurantFilters from '@/components/RestaurantFilters'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getUserLocation } from '@/lib/geolocation'
import { DEFAULT_FILTERS } from '@/lib/types'

/**
 * Session setup ("game mode" — sunset skin by design). One screen: where
 * the deck comes from first, then where you are and how far. The old
 * "auto-generate vs pick from favorites" fork is gone — the deck source
 * is the real choice.
 */
type DeckSource = 'mix' | 'library' | 'group'

const DECK_SOURCES: Array<{ value: DeckSource; label: string; hint: string }> = [
  { value: 'mix', label: 'Everything nearby', hint: 'Loved places weighted up' },
  { value: 'library', label: 'The Library', hint: 'Only places someone loves' },
  { value: 'group', label: 'Group favorites', hint: 'What your group nominated' },
]

function SetupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reconfigureCode = searchParams.get('reconfigure')
  const preselectedGroup = searchParams.get('groupId')

  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS })
  const [deckSource, setDeckSource] = useState<DeckSource>(preselectedGroup ? 'group' : 'mix')
  const [groupId, setGroupId] = useState<string>(preselectedGroup ?? '')
  const [groups, setGroups] = useState<Array<{ id: string; name: string; memberCount: number }>>([])

  useEffect(() => {
    fetch('/api/groups')
      .then(res => (res.ok ? res.json() : { groups: [] }))
      .then(json => setGroups(json.groups ?? []))
      .catch(() => { /* non-fatal */ })
  }, [])

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

  // Try for the member's location on mount. If they decline, the location
  // chip stays empty and they type a city — no made-up fallback.
  useEffect(() => {
    const fetchCurrentLocation = async () => {
      setLocationLoading(true)
      const loc = await getUserLocation()
      if (loc) {
        setLocation(loc)
        setLocationAddress('Current location')
        currentLocationRef.current = { coords: loc, name: 'Current location' }

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
    } else {
      setLocationError('Location is off for this site — enter a city or zip instead')
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
    if (!location) {
      setError('Set a location first — where is the group eating?')
      return
    }
    if (deckSource === 'group' && !groupId) {
      setError('Pick which group the deck should draw from')
      return
    }

    setLoading(true)
    setError(null)

    const body = JSON.stringify({
      filters,
      location,
      deckSource,
      groupId: deckSource === 'group' && groupId ? groupId : undefined,
    })

    try {
      if (reconfigureCode) {
        const response = await fetch(`/api/session/${reconfigureCode}/reconfigure`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to reconfigure session')
        }
        router.push(`/session/${reconfigureCode}`)
      } else {
        const response = await fetch('/api/session/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to create session')
        }
        const result = await response.json()
        router.push(`/session/${result.session.code}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session')
      setLoading(false)
    }
  }

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
              {reconfigureCode ? 'Rebuilding the deck' : 'Starting your session'}
            </h1>
            <p className="text-white text-opacity-90 mb-4">Building the deck…</p>
          </div>

          <div className="space-y-3 text-sm text-white text-opacity-80" aria-live="polite">
            <div className="flex items-center justify-center gap-2 fade-in-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <p>Scanning the area…</p>
            </div>
            <div className="flex items-center justify-center gap-2 fade-in-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <p>Curating the good ones…</p>
            </div>
            <div className="flex items-center justify-center gap-2 fade-in-3">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <p>Shuffling the deck…</p>
            </div>
          </div>

          <p className="text-xs text-white text-opacity-60 mt-6">This takes a few seconds.</p>
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
              {reconfigureCode ? 'Try again' : 'Start a session'}
            </h1>
            <p className="text-orange-100 mb-2">
              {reconfigureCode ? 'Change the deck' : 'Vote on where to eat, together'}
            </p>
            <p className="text-orange-100 text-sm opacity-80">
              {reconfigureCode
                ? 'Your group is waiting.'
                : 'Everyone swipes the same ten places. Matches win.'}
            </p>
          </div>

          {/* 1. Where the deck comes from — the real choice */}
          <fieldset className="bg-white/15 backdrop-blur-sm rounded-xl p-4 text-white">
            <legend className="sr-only">Where the deck comes from</legend>
            <p className="text-sm font-semibold mb-2">Build the deck from</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Deck source">
              {DECK_SOURCES.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={deckSource === opt.value}
                  onClick={() => setDeckSource(opt.value)}
                  className={`rounded-lg px-2 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    deckSource === opt.value ? 'bg-white text-orange-700' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <span className="block text-sm font-semibold leading-tight">{opt.label}</span>
                  <span className={`block text-[11px] leading-tight ${deckSource === opt.value ? 'text-orange-700/80' : 'text-white/70'}`}>{opt.hint}</span>
                </button>
              ))}
            </div>
            {deckSource === 'group' && (
              <div className="mt-3">
                {groups.length === 0 ? (
                  <p className="text-white/80 text-sm">
                    Group favorites need a saved group — create one from your profile first.
                  </p>
                ) : (
                  <>
                    <label htmlFor="deck-group" className="block text-xs text-white/80 mb-1">Which group?</label>
                    <select
                      id="deck-group"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="w-full rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white"
                    >
                      <option value="">Pick a group</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name} · {g.memberCount} member{g.memberCount === 1 ? '' : 's'}</option>
                      ))}
                    </select>
                    <p className="text-white/70 text-xs mt-1">
                      Only places your group has nominated. If that&apos;s fewer than three, we fill from everything nearby.
                    </p>
                  </>
                )}
              </div>
            )}
          </fieldset>

          {/* 2. Where and how far */}
          <div className="mt-4">
            <RestaurantFilters
              filters={filters}
              onFiltersChange={setFilters}
              locationName={locationAddress}
              onCustomLocationSubmit={handleCustomLocationSubmit}
              onUseCurrentLocation={handleUseCurrentLocation}
              locationLoading={locationLoading}
              locationError={locationError}
            />
          </div>

          {error && (
            <div className="mt-4 bg-red-500 text-white p-4 rounded-lg" role="alert">
              {error}
            </div>
          )}

          <button
            onClick={handleStartSession}
            disabled={loading}
            className="w-full bg-white text-orange-600 font-semibold py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition mt-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {reconfigureCode ? 'Try again' : 'Start session'}
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
