'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { Restaurant } from '@/lib/types'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HostStatusPanel from '@/components/HostStatusPanel'
import { RefreshIcon, HourglassIcon } from '@/components/icons'
import { WinnerCard, MatchNavigation, NoMatchesState, VoteCount } from '@/components/results'

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
  const [allFinished, setAllFinished] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [showVoteBreakdown, setShowVoteBreakdown] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const [isReconfiguring, setIsReconfiguring] = useState(false)
  const [userStatus, setUserStatus] = useState<UserStatus[]>([])
  const [totalRestaurants, setTotalRestaurants] = useState(0)
  const [closingVoting, setClosingVoting] = useState(false)
  const [pollingStartTime] = useState(() => Date.now())
  const [showLongWaitPrompt, setShowLongWaitPrompt] = useState(false)

  // Fetch results from API
  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/session/${sessionCode}/results`)

      if (!response.ok) {
        setLoading(false)
        return
      }

      const data = await response.json()

      if (data.results === null || (data.message && data.message === 'No matches found')) {
        setNoResults(true)
        setLoading(false)
        return
      }

      setNoResults(false)

      if (data.results) {
        const { type, allVotes, yesCount, userCount } = data.results

        if (type === 'full-agreement') {
          setResultType('unanimous')
        } else if (type === 'best-match') {
          setResultType(yesCount === userCount ? 'majority' : 'best-match')
        }

        if (allVotes) {
          const voteCounts: VoteCount[] = allVotes.map((vote: any) => {
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

          const matchesWithVotes = voteCounts.filter(v => Object.keys(v.votes).length > 0)
          if (matchesWithVotes.length > 0) {
            const userCount = Object.keys(matchesWithVotes[0].votes).length
            const fullAgreementMatches = matchesWithVotes.filter(
              m => m.yesCount === userCount && Object.keys(m.votes).length === userCount
            )

            if (fullAgreementMatches.length > 0) {
              setWinner(fullAgreementMatches[0].restaurant)
            } else {
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

  // Update winner when currentMatchIndex changes
  useEffect(() => {
    const matchesWithVotes = voteDetails.filter(v => Object.keys(v.votes).length > 0)
    if (matchesWithVotes.length === 0) return

    const userCount = Object.keys(matchesWithVotes[0].votes).length
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

    if (winningMatches.length > 0 && currentMatchIndex < winningMatches.length) {
      setWinner(winningMatches[currentMatchIndex].restaurant)
    }
  }, [currentMatchIndex, voteDetails])

  // Poll for status and fetch results
  useEffect(() => {
    let interval: NodeJS.Timeout
    const FIVE_MINUTES = 5 * 60 * 1000
    const TEN_MINUTES = 10 * 60 * 1000

    const checkAndPollStatus = async () => {
      try {
        const elapsedTime = Date.now() - pollingStartTime

        if (elapsedTime >= FIVE_MINUTES && !showLongWaitPrompt) {
          setShowLongWaitPrompt(true)
        }

        const pollInterval = elapsedTime >= TEN_MINUTES ? 10000 : 3000

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

          if (data.allFinished && wasFinished !== true) {
            await fetchResults()
          }

          if (!data.allFinished) {
            interval = setTimeout(checkAndPollStatus, pollInterval)
          }
        }
      } catch {
        const elapsedTime = Date.now() - pollingStartTime
        const pollInterval = elapsedTime >= TEN_MINUTES ? 10000 : 3000
        interval = setTimeout(checkAndPollStatus, pollInterval)
      }
    }

    checkAndPollStatus()

    return () => {
      if (interval) clearTimeout(interval)
    }
  }, [sessionCode, allFinished, pollingStartTime, showLongWaitPrompt])

  // Poll for reconfiguring status (non-host users)
  useEffect(() => {
    if (isHost) return

    let interval: NodeJS.Timeout

    const checkForReconfigure = async () => {
      try {
        const response = await fetch(`/api/session/${sessionCode}/status`)
        if (response.ok) {
          const data = await response.json()

          if (data.status === 'reconfiguring') {
            setIsReconfiguring(true)
          } else if (data.status === 'active' && isReconfiguring) {
            setIsReconfiguring(false)
            onSessionReconfigured()
            return
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

  // Calculate winning matches
  const { currentMatch, totalMatches } = useMemo(() => {
    const matchesWithVotes = voteDetails.filter(v => Object.keys(v.votes).length > 0)
    let winningMatches: VoteCount[] = []

    if (matchesWithVotes.length > 0) {
      const userCount = Object.keys(matchesWithVotes[0].votes).length
      const fullAgreementMatches = matchesWithVotes.filter(
        m => m.yesCount === userCount && Object.keys(m.votes).length === userCount
      )

      if (fullAgreementMatches.length > 0) {
        winningMatches = fullAgreementMatches
      } else {
        const highestVoteCount = matchesWithVotes[0].yesCount
        winningMatches = matchesWithVotes.filter(m => m.yesCount === highestVoteCount)
      }
    }

    return {
      currentMatch: winningMatches[currentMatchIndex],
      totalMatches: winningMatches.length,
    }
  }, [voteDetails, currentMatchIndex])

  // Show waiting state if host is reconfiguring
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

  // Show waiting state if not everyone finished
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

            {isHost && userStatus.length > 0 && (
              <div className="mt-6">
                <HostStatusPanel
                  userStatus={userStatus}
                  totalRestaurants={totalRestaurants}
                  pollingStartTime={pollingStartTime}
                />

                {showLongWaitPrompt && (
                  <div className="bg-amber-500 bg-opacity-30 border border-amber-400 border-opacity-50 rounded-lg p-3 mb-3">
                    <p className="text-white text-sm font-medium">
                      ⏰ It&apos;s been a while. Someone may have left the session.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleCloseVoting}
                  disabled={closingVoting}
                  className={`w-full mt-4 font-semibold py-3 rounded-lg transition disabled:opacity-50 ${
                    showLongWaitPrompt
                      ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                      : 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white'
                  }`}
                >
                  {closingVoting ? 'Closing...' : 'Close Voting & See Results'}
                </button>
                <p className="text-white text-opacity-60 text-xs mt-2">
                  {showLongWaitPrompt
                    ? 'Close voting now to see results with current votes'
                    : 'End voting early if someone left'}
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
      <NoMatchesState
        sessionCode={sessionCode}
        isHost={isHost}
        onReconfigure={onReconfigure}
        onLeaveSession={onLeaveSession}
      />
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
          <MatchNavigation
            currentIndex={currentMatchIndex}
            totalMatches={totalMatches}
            currentMatch={currentMatch}
            voteDetails={voteDetails}
            showVoteBreakdown={showVoteBreakdown}
            onPrevious={() => setCurrentMatchIndex(prev => Math.max(0, prev - 1))}
            onNext={() => setCurrentMatchIndex(prev => Math.min(totalMatches - 1, prev + 1))}
            onToggleBreakdown={() => setShowVoteBreakdown(!showVoteBreakdown)}
          />

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
