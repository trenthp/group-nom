'use client'

import { Restaurant } from '@/lib/types'
import {
  ConfettiIcon,
  StarIcon,
  CompassIcon,
  LocationIcon,
  PhoneIcon,
  GlobeIcon,
} from '@/components/icons'

export interface WinnerCardProps {
  winner: Restaurant
  resultMessage: string
}

export function WinnerCard({ winner, resultMessage }: WinnerCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden transform scale-100 bounce-winner">
      {/* Image */}
      {winner.imageUrl ? (
        <div className="h-64 bg-gray-200 relative">
          <img
            src={winner.imageUrl}
            alt={winner.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-full p-3 shadow-lg">
            <ConfettiIcon size={32} className="text-orange-500" />
          </div>
        </div>
      ) : (
        <div className="h-64 bg-gradient-to-br from-green-300 to-blue-400 flex items-center justify-center">
          <ConfettiIcon size={96} className="text-white" />
        </div>
      )}

      {/* Content */}
      <div className="p-8 text-center">
        <h2 className="text-4xl font-bold text-gray-800 mb-4">{winner.name}</h2>

        {winner.address && (
          <p className="text-gray-600 mb-4">{winner.address}</p>
        )}

        <div className="bg-green-100 text-green-800 px-4 py-3 rounded-lg mb-6 font-bold">
          {resultMessage}
        </div>

        <div className="space-y-3 mb-6">
          {winner.rating && (
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Rating</span>
              <div className="flex items-center gap-2">
                <StarIcon size={18} className="text-yellow-400" />
                <span className="font-bold text-gray-800">
                  {winner.rating} ({winner.reviewCount} reviews)
                </span>
              </div>
            </div>
          )}

          {winner.priceLevel && (
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Price</span>
              <span className="font-semibold text-gray-800">
                {winner.priceLevel}
              </span>
            </div>
          )}

          {winner.cuisines && winner.cuisines.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Cuisines</span>
              <span className="font-semibold text-gray-800">
                {winner.cuisines.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Primary Actions */}
        <div className="space-y-3 mb-4">
          <a
            href={
              winner.id.startsWith('ChIJ')
                ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(winner.name)}&destination_place_id=${winner.id}`
                : `https://www.google.com/maps/dir/?api=1&destination=${winner.lat},${winner.lng}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-orange-600 text-white font-semibold py-3 rounded-lg hover:bg-orange-700 transition"
          >
            <CompassIcon size={20} />
            Get Directions
          </a>

          <a
            href={
              winner.id.startsWith('ChIJ')
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name)}&query_place_id=${winner.id}`
                : `https://www.google.com/maps/search/?api=1&query=${winner.lat},${winner.lng}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition text-center"
          >
            <span className="flex items-center justify-center gap-2">
              <LocationIcon size={20} />
              View on Google Maps
            </span>
            <div className="text-xs font-normal mt-1 opacity-90">
              See menu, photos, reviews & more
            </div>
          </a>
        </div>

        {/* Secondary Actions */}
        {(winner.phone || winner.website) && (
          <div className="space-y-2 pt-2 border-t border-gray-200">
            {winner.phone && (
              <a
                href={`tel:${winner.phone}`}
                className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-200 transition text-sm"
              >
                <PhoneIcon size={16} />
                Call Restaurant
              </a>
            )}

            {winner.website && (
              <a
                href={winner.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-200 transition text-sm"
              >
                <GlobeIcon size={16} />
                Visit Website
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
