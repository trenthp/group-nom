'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUser, SignInButton } from '@clerk/nextjs'
import Link from 'next/link'
import { FavoriteWithRestaurant } from '@/lib/favorites'
import { Restaurant } from '@/lib/types'
import LocalBadge from '@/components/LocalBadge'
import { UtensilsIcon } from '@/components/icons'
import { MapToggle } from '@/components/map/MapToggle'
import { DynamicMap } from '@/components/map/DynamicMap'
import { Modal } from '@/components/ui'
import { RestaurantDetailSheet } from '@/components/RestaurantDetailSheet'

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
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [selectedRestaurant, setSelectedRestaurant] = useState<(Restaurant & { city?: string; googlePlaceId?: string; isFavorite?: boolean }) | null>(null)

  // Convert favorites to Restaurant format for the map
  const mapRestaurants: Restaurant[] = useMemo(() => {
    return state.favorites.map((fav) => ({
      id: fav.googlePlaceId || fav.localId,
      name: fav.restaurantName,
      address: fav.restaurantAddress || '',
      rating: 0,
      reviewCount: 0,
      cuisines: fav.restaurantCategories || [],
      lat: fav.restaurantLat,
      lng: fav.restaurantLng,
      likeCount: fav.likeCount,
    }))
  }, [state.favorites])

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

  const openRestaurantDetail = (favorite: FavoriteWithRestaurant) => {
    setSelectedRestaurant({
      id: favorite.localId,
      name: favorite.restaurantName,
      address: favorite.restaurantAddress || '',
      city: favorite.restaurantCity || undefined,
      lat: favorite.restaurantLat,
      lng: favorite.restaurantLng,
      rating: 0,
      reviewCount: 0,
      cuisines: favorite.restaurantCategories || [],
      likeCount: favorite.likeCount,
      googlePlaceId: favorite.googlePlaceId || undefined,
      isFavorite: true,
    })
  }

  const openRestaurantDetailById = (restaurantId: string) => {
    const favorite = state.favorites.find(
      f => f.localId === restaurantId || f.googlePlaceId === restaurantId
    )
    if (favorite) {
      openRestaurantDetail(favorite)
    }
  }

  const handleFavoriteChange = (restaurantId: string, isFavorite: boolean) => {
    if (!isFavorite) {
      // Remove from favorites list
      setState(s => ({
        ...s,
        favorites: s.favorites.filter(f => f.localId !== restaurantId),
      }))
      // Close the bottom sheet
      setSelectedRestaurant(null)
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
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-bold text-white">Saved Places</h1>
              <p className="text-sm text-white/50">
                {state.favorites.length} restaurant{state.favorites.length !== 1 ? 's' : ''}
              </p>
            </div>
            {/* View Toggle */}
            <MapToggle view={viewMode} onViewChange={setViewMode} variant="dark" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 pb-24">
        {viewMode === 'map' ? (
          /* Map View */
          <div>
            <DynamicMap
              restaurants={mapRestaurants}
              markAllAsSaved={true}
              disablePopup={true}
              onMarkerClick={openRestaurantDetailById}
              height="calc(100vh - 200px)"
              className="rounded-2xl overflow-hidden"
            />
          </div>
        ) : (
          /* Tile Grid View */
          <>
            <div className="grid grid-cols-2 gap-3">
              {state.favorites.map((favorite) => (
                <RestaurantTile
                  key={favorite.id}
                  favorite={favorite}
                  onClick={() => openRestaurantDetail(favorite)}
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
          </>
        )}

        {/* Google Attribution - Required by Google Maps Platform ToS */}
        <div className="text-center py-4">
          <p className="text-white/30 text-xs">
            Restaurant data powered by Google
          </p>
        </div>
      </main>

      {/* Restaurant Detail Modal */}
      <Modal
        isOpen={selectedRestaurant !== null}
        onClose={() => setSelectedRestaurant(null)}
        variant="dark"
        className="max-w-lg"
      >
        {selectedRestaurant && (
          <RestaurantDetailSheet
            restaurant={selectedRestaurant}
            onFavoriteChange={handleFavoriteChange}
            onClose={() => setSelectedRestaurant(null)}
          />
        )}
      </Modal>
    </div>
  )
}

function RestaurantTile({
  favorite,
  onClick
}: {
  favorite: FavoriteWithRestaurant
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bg-[#333333] rounded-xl overflow-hidden text-left hover:bg-[#3a3a3a] transition-colors group"
    >
      {/* Image / Placeholder */}
      <div className="relative aspect-[4/3] bg-[#2a2a2a]">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl">🍽️</span>
        </div>

        {/* Local Badge */}
        {favorite.likeCount > 0 && (
          <div className="absolute top-2 right-2">
            <LocalBadge likeCount={favorite.likeCount} size="sm" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 mb-1 group-hover:text-[#EA4D19] transition-colors">
          {favorite.restaurantName}
        </h3>

        {/* Categories */}
        {favorite.restaurantCategories && favorite.restaurantCategories.length > 0 && (
          <p className="text-white/50 text-xs line-clamp-1">
            {favorite.restaurantCategories.slice(0, 2).join(' · ')}
          </p>
        )}

        {/* City */}
        {favorite.restaurantCity && (
          <p className="text-white/40 text-xs mt-1">
            {favorite.restaurantCity}
          </p>
        )}
      </div>
    </button>
  )
}
