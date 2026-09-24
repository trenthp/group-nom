'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { FavoriteWithRestaurant } from '@/lib/favorites'
import { LocationIcon, UtensilsIcon } from '@/components/icons'
import {
  PlaceCard,
  PlacePhoto,
  PlaceBody,
  PlaceTitle,
  PlaceAddress,
  PlaceMeta,
  PlaceActions,
  ActionLink,
  QuietLink,
} from '@/components/place'

interface SavedState {
  favorites: FavoriteWithRestaurant[]
  loading: boolean
  error: string | null
  hasMore: boolean
  offset: number
}

export default function ToTryPage() {
  const { isSignedIn, isLoaded } = useUser()
  const [state, setState] = useState<SavedState>({
    favorites: [],
    loading: true,
    error: null,
    hasMore: false,
    offset: 0,
  })

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchFavorites()
    } else if (isLoaded && !isSignedIn) {
      setState(s => ({ ...s, loading: false }))
    }
  }, [isLoaded, isSignedIn])

  const fetchFavorites = async (offset = 0) => {
    setState(s => ({ ...s, loading: offset === 0, error: null }))

    try {
      const response = await fetch(`/api/favorites?limit=20&offset=${offset}`)
      if (!response.ok) throw new Error('Failed to fetch favorites')

      const data = await response.json()
      setState(s => ({
        ...s,
        favorites: offset === 0 ? data.favorites : [...s.favorites, ...data.favorites],
        hasMore: data.pagination.hasMore,
        offset: offset + data.favorites.length,
        loading: false,
      }))
    } catch (error) {
      console.error('Error fetching favorites:', error)
      setState(s => ({
        ...s,
        error: 'Failed to load your list',
        loading: false,
      }))
    }
  }

  const handleRemove = async (localId: string) => {
    // Optimistic update
    setState(s => ({
      ...s,
      favorites: s.favorites.filter(f => f.localId !== localId),
    }))

    try {
      const response = await fetch(`/api/favorites?localId=${localId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to remove favorite')
    } catch (error) {
      console.error('Error removing favorite:', error)
      // Refetch on error
      fetchFavorites()
    }
  }

  // Auth loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
      </div>
    )
  }


  // Loading state
  if (state.loading && state.favorites.length === 0) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mx-auto mb-4" />
          <p className="text-white/60">Loading your list...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state.error && state.favorites.length === 0) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center p-4">
        <div className="bg-surface-card rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 mb-4">{state.error}</p>
          <button
            onClick={() => fetchFavorites()}
            className="bg-brand text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-hover transition"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Empty state
  if (state.favorites.length === 0) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center p-4">
        <div className="bg-surface-card rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <UtensilsIcon size={32} className="text-brand" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Nothing on your try-list yet
          </h2>
          <p className="text-white/60 mb-6">
            Save the places you want to get to. When you go and love one, nominate it.
          </p>
          <Link
            href="/discover"
            className="inline-block bg-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-hover transition"
          >
            Browse the map
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-page">
      {/* Header */}
      <header className="px-4 py-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-white">Places to try</h1>
          <p className="text-sm text-white/50">
            {state.favorites.length} place{state.favorites.length !== 1 ? 's' : ''} you want to get to
          </p>
        </div>
      </header>

      {/* Favorites List */}
      <main className="max-w-lg mx-auto px-4 pb-24">
        <div className="space-y-4">
          {state.favorites.map((favorite) => (
            <FavoriteCard
              key={favorite.id}
              favorite={favorite}
              onRemove={() => handleRemove(favorite.localId)}
            />
          ))}
        </div>

        {/* Load more */}
        {state.hasMore && (
          <div className="text-center py-6">
            <button
              onClick={() => fetchFavorites(state.offset)}
              disabled={state.loading}
              className="bg-surface-card text-brand px-6 py-2 rounded-lg font-medium border border-white/10 hover:bg-surface-card-hover transition disabled:opacity-50"
            >
              {state.loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}

      </main>
    </div>
  )
}

function FavoriteCard({
  favorite,
  onRemove,
}: {
  favorite: FavoriteWithRestaurant
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const mapUrl = `https://www.openstreetmap.org/?mlat=${favorite.restaurantLat}&mlon=${favorite.restaurantLng}#map=17/${favorite.restaurantLat}/${favorite.restaurantLng}`


  return (
    <PlaceCard>
      {/* Photo links to the place page. Photos come from nominations and
          aren't wired into favorites yet, so this is the placeholder for now. */}
      <Link
        href={`/restaurant/${favorite.localId}`}
        className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      >
        <PlacePhoto
          alt={favorite.restaurantName}
          loved={favorite.nominationCount > 0}
          height="md"
        />
      </Link>

      <PlaceBody>
        <PlaceTitle>
          <Link
            href={`/restaurant/${favorite.localId}`}
            className="hover:text-brand transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
          >
            {favorite.restaurantName}
          </Link>
        </PlaceTitle>
        {favorite.restaurantCity && <PlaceAddress>{favorite.restaurantCity}</PlaceAddress>}
        <PlaceMeta
          nominationCount={favorite.nominationCount}
          cuisines={favorite.restaurantCategories ?? []}
          maxChips={3}
        />

        {/* Expandable Details Section */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between py-2 text-white/40 hover:text-white/60 transition text-sm"
        >
          <span>{expanded ? 'Show less' : 'Show more details'}</span>
          <ChevronIcon direction={expanded ? 'up' : 'down'} />
        </button>

        {expanded && (
          <div className="pt-2 pb-1 space-y-3 border-t border-white/10">
            {/* Address */}
            <DetailRow
              icon={<LocationIcon size={14} />}
              label="Address"
              value={favorite.restaurantAddress}
              skeleton="123 Main Street"
            />

            {/* More data coming soon hint */}
            <div className="bg-[#2a2a2a] rounded-lg p-3 mt-3">
              <p className="text-white/40 text-xs text-center">
                Hours, menus, and parking tips get added as the community fills them in
              </p>
            </div>
          </div>
        )}

        {/* Actions: nominate is the follow-through (you saved it because you
            think you'll love it); the map is the quiet way there */}
        <PlaceActions className="mt-3">
          <ActionLink href={`/nominate/${favorite.localId}`}>❤️ Nominate</ActionLink>
          <QuietLink href={mapUrl} external>
            Open in maps ↗
          </QuietLink>
        </PlaceActions>

        <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-white/10">
          {showConfirm ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onRemove}
                className="text-red-400 text-sm font-medium py-2 px-3 rounded-lg hover:bg-red-500/10 transition"
              >
                Remove
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-white/50 text-sm py-2 px-2 rounded-lg hover:bg-white/5 transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-white/40 hover:text-white/60 p-2 rounded-lg hover:bg-white/5 transition"
              title="Remove from your list"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </PlaceBody>
    </PlaceCard>
  )
}

// Skeleton pill for missing data
// Detail row with skeleton support
function DetailRow({
  icon,
  label,
  value,
  skeleton,
}: {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
  skeleton: string
}) {
  const hasValue = !!value

  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 ${hasValue ? 'text-white/50' : 'text-white/20'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/40 text-xs mb-0.5">{label}</p>
        {hasValue ? (
          <p className="text-white/80 text-sm">{value}</p>
        ) : (
          <p className="text-white/20 text-sm border-b border-dashed border-white/10 inline-block">
            {skeleton}
          </p>
        )}
      </div>
    </div>
  )
}

// Icons

function ChevronIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`transition-transform ${direction === 'up' ? 'rotate-180' : ''}`}
    >
      <polyline points="6,9 12,15 18,9" />
    </svg>
  )
}


function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
