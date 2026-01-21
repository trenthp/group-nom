'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { LocationIcon, StarIcon, HeartIcon, HeartOutlineIcon } from '@/components/icons'

interface RestaurantDetails {
  id: string
  name: string
  address?: string
  city?: string
  lat: number
  lng: number
  rating?: number
  reviewCount?: number
  priceLevel?: string
  cuisines?: string[]
  imageUrl?: string
  likeCount?: number
  isFavorite?: boolean
  googlePlaceId?: string
}

export default function RestaurantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isSignedIn } = useUser()
  const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [savingFavorite, setSavingFavorite] = useState(false)

  const id = params.id as string

  useEffect(() => {
    if (id) {
      fetchRestaurantDetails()
    }
  }, [id])

  const fetchRestaurantDetails = async () => {
    setLoading(true)
    setError(null)

    try {
      // Try to get from favorites first (has most data)
      const favResponse = await fetch(`/api/favorites/check?localId=${id}`)
      if (favResponse.ok) {
        const favData = await favResponse.json()
        if (favData.isFavorite && favData.favorite) {
          const fav = favData.favorite
          setRestaurant({
            id: fav.localId,
            name: fav.restaurantName,
            address: fav.restaurantAddress,
            city: fav.restaurantCity,
            lat: fav.restaurantLat,
            lng: fav.restaurantLng,
            cuisines: fav.restaurantCategories,
            likeCount: fav.likeCount,
            googlePlaceId: fav.googlePlaceId,
            isFavorite: true,
          })
          setIsFavorite(true)
          setLoading(false)
          return
        }
      }

      // Fallback: check sessionStorage for restaurant data passed from other pages
      const cached = sessionStorage.getItem(`restaurant-${id}`)
      if (cached) {
        const data = JSON.parse(cached)
        setRestaurant(data)
        setIsFavorite(data.isFavorite || false)
        setLoading(false)
        return
      }

      // If we can't find the restaurant, show error
      setError('Restaurant not found')
      setLoading(false)
    } catch (err) {
      console.error('Error fetching restaurant:', err)
      setError('Failed to load restaurant details')
      setLoading(false)
    }
  }

  const toggleFavorite = async () => {
    if (!isSignedIn || !restaurant) return

    setSavingFavorite(true)
    try {
      if (isFavorite) {
        // Remove from favorites
        const response = await fetch(`/api/favorites?localId=${restaurant.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setIsFavorite(false)
        }
      } else {
        // Add to favorites
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
        }
      }
    } catch (err) {
      console.error('Error toggling favorite:', err)
    } finally {
      setSavingFavorite(false)
    }
  }

  const googleMapsUrl = restaurant
    ? restaurant.googlePlaceId
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.googlePlaceId}`
      : `https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}`
    : ''

  const directionsUrl = restaurant
    ? `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`
    : ''

  if (loading) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center p-4">
        <div className="bg-[#333333] rounded-2xl p-8 max-w-md text-center">
          <p className="text-white/60 mb-4">{error || 'Restaurant not found'}</p>
          <button
            onClick={() => router.back()}
            className="bg-[#EA4D19] text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#222222]">
      {/* Header Image / Placeholder */}
      <div className="relative">
        {restaurant.imageUrl ? (
          <div className="w-full h-64 sm:h-80">
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#222222] via-transparent to-transparent" />
          </div>
        ) : (
          <div className="w-full h-48 bg-[#2a2a2a] flex items-center justify-center">
            <span className="text-6xl">🍽️</span>
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition"
        >
          <ChevronLeftIcon />
        </button>

        {/* Favorite Button */}
        {isSignedIn && (
          <button
            onClick={toggleFavorite}
            disabled={savingFavorite}
            className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition disabled:opacity-50"
          >
            {isFavorite ? (
              <HeartIcon size={20} className="text-red-500" />
            ) : (
              <HeartOutlineIcon size={20} />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-32 -mt-8 relative">
        <div className="max-w-lg mx-auto">
          {/* Main Info Card */}
          <div className="bg-[#333333] rounded-2xl p-6 mb-4">
            {/* Name & Local Badge */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <h1 className="text-2xl font-bold text-white leading-tight">
                {restaurant.name}
              </h1>
              {restaurant.likeCount && restaurant.likeCount > 0 && (
                <span className="flex-shrink-0 inline-flex items-center gap-1 bg-gradient-to-r from-[#EA4D19] to-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  <span>🏠</span>
                  <span>Local</span>
                </span>
              )}
            </div>

            {/* Location */}
            {(restaurant.address || restaurant.city) && (
              <div className="flex items-start gap-2 mb-4">
                <LocationIcon size={16} className="text-white/50 mt-0.5 flex-shrink-0" />
                <div>
                  {restaurant.address && (
                    <p className="text-white/70 text-sm">{restaurant.address}</p>
                  )}
                  {restaurant.city && !restaurant.address?.includes(restaurant.city) && (
                    <p className="text-white/50 text-sm">{restaurant.city}</p>
                  )}
                </div>
              </div>
            )}

            {/* Stats Row */}
            <div className="flex items-center gap-4 mb-4">
              {restaurant.rating && restaurant.rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <StarIcon size={16} className="text-yellow-400" />
                  <span className="text-white font-medium">{restaurant.rating.toFixed(1)}</span>
                  {restaurant.reviewCount && restaurant.reviewCount > 0 && (
                    <span className="text-white/50 text-sm">
                      ({restaurant.reviewCount.toLocaleString()})
                    </span>
                  )}
                </div>
              )}
              {restaurant.likeCount && restaurant.likeCount > 0 && (
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
              <div className="flex flex-wrap gap-2">
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
          </div>

          {/* More Details Coming Soon */}
          <div className="bg-[#333333] rounded-2xl p-6 mb-4">
            <h2 className="text-lg font-semibold text-white mb-3">Details</h2>
            <div className="bg-[#2a2a2a] rounded-xl p-4">
              <p className="text-white/40 text-sm text-center">
                More details like hours, phone, and photos coming soon as our community grows
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#222222] border-t border-white/10 p-4">
        <div className="max-w-lg mx-auto flex gap-3">
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

// Icons
function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
