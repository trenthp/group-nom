'use client'

import { useState, useEffect } from 'react'
import { useUser, SignInButton } from '@clerk/nextjs'
import Link from 'next/link'
import { FavoriteWithRestaurant } from '@/lib/favorites'
import LocalBadge from '@/components/LocalBadge'
import { LocationIcon, UtensilsIcon } from '@/components/icons'

interface SavedState {
  favorites: FavoriteWithRestaurant[]
  loading: boolean
  error: string | null
  hasMore: boolean
  offset: number
}

export default function SavedPage() {
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
        error: 'Failed to load favorites',
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
      <div className="min-h-screen bg-[#222222] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  // Not signed in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center p-4">
        <div className="bg-[#333333] rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-[#EA4D19]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <UtensilsIcon size={32} className="text-[#EA4D19]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Your Saved Places
          </h1>
          <p className="text-white/60 mb-6">
            Sign in to save your favorite restaurants and access them anytime.
          </p>
          <SignInButton mode="modal">
            <button className="bg-[#EA4D19] text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition">
              Sign In to Get Started
            </button>
          </SignInButton>
        </div>
      </div>
    )
  }

  // Loading state
  if (state.loading && state.favorites.length === 0) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mx-auto mb-4" />
          <p className="text-white/60">Loading your favorites...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state.error && state.favorites.length === 0) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center p-4">
        <div className="bg-[#333333] rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 mb-4">{state.error}</p>
          <button
            onClick={() => fetchFavorites()}
            className="bg-[#EA4D19] text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition"
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
      <div className="min-h-screen bg-[#222222] flex items-center justify-center p-4">
        <div className="bg-[#333333] rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-[#EA4D19]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <UtensilsIcon size={32} className="text-[#EA4D19]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            No favorites yet
          </h2>
          <p className="text-white/60 mb-6">
            Start discovering restaurants and swipe right to save your favorites!
          </p>
          <Link
            href="/discover"
            className="inline-block bg-[#EA4D19] text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition"
          >
            Start Discovering
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#222222]">
      {/* Header */}
      <header className="px-4 py-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-white">Saved Places</h1>
          <p className="text-sm text-white/50">
            {state.favorites.length} restaurant{state.favorites.length !== 1 ? 's' : ''}
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
              className="bg-[#333333] text-[#EA4D19] px-6 py-2 rounded-lg font-medium border border-white/10 hover:bg-[#3a3a3a] transition disabled:opacity-50"
            >
              {state.loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}

        {/* Google Attribution - Required by Google Maps Platform ToS */}
        <div className="text-center py-4">
          <p className="text-white/30 text-xs">
            Restaurant data powered by Google
          </p>
        </div>
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

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    favorite.restaurantName
  )}&query_place_id=${favorite.googlePlaceId || ''}`

  // Mock data availability - in future, these would come from the database
  const hasPhoto = false
  const hasPriceLevel = false
  const hasHours = false
  const hasRating = false
  const hasPhone = false

  return (
    <div className="bg-[#333333] rounded-xl overflow-hidden">
      {/* Photo Section */}
      <div className="relative">
        {hasPhoto ? (
          // Real photo would go here
          <div className="w-full h-40 bg-gray-700" />
        ) : (
          // Photo skeleton/placeholder
          <div className="w-full h-32 bg-[#2a2a2a] flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2">
                <CameraIcon className="text-white/20" />
              </div>
              <p className="text-white/20 text-xs">No photo yet</p>
            </div>
          </div>
        )}

        {/* Local Badge - positioned on photo */}
        <div className="absolute top-3 right-3">
          <LocalBadge likeCount={favorite.likeCount} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header: Name & Location */}
        <div className="mb-3">
          <h3 className="font-semibold text-white text-lg leading-tight">
            {favorite.restaurantName}
          </h3>
          {favorite.restaurantCity && (
            <p className="text-sm text-white/50 flex items-center gap-1 mt-1">
              <LocationIcon size={12} />
              {favorite.restaurantCity}
            </p>
          )}
        </div>

        {/* Quick Info Row - Real data + Skeletons */}
        <div className="flex items-center gap-3 mb-3">
          {/* Price Level */}
          {hasPriceLevel ? (
            <span className="text-white/70 text-sm">$$</span>
          ) : (
            <SkeletonPill label="$$$" />
          )}

          {/* Rating */}
          {hasRating ? (
            <span className="text-white/70 text-sm flex items-center gap-1">
              <StarIcon className="text-yellow-500" size={14} />
              4.5
            </span>
          ) : (
            <SkeletonPill label="★ —" />
          )}

          {/* Hours */}
          {hasHours ? (
            <span className="text-green-400 text-sm">Open now</span>
          ) : (
            <SkeletonPill label="Hours" />
          )}
        </div>

        {/* Categories */}
        {favorite.restaurantCategories && favorite.restaurantCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {favorite.restaurantCategories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className="bg-white/10 text-white/70 px-2 py-0.5 rounded text-xs"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

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

            {/* Phone */}
            <DetailRow
              icon={<PhoneIcon />}
              label="Phone"
              value={hasPhone ? '(555) 123-4567' : null}
              skeleton="(555) 123-4567"
            />

            {/* Hours - expanded */}
            <DetailRow
              icon={<ClockIcon />}
              label="Hours"
              value={hasHours ? 'Open until 10 PM' : null}
              skeleton="Open · Closes 10 PM"
            />

            {/* More data coming soon hint */}
            <div className="bg-[#2a2a2a] rounded-lg p-3 mt-3">
              <p className="text-white/40 text-xs text-center">
                More details added as our community grows
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 text-sm text-[#EA4D19] hover:text-orange-400 py-2.5 rounded-lg hover:bg-white/5 transition font-medium"
          >
            <GoogleIcon />
            View on Google
          </a>
          <div className="w-px h-6 bg-white/10" />
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
              title="Remove from saved"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Skeleton pill for missing data
function SkeletonPill({ label }: { label: string }) {
  return (
    <span className="text-white/20 text-sm bg-white/5 px-2 py-0.5 rounded border border-dashed border-white/10">
      {label}
    </span>
  )
}

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
function CameraIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function StarIcon({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  )
}

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

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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
