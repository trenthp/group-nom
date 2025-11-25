'use client'

import { Restaurant } from '@/lib/types'
import { useCallback, useState, useEffect } from 'react'

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

  // Reset animation when restaurant changes
  useEffect(() => {
    setAnimatingClass('')
  }, [restaurant.id])

  const handleYes = useCallback(() => {
    setAnimatingClass('swipe-right')
    setTimeout(onYes, 300)
  }, [onYes])

  const handleNo = useCallback(() => {
    setAnimatingClass('swipe-left')
    setTimeout(onNo, 300)
  }, [onNo])

  const handleSwipe = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0]
    const startX = e.touches[0]?.clientX || touch.clientX
    const startY = e.touches[0]?.clientY || touch.clientY

    let currentX = startX
    let currentY = startY

    const moveHandler = (moveEvent: TouchEvent) => {
      currentX = moveEvent.touches[0].clientX
      currentY = moveEvent.touches[0].clientY
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
      }

      document.removeEventListener('touchmove', moveHandler)
      document.removeEventListener('touchend', endHandler)
    }

    document.addEventListener('touchmove', moveHandler)
    document.addEventListener('touchend', endHandler)
  }

  const priceDisplay = restaurant.priceLevel
    ? '💵'.repeat(restaurant.priceLevel.length)
    : '$'

  return (
    <div
      className={`relative w-full ${animatingClass}`}
      onTouchStart={handleSwipe}
    >
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Image or Placeholder */}
        <div className="h-64 flex-shrink-0 bg-gradient-to-br from-orange-300 to-red-400 flex items-center justify-center relative overflow-hidden">
          {restaurant.imageUrl ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-6xl">🍴</div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 pt-6 pb-6 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {restaurant.name}
            </h2>

            {/* Cuisines - More prominent */}
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

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">⭐</span>
                <span className="font-semibold text-gray-800">
                  {restaurant.rating}
                </span>
                <span className="text-gray-600 text-sm">
                  ({restaurant.reviewCount} reviews)
                </span>
              </div>
              <span className="text-lg">{priceDisplay}</span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <p className="text-gray-600 text-xs flex-1">{restaurant.address}</p>

              {/* Subdued action buttons */}
              <div className="flex gap-2 flex-shrink-0">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-orange-600 hover:text-orange-700 font-semibold whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  View on Google
                </a>
                {restaurant.website && (
                  <>
                    <span className="text-gray-300">•</span>
                    <a
                      href={restaurant.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-600 hover:text-orange-700 font-semibold whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Visit Website
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="text-center mt-4 text-white font-semibold">
        {progress}
      </div>

      {/* Buttons */}
      <div className="flex gap-4 mt-6 justify-center">
        <button
          onClick={handleNo}
          className="w-16 h-16 rounded-full bg-red-500 text-white border-2 border-white shadow-lg hover:shadow-xl transform hover:scale-110 transition flex items-center justify-center text-2xl font-bold"
        >
          ✕
        </button>
        <button
          onClick={handleYes}
          className="w-16 h-16 rounded-full bg-green-500 text-white border-2 border-white shadow-lg hover:shadow-xl transform hover:scale-110 transition flex items-center justify-center text-2xl font-bold"
        >
          ✓
        </button>
      </div>

      {/* Swipe hint (mobile) */}
      <div className="text-center mt-4 text-white text-xs opacity-60 md:hidden">
        ← Swipe left or right →
      </div>
    </div>
  )
}
