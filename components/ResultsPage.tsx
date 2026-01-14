'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { Restaurant } from '@/lib/types'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HostStatusPanel from '@/components/HostStatusPanel'
import {
  RefreshIcon,
  HourglassIcon,
  SadFaceIcon,
  ConfettiIcon,
  StarIcon,
  CompassIcon,
  LocationIcon,
  PhoneIcon,
  GlobeIcon,
} from '@/components/icons'

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
}: ResultsPageProps) {
  const { isSignedIn, isLoaded } = useUser()
  const [winner, setWinner] = useState<Restaurant | null>(null)
  const [voteDetails, setVoteDetails] = useState<VoteCount[]>([])
  const [resultType, setResultType] = useState<string>('')
  const [allFinished, setAllFinished] = useState<boolean | null>(null) // null = not yet checked
  const [loading, setLoading] = useState(true)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [showVoteBreakdown, setShowVoteBreakdown] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const [isReconfiguring, setIsReconfiguring] = useState(false)
  const [userStatus, setUserStatus] = useState<UserStatus[]>([])
  const [totalRestaurants, setTotalRestaurants] = useState(0)
  const [closingVoting, setClosingVoting] = useState(false)

  // Fetch results from API
  const fetchResults = async () => {
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
  }

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

  // Check if all users finished and poll for updates (also fetches userStatus for host)
  useEffect(() => {
    let interval: NodeJS.Timeout

    const checkAndPollStatus = async () => {
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
          const wasFinished = allFinished
          setAllFinished(data.allFinished)

          // If just became finished (or first check shows finished), fetch results
          if (data.allFinished && wasFinished !== true) {
            await fetchResults()
          }

          // Only continue polling if not all finished
          if (!data.allFinished) {
            interval = setTimeout(checkAndPollStatus, 3000)
          }
        }
      } catch {
        // Retry on error
        interval = setTimeout(checkAndPollStatus, 3000)
      }
    }

    // Check immediately
    checkAndPollStatus()

    return () => {
      if (interval) clearTimeout(interval)
    }
  }, [sessionCode, allFinished])

  // Poll for reconfiguring status (non-host users)
  useEffect(() => {
    if (isHost) return // Host doesn't need to poll - they're doing the reconfiguring

    let interval: NodeJS.Timeout

    const checkForReconfigure = async () => {
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
            return // Stop polling
          }
        }
      } catch {
        // Silent retry
      }

      interval = setTimeout(checkForReconfigure, 2000)
    }

    checkForReconfigure()

    return () => {
      if (interval) clearTimeout(interval)
    }
  }, [sessionCode, isHost, isReconfiguring, onSessionReconfigured])

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
            <div className="bg-white bg-opacity-20 backdrop-blur rounded-2xl p-8">
              <div className="mb-6 animate-bounce flex justify-center">
                <RefreshIcon size={64} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Host is changing the vibe...
              </h2>
              <p className="text-orange-100 text-lg">
                New options incoming. Stay hungry.
              </p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-white rounded-full animate-pulse delay-100"></div>
                <div className="w-3 h-3 bg-white rounded-full animate-pulse delay-200"></div>
              </div>
            </div>
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
            <div className="bg-white bg-opacity-20 backdrop-blur rounded-2xl p-8">
              <div className="mb-6 animate-bounce flex justify-center">
                <HourglassIcon size={64} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Waiting on your friends...
              </h2>
              <p className="text-orange-100 text-lg">
                You've made your choices. Now we wait.
              </p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-white rounded-full animate-pulse delay-100"></div>
                <div className="w-3 h-3 bg-white rounded-full animate-pulse delay-200"></div>
              </div>
            </div>

            {/* Host Status Panel */}
            {isHost && userStatus.length > 0 && (
              <div className="mt-6">
                <HostStatusPanel
                  userStatus={userStatus}
                  totalRestaurants={totalRestaurants}
                />

                <button
                  onClick={handleCloseVoting}
                  disabled={closingVoting}
                  className="w-full mt-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {closingVoting ? 'Closing...' : 'Close Voting & See Results'}
                </button>
                <p className="text-white text-opacity-60 text-xs mt-2">
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
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center mb-6">
              <div className="mb-4 flex justify-center">
                <SadFaceIcon size={64} className="text-gray-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                No Matches Found
              </h2>
              <p className="text-gray-600 mb-2">
                Looks like the spark wasn't there.
              </p>
              <p className="text-gray-600 mb-6">
                {isHost ? "Try again. Maybe lower your standards?" : "Waiting on the host to try again."}
              </p>
            </div>

            {isHost ? (
              <button
                onClick={onReconfigure}
                className="w-full bg-white text-orange-600 font-semibold py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition"
              >
                Try Different Settings
              </button>
            ) : (
              <button
                onClick={onLeaveSession}
                className="w-full bg-white text-orange-600 font-semibold py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition"
              >
                Leave Group
              </button>
            )}

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
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-8 transform scale-100 bounce-winner">
          {/* Image */}
          {winner?.imageUrl ? (
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
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              {winner?.name}
            </h2>

            {winner?.address && (
              <p className="text-gray-600 mb-4">{winner.address}</p>
            )}

            <div className="bg-green-100 text-green-800 px-4 py-3 rounded-lg mb-6 font-bold">
              {resultMessage}
            </div>

            <div className="space-y-3 mb-6">
              {winner?.rating && (
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

              {winner?.priceLevel && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Price</span>
                  <span className="font-semibold text-gray-800">
                    {winner.priceLevel}
                  </span>
                </div>
              )}

              {winner?.cuisines && winner.cuisines.length > 0 && (
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
              {winner && (
                <a
                  href={winner.id.startsWith('ChIJ')
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
              )}

              {winner && (
                <a
                  href={winner.id.startsWith('ChIJ')
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
              )}
            </div>

            {/* Secondary Actions */}
            {(winner?.phone || winner?.website) && (
              <div className="space-y-2 pt-2 border-t border-gray-200">
                {winner?.phone && (
                  <a
                    href={`tel:${winner.phone}`}
                    className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-200 transition text-sm"
                  >
                    <PhoneIcon size={16} />
                    Call Restaurant
                  </a>
                )}

                {winner?.website && (
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

        {/* Match Navigation */}
        {totalMatches > 1 && (
          <nav className="bg-white bg-opacity-20 backdrop-blur rounded-xl p-4 mb-6 text-white" aria-label="Match navigation">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePreviousMatch}
                disabled={!hasPrevious}
                aria-label="View previous match"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-semibold transition"
              >
                ← Previous
              </button>

              <div className="text-center" aria-live="polite">
                <p className="text-sm opacity-80">Match</p>
                <p className="text-2xl font-bold">
                  {currentMatchIndex + 1} / {totalMatches}
                </p>
                {currentMatch && (
                  <p className="text-xs opacity-70 mt-1">
                    {currentMatch.yesCount} {currentMatch.yesCount === 1 ? 'vote' : 'votes'}
                  </p>
                )}
              </div>

              <button
                onClick={handleNextMatch}
                disabled={!hasNext}
                aria-label="View next match"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-semibold transition"
              >
                Next →
              </button>
            </div>

            {/* Vote Breakdown Accordion */}
            <div className="border-t border-white border-opacity-20 pt-4">
              <button
                onClick={() => setShowVoteBreakdown(!showVoteBreakdown)}
                aria-expanded={showVoteBreakdown}
                aria-controls="vote-breakdown-content"
                className="w-full flex items-center justify-between text-sm font-semibold hover:opacity-80 transition"
              >
                <span>Vote Breakdown</span>
                <span className="text-lg" aria-hidden="true">{showVoteBreakdown ? '▲' : '▼'}</span>
              </button>

              {showVoteBreakdown && (
                <div id="vote-breakdown-content" className="mt-3 space-y-2">
                  {voteDetails
                    .filter((v) => Object.keys(v.votes).length > 0)
                    .sort((a, b) => b.yesCount - a.yesCount)
                    .map((detail) => (
                      <div
                        key={detail.restaurantId}
                        className="bg-white bg-opacity-10 p-3 rounded-lg"
                      >
                        <p className="font-semibold text-sm mb-1">{detail.restaurant.name}</p>
                        <div className="w-full bg-black bg-opacity-30 rounded-full h-2">
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
        )}

          {/* Conversion Prompt for Anonymous Users */}
          {isLoaded && !isSignedIn && (
            <div className="bg-[#333333] rounded-xl p-5 mb-6 border border-white/10">
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
                  <span className="text-[#EA4D19]">✓</span>
                  Save your favorite restaurants
                </li>
                <li className="flex items-center gap-2 text-white/80 text-sm">
                  <span className="text-[#EA4D19]">✓</span>
                  Discover new spots on your own
                </li>
                <li className="flex items-center gap-2 text-white/80 text-sm">
                  <span className="text-[#EA4D19]">✓</span>
                  Create & manage your own groups
                </li>
                <li className="flex items-center gap-2 text-white/80 text-sm">
                  <span className="text-[#EA4D19]">✓</span>
                  See what locals love near you
                </li>
                <li className="flex items-center gap-2 text-white/80 text-sm">
                  <span className="text-[#EA4D19]">✓</span>
                  Boost your local favorites for others to discover
                </li>
              </ul>

              <Link
                href="/sign-up"
                className="block w-full bg-[#EA4D19] text-white font-semibold py-3 rounded-lg text-center hover:bg-orange-600 transition"
              >
                Create Free Account
              </Link>
            </div>
          )}

          {/* Actions - only for signed in users */}
          {isSignedIn && (
            isHost ? (
              <button
                onClick={onNewSession}
                className="w-full bg-white text-orange-600 font-semibold py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition"
              >
                Start New Group
              </button>
            ) : (
              <button
                onClick={onLeaveSession}
                className="w-full bg-white text-orange-600 font-semibold py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition"
              >
                Leave Group
              </button>
            )
          )}

          <Footer />
        </div>
      </div>
    </div>
  )
}
