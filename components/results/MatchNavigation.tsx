'use client'

import { VoteCount, VoteBreakdown } from './VoteBreakdown'

export interface MatchNavigationProps {
  currentIndex: number
  totalMatches: number
  currentMatch?: VoteCount
  voteDetails: VoteCount[]
  showVoteBreakdown: boolean
  onPrevious: () => void
  onNext: () => void
  onToggleBreakdown: () => void
}

export function MatchNavigation({
  currentIndex,
  totalMatches,
  currentMatch,
  voteDetails,
  showVoteBreakdown,
  onPrevious,
  onNext,
  onToggleBreakdown,
}: MatchNavigationProps) {
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < totalMatches - 1

  if (totalMatches <= 1) return null

  return (
    <nav
      className="bg-white bg-opacity-20 backdrop-blur rounded-xl p-4 mb-6 text-white"
      aria-label="Match navigation"
    >
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          aria-label="View previous match"
          className="bg-white bg-opacity-20 hover:bg-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-semibold transition"
        >
          ← Previous
        </button>

        <div className="text-center" aria-live="polite">
          <p className="text-sm opacity-80">Match</p>
          <p className="text-2xl font-bold">
            {currentIndex + 1} / {totalMatches}
          </p>
          {currentMatch && (
            <p className="text-xs opacity-70 mt-1">
              {currentMatch.yesCount}{' '}
              {currentMatch.yesCount === 1 ? 'vote' : 'votes'}
            </p>
          )}
        </div>

        <button
          onClick={onNext}
          disabled={!hasNext}
          aria-label="View next match"
          className="bg-white bg-opacity-20 hover:bg-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-semibold transition"
        >
          Next →
        </button>
      </div>

      <VoteBreakdown
        voteDetails={voteDetails}
        isExpanded={showVoteBreakdown}
        onToggle={onToggleBreakdown}
      />
    </nav>
  )
}
