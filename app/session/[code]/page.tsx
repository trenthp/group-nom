'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Restaurant } from '@/lib/types'
import RestaurantCard from '@/components/RestaurantCard'
import ResultsPage from '@/components/ResultsPage'
import Header from '@/components/Header'
import WaitingScreen from '@/components/WaitingScreen'

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionCode = params.code as string

  const [userId, setUserId] = useState<string>('')
  const [hostId, setHostId] = useState<string>('')
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showingResults, setShowingResults] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionStatus, setSessionStatus] = useState<'pending' | 'active' | 'finished' | 'reconfiguring' | null>(null)

  // Initialize user and fetch session
  useEffect(() => {
    const initSession = async () => {
      try {
        // Get or create user ID
        const storedUserId = localStorage.getItem(`user-${sessionCode}`)
        const newUserId = storedUserId || `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

        if (!storedUserId) {
          localStorage.setItem(`user-${sessionCode}`, newUserId)
        }

        setUserId(newUserId)

        // Fetch session data from API
        const response = await fetch(`/api/session/${sessionCode}?userId=${newUserId}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('Group not found. The host needs to complete the setup first.')
            setLoading(false)
            return
          }
          throw new Error('Failed to fetch session')
        }

        const data = await response.json()

        // Set hostId from session data
        if (data.session.hostId) {
          setHostId(data.session.hostId)
        }

        // Check session status (default to 'active' for backward compatibility)
        const status = data.session.status || 'active'
        setSessionStatus(status)

        if (status === 'active') {
          setRestaurants(data.session.restaurants)
          // If no restaurants found from search, go straight to results (shows "no matches" screen)
          if (!data.session.restaurants || data.session.restaurants.length === 0) {
            setShowingResults(true)
          }
          setLoading(false)
        } else if (status === 'pending') {
          // Session is pending, keep loading state until it becomes active
          setLoading(false)
        } else if (status === 'finished') {
          // Session is finished, show results directly
          setRestaurants(data.session.restaurants)
          setShowingResults(true)
          setLoading(false)
        }
      } catch {
        setError('Failed to load group. Please try again.')
        setLoading(false)
      }
    }

    initSession()
  }, [sessionCode])

  // Poll for session status when pending
  useEffect(() => {
    if (sessionStatus !== 'pending' || !userId) return

    const pollSessionReady = async () => {
      try {
        const response = await fetch(`/api/session/${sessionCode}?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()

          if (data.session.status === 'active') {
            // Session is now active, show restaurants
            setSessionStatus('active')
            setRestaurants(data.session.restaurants)
            // If no restaurants found, go straight to results (shows "no matches" screen)
            if (!data.session.restaurants || data.session.restaurants.length === 0) {
              setShowingResults(true)
            }
          }
        }
      } catch {
        // Silent retry on error
      }
    }

    // Poll every 2 seconds
    const interval = setInterval(pollSessionReady, 2000)

    return () => clearInterval(interval)
  }, [sessionStatus, sessionCode, userId])

  // Poll for session status during active voting to detect if session becomes finished
  useEffect(() => {
    if (sessionStatus !== 'active' || !userId || showingResults) return

    const pollForFinished = async () => {
      try {
        const response = await fetch(`/api/session/${sessionCode}?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()

          // If session became finished, show results
          if (data.session.status === 'finished') {
            setSessionStatus('finished')
            setShowingResults(true)
          }
        }
      } catch {
        // Silent retry on error
      }
    }

    // Poll every 3 seconds
    const interval = setInterval(pollForFinished, 3000)

    return () => clearInterval(interval)
  }, [sessionStatus, sessionCode, userId, showingResults])


  const handleVote = useCallback(
    async (restaurantId: string, liked: boolean) => {
      try {
        // Send vote to API
        const response = await fetch(`/api/session/${sessionCode}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, restaurantId, liked }),
        })

        if (!response.ok) {
          throw new Error('Failed to save vote')
        }

        const data = await response.json()

        // Move to next restaurant or show results
        if (currentIndex < restaurants.length - 1) {
          setCurrentIndex(currentIndex + 1)
        } else {
          // User finished voting
          // If all users finished (e.g., single user or everyone done), mark session as finished
          if (data.allFinished) {
            setSessionStatus('finished')
          }
          setShowingResults(true)
        }
      } catch {
        // Still move to next restaurant even if vote fails
        if (currentIndex < restaurants.length - 1) {
          setCurrentIndex(currentIndex + 1)
        } else {
          setShowingResults(true)
        }
      }
    },
    [currentIndex, restaurants.length, sessionCode, userId]
  )

  const handleYes = () => {
    if (currentIndex < restaurants.length) {
      handleVote(restaurants[currentIndex].id, true)
    }
  }

  const handleNo = () => {
    if (currentIndex < restaurants.length) {
      handleVote(restaurants[currentIndex].id, false)
    }
  }

  const handleNewSession = () => {
    window.location.href = '/setup'
  }

  const handleReconfigure = async () => {
    // Set session to reconfiguring state so other users see waiting screen
    try {
      await fetch(`/api/session/${sessionCode}/set-reconfiguring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
    } catch {
      // Continue even if this fails
    }
    window.location.href = `/setup?reconfigure=${sessionCode}`
  }

  const handleLeaveSession = () => {
    window.location.href = '/'
  }

  const handleSessionReconfigured = useCallback(async () => {
    // Refetch session data to get new restaurants
    try {
      const response = await fetch(`/api/session/${sessionCode}?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setRestaurants(data.session.restaurants)
        setCurrentIndex(0)
        setSessionStatus('active')
        // If no restaurants found, go straight to results (shows "no matches" screen)
        if (!data.session.restaurants || data.session.restaurants.length === 0) {
          setShowingResults(true)
        } else {
          setShowingResults(false)
        }
      }
    } catch {
      // On error, just reset to voting view with existing restaurants
      setCurrentIndex(0)
      setShowingResults(false)
      setSessionStatus('active')
    }
  }, [sessionCode, userId])

  const isHost = userId === hostId

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
          <p className="text-white text-lg">Loading group...</p>
        </div>
      </div>
    )
  }

  // Show waiting screen if session is pending
  if (sessionStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600">
        <Header sessionCode={sessionCode} />
        <WaitingScreen code={sessionCode} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-white text-lg mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-white text-orange-600 font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  if (showingResults) {
    return (
      <ResultsPage
        sessionCode={sessionCode}
        userId={userId}
        restaurants={restaurants}
        isHost={isHost}
        onNewSession={handleNewSession}
        onReconfigure={handleReconfigure}
        onLeaveSession={handleLeaveSession}
        onSessionReconfigured={handleSessionReconfigured}
      />
    )
  }

  const currentRestaurant = restaurants[currentIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600">
      <Header sessionCode={sessionCode} />
      <div className="flex flex-col items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 56px)' }}>
        {currentRestaurant ? (
          <div className="w-full max-w-md">
            <RestaurantCard
              restaurant={currentRestaurant}
              onYes={handleYes}
              onNo={handleNo}
              progress={`${currentIndex + 1} / ${restaurants.length}`}
            />
          </div>
        ) : (
          <div className="text-white text-center">
            <p>No restaurants available</p>
          </div>
        )}
      </div>
    </div>
  )
}
