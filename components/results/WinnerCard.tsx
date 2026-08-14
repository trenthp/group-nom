'use client'

import { Restaurant } from '@/lib/types'
import { ConfettiIcon, CompassIcon, PhoneIcon, GlobeIcon } from '@/components/icons'

export interface WinnerCardProps {
  winner: Restaurant
  resultMessage: string
}

/**
 * The celebration card (Sunset Glass skin). Positive-only: the community
 * signal is nominations — no ratings, no reviews.
 */
export function WinnerCard({ winner, resultMessage }: WinnerCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card-light overflow-hidden bounce-winner">
      {/* Image */}
      {winner.imageUrl ? (
        <div className="h-64 bg-gray-200 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={winner.imageUrl}
            alt={winner.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4 bg-white/90 rounded-full p-3 shadow-lg">
            <ConfettiIcon size={32} className="text-orange-500" />
          </div>
        </div>
      ) : (
        <div className="h-64 bg-gradient-to-br from-sunset-from to-sunset-to flex items-center justify-center">
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
          {(winner.nominationCount ?? 0) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Community</span>
              <span className="font-semibold text-green-700">
                ❤️ Nominated by {winner.nominationCount} local{winner.nominationCount === 1 ? '' : 's'}
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
            href={`https://www.google.com/maps/dir/?api=1&destination=${winner.lat},${winner.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-brand-hover text-white font-semibold py-3 rounded-lg hover:bg-orange-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <CompassIcon size={20} />
            Get Directions
          </a>

          <a
            href={`/restaurant/${winner.id}`}
            className="block w-full bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 transition text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
          >
            <span className="flex items-center justify-center gap-2">
              ❤️ Loved it? Nominate this spot
            </span>
            <span className="block text-xs font-normal mt-1 opacity-90">
              Add it to the community library
            </span>
          </a>
        </div>

        {/* Secondary Actions */}
        {(winner.phone || winner.website) && (
          <div className="space-y-2 pt-2 border-t border-gray-200">
            {winner.phone && (
              <a
                href={`tel:${winner.phone}`}
                className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-200 transition text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
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
                className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-200 transition text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
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
