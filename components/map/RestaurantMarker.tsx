'use client'

import { Marker, Popup } from 'react-leaflet'
import { DivIcon } from 'leaflet'
import { Restaurant } from '@/lib/types'
import { StarIcon, HeartIcon } from '@/components/icons'

// Default marker icon
const createDefaultIcon = (isHighlighted: boolean = false) => {
  return new DivIcon({
    className: 'custom-marker',
    html: `<div style="
      font-size: 24px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${isHighlighted ? '#EA580C' : '#ffffff'};
      border: 3px solid ${isHighlighted ? '#ffffff' : '#EA580C'};
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: all 0.2s ease;
    ">🍽️</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

// Saved/favorited marker with heart
const createSavedIcon = (isHighlighted: boolean = false) => {
  return new DivIcon({
    className: 'saved-marker',
    html: `<div style="
      font-size: 18px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${isHighlighted ? '#EA580C' : '#ffffff'};
      border: 3px solid ${isHighlighted ? '#ffffff' : '#EA580C'};
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    ">🍽️<span style="
      position: absolute;
      bottom: -2px;
      right: -2px;
      font-size: 12px;
      background: #EF4444;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
    ">❤️</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

// Winner marker with special styling
const createWinnerIcon = (rank: number) => {
  return new DivIcon({
    className: 'winner-marker',
    html: `<div style="
      font-size: 16px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #EA580C, #DC2626);
      color: white;
      font-weight: bold;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 4px 16px rgba(234, 88, 12, 0.4);
      cursor: pointer;
    ">${rank}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  })
}

export interface RestaurantMarkerProps {
  restaurant: Restaurant
  isHighlighted?: boolean
  isSaved?: boolean
  rank?: number
  onClick?: () => void
  disablePopup?: boolean
}

export function RestaurantMarker({
  restaurant,
  isHighlighted = false,
  isSaved = false,
  rank,
  onClick,
  disablePopup = false,
}: RestaurantMarkerProps) {
  const position: [number, number] = [restaurant.lat, restaurant.lng]

  // Choose the appropriate icon
  const icon = rank
    ? createWinnerIcon(rank)
    : isSaved
      ? createSavedIcon(isHighlighted)
      : createDefaultIcon(isHighlighted)

  const hasRating = restaurant.rating && restaurant.rating > 0
  const hasLikeCount = restaurant.likeCount && restaurant.likeCount > 0

  // When popup is disabled, just render the marker with click handler
  if (disablePopup) {
    return (
      <Marker
        position={position}
        icon={icon}
        eventHandlers={{
          click: () => onClick?.(),
        }}
      />
    )
  }

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(),
      }}
    >
      <Popup>
        <div className="min-w-[240px] max-w-[280px]">
          {/* Restaurant Image */}
          {restaurant.imageUrl ? (
            <div className="w-full h-32 overflow-hidden">
              <img
                src={restaurant.imageUrl}
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-24 bg-[#2a2a2a] flex items-center justify-center">
              <span className="text-3xl">🍽️</span>
            </div>
          )}

          <div className="p-4">
            {/* Header with name and badges */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="font-bold text-white text-base leading-tight">
                {restaurant.name}
              </h3>
              {/* Local badge */}
              {hasLikeCount && (
                <span className="flex-shrink-0 inline-flex items-center gap-1 bg-gradient-to-r from-[#EA4D19] to-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                  <span>🏠</span>
                  <span>Local</span>
                </span>
              )}
            </div>

            {/* Rating & Likes Row */}
            <div className="flex items-center gap-3 mb-3">
              {hasRating && (
                <div className="flex items-center gap-1">
                  <StarIcon size={14} className="text-yellow-400" />
                  <span className="text-sm text-white font-medium">
                    {restaurant.rating.toFixed(1)}
                  </span>
                  {restaurant.reviewCount > 0 && (
                    <span className="text-xs text-white/50">
                      ({restaurant.reviewCount.toLocaleString()})
                    </span>
                  )}
                </div>
              )}
              {hasLikeCount && (
                <div className="flex items-center gap-1">
                  <HeartIcon size={14} className="text-red-500" />
                  <span className="text-sm text-white/70">
                    {restaurant.likeCount} {restaurant.likeCount === 1 ? 'like' : 'likes'}
                  </span>
                </div>
              )}
            </div>

            {/* Categories */}
            {restaurant.cuisines && restaurant.cuisines.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {restaurant.cuisines.slice(0, 3).map((cuisine) => (
                  <span
                    key={cuisine}
                    className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded"
                  >
                    {cuisine}
                  </span>
                ))}
              </div>
            )}

            {/* Price Level */}
            {restaurant.priceLevel && (
              <div className="mb-3">
                <span className="text-sm text-white/60 font-medium">
                  {restaurant.priceLevel}
                </span>
              </div>
            )}

            {/* Address */}
            {restaurant.address && (
              <p className="text-xs text-white/50 mb-4">
                {restaurant.address}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => onClick?.()}
                className="flex-1 text-center text-xs bg-[#EA4D19] text-white font-medium py-2.5 px-3 rounded-lg hover:bg-orange-600 transition"
              >
                View Details
              </button>
              <a
                href={restaurant.id.startsWith('ChIJ')
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}&query_place_id=${restaurant.id}`
                  : `https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-xs bg-white/10 text-white font-medium py-2.5 px-3 rounded-lg hover:bg-white/20 transition"
              >
                Open in Google
              </a>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}
