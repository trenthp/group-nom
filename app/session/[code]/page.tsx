'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Restaurant } from '@/lib/types'
import RestaurantCard from '@/components/RestaurantCard'
import ResultsPage from '@/components/ResultsPage'
import ShareCode from '@/components/ShareCode'
import WaitingScreen from '@/components/WaitingScreen'

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionCode = params.code as string

  const [userId, setUserId] = useState<string>('')
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showingResults, setShowingResults] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionStatus, setSessionStatus] = useState<'pending' | 'active' | 'finished' | null>(null)

  // Initialize user and fetch session
  useEffect(() => {
    const initSession = async () => {
      try {
        // Get or create user ID
        const storedUserId = localStorage.getItem(`user-${sessionCode}`)
        const newUserId = storedUserId || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        if (!storedUserId) {
          localStorage.setItem(`user-${sessionCode}`, newUserId)
        }

        setUserId(newUserId)

        // Fetch session data from API
        console.log('Fetching session:', sessionCode, 'for user:', newUserId)

        const response = await fetch(`/api/session/${sessionCode}?userId=${newUserId}`)

        console.log('Fetch session response status:', response.status)

        if (!response.ok) {
          if (response.status === 404) {
            console.error('Session not found:', sessionCode)
            setError('Session not found. The host needs to complete the setup first.')
            setLoading(false)
            return
          }
          throw new Error('Failed to fetch session')
        }

        const data = await response.json()
        console.log('Session data loaded:', data)

        // Check session status (default to 'active' for backward compatibility)
        const status = data.session.status || 'active'
        setSessionStatus(status)

        if (status === 'active') {
          setRestaurants(data.session.restaurants)
          setLoading(false)
        } else if (status === 'pending') {
          // Session is pending, keep loading state until it becomes active
          console.log('Session is pending, will poll for updates')
          setLoading(false)
        } else if (status === 'finished') {
          // Session is finished, show results directly
          console.log('Session is finished, showing results')
          setRestaurants(data.session.restaurants)
          setShowingResults(true)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error initializing session:', err)
        setError('Failed to load session. Please try again.')
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
          console.log('Polling session status:', data.session.status)

          if (data.session.status === 'active') {
            // Session is now active, reload the page to show restaurants
            console.log('Session is now active!')
            setSessionStatus('active')
            setRestaurants(data.session.restaurants)
          }
        }
      } catch (err) {
        console.error('Error polling session status:', err)
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
            console.log('Session has finished, showing results')
            setSessionStatus('finished')
            setShowingResults(true)
          }
        }
      } catch (err) {
        console.error('Error polling for finished status:', err)
      }
    }

    // Poll every 3 seconds
    const interval = setInterval(pollForFinished, 3000)

    return () => clearInterval(interval)
  }, [sessionStatus, sessionCode, userId, showingResults])

  // Poll for session status when showing results
  useEffect(() => {
    if (!showingResults || !userId) return

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/session/${sessionCode}/status?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          // Keep polling - results page will handle showing matches
          console.log('Session status:', data)
        }
      } catch (err) {
        console.error('Error polling status:', err)
      }
    }

    // Poll immediately
    pollStatus()

    // Poll every 3 seconds
    const interval = setInterval(pollStatus, 3000)

    return () => clearInterval(interval)
  }, [showingResults, sessionCode, userId])

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
            console.log('All users finished! Marking session as finished.')
            setSessionStatus('finished')
          }
          setShowingResults(true)
        }
      } catch (err) {
        console.error('Error saving vote:', err)
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
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    window.location.href = `/session/${newCode}/setup`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🍽️</div>
          <p className="text-white text-lg">Loading session...</p>
        </div>
      </div>
    )
  }

  // Show waiting screen if session is pending
  if (sessionStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600">
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
            className="bg-white text-orange-600 font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition"
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
        restaurants={restaurants}
        onNewSession={handleNewSession}
      />
    )
  }

  const currentRestaurant = restaurants[currentIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex flex-col items-center justify-center p-4">
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

      <div className="w-full max-w-md mt-6">
        <ShareCode code={sessionCode} />
      </div>
    </div>
  )
}
