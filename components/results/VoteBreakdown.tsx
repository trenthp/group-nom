'use client'

import { Restaurant } from '@/lib/types'

export interface VoteCount {
  restaurantId: string
  restaurant: Restaurant
  yesCount: number
  noCount: number
  votes: { [key: string]: boolean }
}

export interface VoteBreakdownProps {
  voteDetails: VoteCount[]
  isExpanded: boolean
  onToggle: () => void
}

export function VoteBreakdown({
  voteDetails,
  isExpanded,
  onToggle,
}: VoteBreakdownProps) {
  const votesWithData = voteDetails.filter(
    (v) => Object.keys(v.votes).length > 0
  )

  if (votesWithData.length === 0) return null

  return (
    <div className="border-t border-white border-opacity-20 pt-4">
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls="vote-breakdown-content"
        className="w-full flex items-center justify-between text-sm font-semibold hover:opacity-80 transition"
      >
        <span>Vote Breakdown</span>
        <span className="text-lg" aria-hidden="true">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <div id="vote-breakdown-content" className="mt-3 space-y-2">
          {votesWithData
            .sort((a, b) => b.yesCount - a.yesCount)
            .map((detail) => (
              <div
                key={detail.restaurantId}
                className="bg-white bg-opacity-10 p-3 rounded-lg"
              >
                <p className="font-semibold text-sm mb-1">
                  {detail.restaurant.name}
                </p>
                <div className="w-full bg-black bg-opacity-30 rounded-full h-2">
                  <div
                    className="bg-green-400 h-2 rounded-full"
                    style={{
                      width: `${
                        (detail.yesCount / (detail.yesCount + detail.noCount)) *
                          100 || 0
                      }%`,
                    }}
                  />
                </div>
                <p className="text-xs mt-1 opacity-90">
                  {detail.yesCount} yes, {detail.noCount} no
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
