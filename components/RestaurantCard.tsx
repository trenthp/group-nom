'use client'

import { Restaurant } from '@/lib/types'
import { useCallback, useState, useEffect, useRef } from 'react'
import { UtensilsIcon, StarIcon, LocationIcon } from '@/components/icons'

interface RestaurantCardProps {
  restaurant: Restaurant
  onYes: () => void
  onNo: () => void
  progress: string
}

export default function RestaurantCard({
  restaurant,
  onYes,
  onNo,
  progress,
}: RestaurantCardProps) {
  const [animatingClass, setAnimatingClass] = useState('')
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Reset animation and swipe state when restaurant changes
  useEffect(() => {
    setAnimatingClass('')
    setSwipeOffset(0)
    setIsSwiping(false)
  }, [restaurant.id])

  const handleYes = useCallback(() => {
    setSwipeOffset(0)
    setIsSwiping(false)
    setAnimatingClass('swipe-right')
    setTimeout(onYes, 300)
  }, [onYes])

  const handleNo = useCallback(() => {
    setSwipeOffset(0)
    setIsSwiping(false)
    setAnimatingClass('swipe-left')
    setTimeout(onNo, 300)
  }, [onNo])

  const handleSwipe = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0]
    const startX = e.touches[0]?.clientX || touch.clientX
    const startY = e.touches[0]?.clientY || touch.clientY

    let currentX = startX
    let currentY = startY
    setIsSwiping(true)

    const moveHandler = (moveEvent: TouchEvent) => {
      currentX = moveEvent.touches[0].clientX
      currentY = moveEvent.touches[0].clientY
      const diffX = currentX - startX

      // Only update offset for horizontal swipes
      if (Math.abs(diffX) > Math.abs(currentY - startY)) {
        setSwipeOffset(diffX)
      }
    }

    const endHandler = () => {
      const diffX = currentX - startX
      const diffY = currentY - startY

      // Determine swipe direction
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
          handleYes()
        } else {
          handleNo()
        }
      } else {
        // Reset if swipe wasn't far enough
        setSwipeOffset(0)
        setIsSwiping(false)
      }

      document.removeEventListener('touchmove', moveHandler)
      document.removeEventListener('touchend', endHandler)
    }

    document.addEventListener('touchmove', moveHandler)
    document.addEventListener('touchend', endHandler)
  }

  // Calculate visual feedback based on swipe offset
  const rotation = isSwiping ? swipeOffset * 0.05 : 0
  const likeOpacity = Math.min(Math.max(swipeOffset / 100, 0), 1)
  const nopeOpacity = Math.min(Math.max(-swipeOffset / 100, 0), 1)

  const priceDisplay = restaurant.priceLevel || '$'

  return (
    <div
      ref={cardRef}
      className={`relative w-full ${animatingClass}`}
      style={{
        transform: isSwiping ? `translateX(${swipeOffset}px) rotate(${rotation}deg)` : undefined,
        transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
      }}
      onTouchStart={handleSwipe}
    >
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
        {/* Swipe Indicators */}
        <div
          className="absolute top-6 left-6 z-10 bg-green-500 text-white font-bold text-2xl px-4 py-2 rounded-lg border-4 border-white shadow-lg transform -rotate-12 pointer-events-none"
          style={{ opacity: likeOpacity }}
          aria-hidden="true"
        >
          LIKE
        </div>
        <div
          className="absolute top-6 right-6 z-10 bg-red-500 text-white font-bold text-2xl px-4 py-2 rounded-lg border-4 border-white shadow-lg transform rotate-12 pointer-events-none"
          style={{ opacity: nopeOpacity }}
          aria-hidden="true"
        >
          NOPE
        </div>

        {/* Image or Placeholder */}
        <div className="h-64 flex-shrink-0 bg-gradient-to-br from-orange-300 to-red-400 flex items-center justify-center relative overflow-hidden">
          {/* Color overlays during swipe */}
          <div
            className="absolute inset-0 bg-green-500 pointer-events-none z-[1]"
            style={{ opacity: likeOpacity * 0.3 }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-red-500 pointer-events-none z-[1]"
            style={{ opacity: nopeOpacity * 0.3 }}
            aria-hidden="true"
          />
          {restaurant.imageUrl ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <UtensilsIcon size={64} className="text-white" />
          )}
        </div>

        {/* Content */}
        <div className="px-6 pt-6 pb-6 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {restaurant.name}
            </h2>

            {/* Cuisines - More prominent */}
            {restaurant.cuisines && restaurant.cuisines.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {restaurant.cuisines.map((cuisine) => (
                  <span
                    key={cuisine}
                    className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold"
                  >
                    {cuisine}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <StarIcon size={16} className="text-yellow-400" />
                <span className="font-semibold text-gray-800">
                  {restaurant.rating}
                </span>
                <span className="text-gray-600 text-sm">
                  ({restaurant.reviewCount} reviews)
                </span>
              </div>
              <span className="text-lg">{priceDisplay}</span>
            </div>

            <div className="flex items-stretch justify-between gap-2">
              {restaurant.address && (
                <p className="text-gray-600 text-xs w-1/2">{restaurant.address}</p>
              )}
              <a
                href={restaurant.id.startsWith('ChIJ')
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.id}`
                  : `https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium w-1/2 pt-[0.5rem] pb-[0.4rem] px-[0.75rem] bg-blue-50 rounded hover:bg-blue-100 transition flex flex-col justify-center text-left border border-blue-200 leading-[0.8rem]"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="flex items-center justify-center gap-1">
                  <LocationIcon size={12} />
                  View on Google
                </span>
                <span className="text-[10px] text-blue-500 font-normal text-right">see menu, photos, reviews, & more</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="text-center mt-4 text-white font-semibold" aria-label={`Restaurant ${progress}`}>
        {progress}
      </div>

      {/* Buttons */}
      <div className="flex gap-4 mt-6 justify-center" role="group" aria-label="Vote on this restaurant">
        <button
          onClick={handleNo}
          aria-label={`Pass on ${restaurant.name}`}
          className="w-16 h-16 rounded-full bg-red-500 text-white border-2 border-white shadow-lg hover:shadow-xl transform hover:scale-110 transition flex items-center justify-center text-2xl font-bold"
        >
          ✕
        </button>
        <button
          onClick={handleYes}
          aria-label={`Like ${restaurant.name}`}
          className="w-16 h-16 rounded-full bg-green-500 text-white border-2 border-white shadow-lg hover:shadow-xl transform hover:scale-110 transition flex items-center justify-center text-2xl font-bold"
        >
          ✓
        </button>
      </div>

      {/* Swipe hint (mobile) */}
      <div className="text-center mt-4 text-white text-xs opacity-60 md:hidden" aria-hidden="true">
        ← Pass or Pull →
      </div>
    </div>
  )
}
