'use client'

import { useState } from 'react'
import { Restaurant } from '@/lib/types'

export interface MatchVotes {
  restaurantId: string
  restaurant: Restaurant
  yesCount: number
  noCount: number
}

export interface MatchNavigationProps {
  currentIndex: number
  totalMatches: number
  currentYesCount?: number
  onPrevious: () => void
  onNext: () => void
  /** All matches with votes, for the breakdown accordion (sorted by caller). */
  voteDetails: MatchVotes[]
}

/**
 * Navigate between tied winning matches + vote breakdown accordion
 * (Sunset Glass skin).
 */
export function MatchNavigation({
  currentIndex,
  totalMatches,
  currentYesCount,
  onPrevious,
  onNext,
  voteDetails,
}: MatchNavigationProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  const navButtonClasses = `
    bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed
    px-4 py-2 rounded-lg font-semibold transition
    focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80
  `

  return (
    <nav
      className="bg-surface-glass backdrop-blur-glass border border-surface-glass-border rounded-xl p-4 mb-6 text-white"
      aria-label="Match navigation"
    >
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          aria-label="View previous match"
          className={navButtonClasses}
        >
          ← Previous
        </button>

        <div className="text-center" aria-live="polite">
          <p className="text-sm opacity-80">Match</p>
          <p className="text-2xl font-bold">
            {currentIndex + 1} / {totalMatches}
          </p>
          {currentYesCount !== undefined && (
            <p className="text-xs opacity-70 mt-1">
              {currentYesCount} {currentYesCount === 1 ? 'vote' : 'votes'}
            </p>
          )}
        </div>

        <button
          onClick={onNext}
          disabled={currentIndex >= totalMatches - 1}
          aria-label="View next match"
          className={navButtonClasses}
        >
          Next →
        </button>
      </div>

      {/* Vote Breakdown Accordion */}
      <div className="border-t border-white/20 pt-4">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          aria-expanded={showBreakdown}
          aria-controls="vote-breakdown-content"
          className="w-full flex items-center justify-between text-sm font-semibold hover:opacity-80 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded"
        >
          <span>Vote Breakdown</span>
          <span className="text-lg" aria-hidden="true">{showBreakdown ? '▲' : '▼'}</span>
        </button>

        {showBreakdown && (
          <div id="vote-breakdown-content" className="mt-3 space-y-2">
            {voteDetails.map((detail) => (
              <div key={detail.restaurantId} className="bg-white/10 p-3 rounded-lg">
                <p className="font-semibold text-sm mb-1">{detail.restaurant.name}</p>
                <div
                  className="w-full bg-black/30 rounded-full h-2"
                  role="img"
                  aria-label={`${detail.yesCount} yes, ${detail.noCount} no`}
                >
                  <div
                    className="bg-green-400 h-2 rounded-full"
                    style={{
                      width: `${(detail.yesCount / (detail.yesCount + detail.noCount)) * 100 || 0}%`,
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
    </nav>
  )
}
