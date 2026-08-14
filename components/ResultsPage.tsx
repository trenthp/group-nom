'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePollingWithVisibility } from '@/hooks/usePollingWithVisibility'
import Image from 'next/image'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { Restaurant } from '@/lib/types'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HostStatusPanel from '@/components/HostStatusPanel'
import { Button } from '@/components/ui'
import { WinnerCard, MatchNavigation, NoMatchesState, WaitingCard } from '@/components/results'
import { RefreshIcon, HourglassIcon } from '@/components/icons'

interface UserStatus {
  userIndex: number
  finished: boolean
  voteCount: number
  isHost: boolean
}

interface ResultsPageProps {
  sessionCode: string
  restaurants: Restaurant[]
  isHost: boolean
  onNewSession: () => void
  onReconfigure: () => void
  onLeaveSession: () => void
  onSessionReconfigured: () => void
  sessionCreatedAt?: number
}

interface VoteCount {
  restaurantId: string
  restaurant: Restaurant
  yesCount: number
  noCount: number
  votes: { [key: string]: boolean }
}

export default function ResultsPage({
  sessionCode,
  restaurants: _restaurants,
  isHost,
  onNewSession,
  onReconfigure,
  onLeaveSession,
  onSessionReconfigured,
  sessionCreatedAt,
}: ResultsPageProps) {
  const { isSignedIn, isLoaded } = useUser()
  const [winner, setWinner] = useState<Restaurant | null>(null)
  const [voteDetails, setVoteDetails] = useState<VoteCount[]>([])
  const [resultType, setResultType] = useState<string>('')
  const [allFinished, setAllFinished] = useState<boolean | null>(null) // null = not yet checked
  const [loading, setLoading] = useState(true)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [noResults, setNoResults] = useState(false)
  const [isReconfiguring, setIsReconfiguring] = useState(false)
  const [userStatus, setUserStatus] = useState<UserStatus[]>([])
  const [totalRestaurants, setTotalRestaurants] = useState(0)
  const [closingVoting, setClosingVoting] = useState(false)

  // Fetch results from API
  const fetchResults = useCallback(async () => {
    try {
      const response = await fetch(`/api/session/${sessionCode}/results`)

      if (!response.ok) {
        setLoading(false)
        return
      }

      const data = await response.json()

      // Check if there are no results (everyone voted no)
      if (data.results === null || (data.message && data.message === 'No matches found')) {
        setNoResults(true)
        setLoading(false)
        return
      }

      // Reset noResults in case a previous fetch set it (e.g., before all users finished)
      setNoResults(false)

      if (data.results) {
        const { type, restaurant: _restaurant, allVotes, yesCount, userCount } = data.results

        // Set result type
        if (type === 'full-agreement') {
          setResultType('unanimous')
        } else if (type === 'best-match') {
          setResultType(yesCount === userCount ? 'majority' : 'best-match')
        }

        // Transform allVotes to VoteCount format
        if (allVotes) {
          const voteCounts: VoteCount[] = allVotes.map((vote: any) => {
            // Count actual "no" votes (false values in userVotes)
            const noCount = Object.values(vote.userVotes).filter((liked: any) => liked === false).length

            return {
              restaurantId: vote.restaurant.id,
              restaurant: vote.restaurant,
              yesCount: vote.yesCount,
              noCount: noCount,
              votes: vote.userVotes,
            }
          })
          setVoteDetails(voteCounts)

          // Set initial winner from winning matches only
          const matchesWithVotes = voteCounts.filter(v => Object.keys(v.votes).length > 0)

          if (matchesWithVotes.length > 0) {
            const userCount = Object.keys(matchesWithVotes[0].votes).length

            // Check for full agreement
            const fullAgreementMatches = matchesWithVotes.filter(
              m => m.yesCount === userCount && Object.keys(m.votes).length === userCount
            )

            if (fullAgreementMatches.length > 0) {
              setWinner(fullAgreementMatches[0].restaurant)
            } else {
              // No full agreement - use highest vote count
              const highestVoteCount = matchesWithVotes[0].yesCount
              const topMatch = matchesWithVotes.find(m => m.yesCount === highestVoteCount)
              if (topMatch) {
                setWinner(topMatch.restaurant)
              }
            }
          }
        }
      }

      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [sessionCode])

  // Results are fetched when status check confirms allFinished
  // No need to fetch on mount - status check will trigger it

  // Update winner when currentMatchIndex changes
  useEffect(() => {
    const matchesWithVotes = voteDetails.filter(v => Object.keys(v.votes).length > 0)

    if (matchesWithVotes.length === 0) return

    // Get user count
    const userCount = Object.keys(matchesWithVotes[0].votes).length

    // Determine winning matches (full agreement or tied for highest)
    let winningMatches: VoteCount[] = []

    const fullAgreementMatches = matchesWithVotes.filter(
      m => m.yesCount === userCount && Object.keys(m.votes).length === userCount
    )

    if (fullAgreementMatches.length > 0) {
      winningMatches = fullAgreementMatches
    } else {
      const highestVoteCount = matchesWithVotes[0].yesCount
      winningMatches = matchesWithVotes.filter(m => m.yesCount === highestVoteCount)
    }

    // Set winner from winning matches
    if (winningMatches.length > 0 && currentMatchIndex < winningMatches.length) {
      setWinner(winningMatches[currentMatchIndex].restaurant)
    }
  }, [currentMatchIndex, voteDetails])

  // Check if all users finished and poll for updates (pauses when tab is hidden)
  const checkAndPollStatus = useCallback(async () => {
    try {
      // Fetch session data to get userStatus
      const sessionResponse = await fetch(`/api/session/${sessionCode}`)
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json()
        if (sessionData.session?.userStatus) {
          setUserStatus(sessionData.session.userStatus)
          setTotalRestaurants(sessionData.session.totalRestaurants || 0)
        }
      }

      const response = await fetch(`/api/session/${sessionCode}/status`)
      if (response.ok) {
        const data = await response.json()
        setAllFinished(data.allFinished)

        // If just became finished, fetch results
        if (data.allFinished) {
          await fetchResults()
        }
      }
    } catch {
      // Silent retry on next poll
    }
  }, [sessionCode, fetchResults])

  usePollingWithVisibility(checkAndPollStatus, {
    intervalMs: 3000,
    enabled: allFinished !== true,
    immediate: true,
    sessionStartTime: sessionCreatedAt,
  })

  // Poll for reconfiguring status (non-host users, pauses when tab is hidden)
  const checkForReconfigure = useCallback(async () => {
    try {
      const response = await fetch(`/api/session/${sessionCode}/status`)
      if (response.ok) {
        const data = await response.json()

        if (data.status === 'reconfiguring') {
          setIsReconfiguring(true)
        } else if (data.status === 'active' && isReconfiguring) {
          // Session was reconfigured and is now active again
          setIsReconfiguring(false)
          onSessionReconfigured()
        }
      }
    } catch {
      // Silent retry on next poll
    }
  }, [sessionCode, isReconfiguring, onSessionReconfigured])

  usePollingWithVisibility(checkForReconfigure, {
    intervalMs: 2000,
    enabled: !isHost,
    immediate: true,
    sessionStartTime: sessionCreatedAt,
  })

  const handleCloseVoting = async () => {
    setClosingVoting(true)
    try {
      const userId = localStorage.getItem(`user-${sessionCode}`)
      const response = await fetch(`/api/session/${sessionCode}/close-voting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (response.ok) {
        setAllFinished(true)
        await fetchResults()
      }
    } catch {
      // Error closing voting
    } finally {
      setClosingVoting(false)
    }
  }

  const resultMessage =
    resultType === 'unanimous'
      ? "Everyone agrees!"
      : resultType === 'majority'
        ? "Majority match!"
        : "It's a match!"

  // Get winning matches only (full agreement or tied for highest votes)
  const matchesWithVotes = voteDetails.filter(v => Object.keys(v.votes).length > 0)

  // Determine which matches qualify as "winners"
  let winningMatches: VoteCount[] = []

  if (matchesWithVotes.length > 0) {
    // Get user count from the first match that has votes
    const userCount = Object.keys(matchesWithVotes[0].votes).length

    // First, check for full agreement matches (all users said yes)
    const fullAgreementMatches = matchesWithVotes.filter(
      m => m.yesCount === userCount && Object.keys(m.votes).length === userCount
    )

    if (fullAgreementMatches.length > 0) {
      // Only show full agreement matches
      winningMatches = fullAgreementMatches
    } else {
      // No full agreement - find highest vote count
      const highestVoteCount = matchesWithVotes[0].yesCount // Already sorted by yesCount

      // Only show restaurants tied at the highest vote count
      winningMatches = matchesWithVotes.filter(m => m.yesCount === highestVoteCount)
    }
  }

  const totalMatches = winningMatches.length
  const currentMatch = winningMatches[currentMatchIndex]
  const hasPrevious = currentMatchIndex > 0
  const hasNext = currentMatchIndex < totalMatches - 1

  const handlePreviousMatch = () => {
    if (hasPrevious) {
      setCurrentMatchIndex(currentMatchIndex - 1)
    }
  }

  const handleNextMatch = () => {
    if (hasNext) {
      setCurrentMatchIndex(currentMatchIndex + 1)
    }
  }

  // Show waiting state if host is reconfiguring the session
  if (isReconfiguring) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600">
        <Header sessionCode={sessionCode} />
        <div className="flex flex-col items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 56px)' }}>
          <div className="w-full max-w-md text-center">
            <WaitingCard
              icon={<RefreshIcon size={64} className="text-white" />}
              title="Host is changing the vibe..."
              message="New options incoming. Stay hungry."
            />
          </div>
        </div>
      </div>
    )
  }

  // Show waiting state if not everyone finished (but only after we've checked)
  if (allFinished === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600">
        <Header sessionCode={sessionCode} />
        <div className="flex flex-col items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 56px)' }}>
          <div className="w-full max-w-md text-center">
            <WaitingCard
              icon={<HourglassIcon size={64} className="text-white" />}
              title="Waiting on your friends..."
              message="You've made your choices. Now we wait."
            />

            {/* Host Status Panel */}
            {isHost && userStatus.length > 0 && (
              <div className="mt-6">
                <HostStatusPanel
                  userStatus={userStatus}
                  totalRestaurants={totalRestaurants}
                />

                <Button
                  variant="glass"
                  onClick={handleCloseVoting}
                  disabled={closingVoting}
                  className="w-full mt-4 rounded-lg py-3"
                >
                  {closingVoting ? 'Closing...' : 'Close Voting & See Results'}
                </Button>
                <p className="text-white/60 text-xs mt-2">
                  End voting early if someone left
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center p-4">
        <div className="text-center">
          <Image
            src="/logo_groupNom.svg"
            alt="Group Nom"
            width={64}
            height={64}
            className="mx-auto rounded-xl mb-4 animate-spin"
          />
          <p className="text-white text-lg">Calculating results...</p>
        </div>
      </div>
    )
  }

  if (noResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600">
        <Header sessionCode={sessionCode} />
        <div className="flex flex-col items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 56px)' }}>
          <NoMatchesState
            isHost={isHost}
            onReconfigure={onReconfigure}
            onLeaveSession={onLeaveSession}
          />
          <div className="w-full max-w-md">
            <Footer />
          </div>
        </div>
      </div>
    )
  }

  if (!winner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center p-4">
        <div className="text-center">
          <Image
            src="/logo_groupNom.svg"
            alt="Group Nom"
            width={64}
            height={64}
            className="mx-auto rounded-xl mb-4 animate-spin"
          />
          <p className="text-white text-lg">Calculating results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600">
      <Header sessionCode={sessionCode} />
      <div className="flex flex-col items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <div className="w-full max-w-md">
          {/* Winner Card */}
          <div className="mb-8">
            <WinnerCard winner={winner} resultMessage={resultMessage} />
          </div>

          {/* Match Navigation */}
          {totalMatches > 1 && (
            <MatchNavigation
              currentIndex={currentMatchIndex}
              totalMatches={totalMatches}
              currentYesCount={currentMatch?.yesCount}
              onPrevious={handlePreviousMatch}
              onNext={handleNextMatch}
              voteDetails={matchesWithVotes
                .slice()
                .sort((a, b) => b.yesCount - a.yesCount)}
            />
          )}

          {/* Conversion Prompt for Anonymous Users */}
          {isLoaded && !isSignedIn && (
            <div className="bg-surface-card rounded-xl p-5 mb-6 border border-white/10">
              <div className="mb-4">
                <h4 className="font-bold text-white text-lg mb-1">
                  Want more from Group Nom?
                </h4>
                <p className="text-white/60 text-sm">
                  Create a free account to unlock the full experience
                </p>
              </div>

              {/* Benefits list */}
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-white/80 text-sm">
                  <span className="text-brand">✓</span>
                  Save your favorite restaurants
                </li>
                <li className="flex items-center gap-2 text-white/80 text-sm">
                  <span className="text-brand">✓</span>
                  Discover new spots on your own
                </li>
                <li className="flex items-center gap-2 text-white/80 text-sm">
                  <span className="text-brand">✓</span>
                  Create & manage your own groups
                </li>
                <li className="flex items-center gap-2 text-white/80 text-sm">
                  <span className="text-brand">✓</span>
                  See what locals love near you
                </li>
                <li className="flex items-center gap-2 text-white/80 text-sm">
                  <span className="text-brand">✓</span>
                  Boost your local favorites for others to discover
                </li>
              </ul>

              <Link
                href="/sign-up"
                className="block w-full bg-brand text-white font-semibold py-3 rounded-lg text-center hover:bg-brand-hover transition"
              >
                Create Free Account
              </Link>
            </div>
          )}

          {/* Actions - only for signed in users */}
          {isSignedIn && (
            isHost ? (
              <Button variant="inverse" size="lg" className="w-full" onClick={onNewSession}>
                Start New Group
              </Button>
            ) : (
              <Button variant="inverse" size="lg" className="w-full" onClick={onLeaveSession}>
                Leave Group
              </Button>
            )
          )}

          <Footer />
        </div>
      </div>
    </div>
  )
}
