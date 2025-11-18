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
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-[600px] flex flex-col md:h-[500px]">
        {/* Image or Placeholder */}
        <div className="h-2/3 bg-gradient-to-br from-orange-300 to-red-400 flex items-center justify-center relative overflow-hidden">
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
        <div className="h-1/3 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {restaurant.name}
            </h2>
            <p className="text-gray-600 text-sm mb-3">{restaurant.address}</p>

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

            <div className="flex flex-wrap gap-2">
              {restaurant.cuisines.map((cuisine) => (
                <span
                  key={cuisine}
                  className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold"
                >
                  {cuisine}
                </span>
              ))}
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
          className="w-16 h-16 rounded-full bg-red-500 text-white shadow-lg hover:shadow-xl transform hover:scale-110 transition flex items-center justify-center text-2xl font-bold"
        >
          ✕
        </button>
        <button
          onClick={handleYes}
          className="w-16 h-16 rounded-full bg-green-500 text-white shadow-lg hover:shadow-xl transform hover:scale-110 transition flex items-center justify-center text-2xl font-bold"
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
