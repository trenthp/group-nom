'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Restaurant } from '@/lib/types'
import { LocationIcon, StarIcon, HeartIcon, HeartOutlineIcon } from '@/components/icons'
import LocalBadge from '@/components/LocalBadge'

export interface RestaurantDetailSheetProps {
  restaurant: Restaurant & {
    city?: string
    googlePlaceId?: string
    isFavorite?: boolean
  }
  onFavoriteChange?: (restaurantId: string, isFavorite: boolean) => void
  onClose?: () => void
}

export function RestaurantDetailSheet({ restaurant, onFavoriteChange, onClose }: RestaurantDetailSheetProps) {
  const { isSignedIn } = useUser()
  const [isFavorite, setIsFavorite] = useState(restaurant.isFavorite || false)
  const [savingFavorite, setSavingFavorite] = useState(false)

  const toggleFavorite = async () => {
    if (!isSignedIn) return

    setSavingFavorite(true)
    try {
      if (isFavorite) {
        const response = await fetch(`/api/favorites?localId=${restaurant.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setIsFavorite(false)
          onFavoriteChange?.(restaurant.id, false)
        }
      } else {
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            localId: restaurant.id,
            googlePlaceId: restaurant.googlePlaceId,
            restaurantName: restaurant.name,
            restaurantAddress: restaurant.address,
            restaurantCity: restaurant.city,
            restaurantLat: restaurant.lat,
            restaurantLng: restaurant.lng,
            restaurantCategories: restaurant.cuisines,
          }),
        })
        if (response.ok) {
          setIsFavorite(true)
          onFavoriteChange?.(restaurant.id, true)
        }
      }
    } catch (err) {
      console.error('Error toggling favorite:', err)
    } finally {
      setSavingFavorite(false)
    }
  }

  const googleMapsUrl = restaurant.googlePlaceId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.googlePlaceId}`
    : restaurant.id.startsWith('ChIJ')
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.id}`
      : `https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}`

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`

  const hasRating = restaurant.rating && restaurant.rating > 0
  const hasLikeCount = restaurant.likeCount && restaurant.likeCount > 0

  return (
    <div className="pb-6">
      {/* Header Image / Placeholder */}
      <div className="relative">
        {restaurant.imageUrl ? (
          <div className="w-full h-48">
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-32 bg-[#2a2a2a] flex items-center justify-center">
            <span className="text-5xl">🍽️</span>
          </div>
        )}

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Local Badge */}
        {hasLikeCount && (
          <div className="absolute top-3 right-3">
            <LocalBadge likeCount={restaurant.likeCount!} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pt-4">
        {/* Name & Favorite */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-white leading-tight">
            {restaurant.name}
          </h2>
          {isSignedIn && (
            <button
              onClick={toggleFavorite}
              disabled={savingFavorite}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition disabled:opacity-50"
            >
              {isFavorite ? (
                <HeartIcon size={20} className="text-red-500" />
              ) : (
                <HeartOutlineIcon size={20} className="text-white/60" />
              )}
            </button>
          )}
        </div>

        {/* Location */}
        {(restaurant.address || restaurant.city) && (
          <div className="flex items-start gap-2 mb-4">
            <LocationIcon size={16} className="text-white/50 mt-0.5 flex-shrink-0" />
            <p className="text-white/60 text-sm">
              {restaurant.address || restaurant.city}
            </p>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-4">
          {hasRating && (
            <div className="flex items-center gap-1.5">
              <StarIcon size={16} className="text-yellow-400" />
              <span className="text-white font-medium">{restaurant.rating!.toFixed(1)}</span>
              {restaurant.reviewCount > 0 && (
                <span className="text-white/50 text-sm">
                  ({restaurant.reviewCount.toLocaleString()})
                </span>
              )}
            </div>
          )}
          {hasLikeCount && (
            <div className="flex items-center gap-1.5">
              <HeartIcon size={16} className="text-red-500" />
              <span className="text-white/70">
                {restaurant.likeCount} {restaurant.likeCount === 1 ? 'like' : 'likes'}
              </span>
            </div>
          )}
          {restaurant.priceLevel && (
            <span className="text-white/60 font-medium">{restaurant.priceLevel}</span>
          )}
        </div>

        {/* Cuisines */}
        {restaurant.cuisines && restaurant.cuisines.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {restaurant.cuisines.map((cuisine) => (
              <span
                key={cuisine}
                className="text-sm bg-white/10 text-white/70 px-3 py-1 rounded-full"
              >
                {cuisine}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-[#EA4D19] text-white font-medium py-3.5 rounded-xl text-center hover:bg-orange-600 transition"
          >
            Get Directions
          </a>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-white/10 text-white font-medium py-3.5 rounded-xl text-center hover:bg-white/20 transition"
          >
            Open in Google
          </a>
        </div>
      </div>
    </div>
  )
}
