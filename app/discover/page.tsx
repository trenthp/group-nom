'use client'

import { useState, useCallback, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { Restaurant } from '@/lib/types'
import RestaurantCard from '@/components/RestaurantCard'
import LocalBadge from '@/components/LocalBadge'
import { LocationIcon } from '@/components/icons'

type DiscoverPhase = 'intro' | 'swiping' | 'batch-complete' | 'all-done'

const BATCH_SIZE = 10

interface DiscoverState {
  phase: DiscoverPhase
  currentRestaurant: Restaurant | null
  nextRestaurant: Restaurant | null // Buffer one ahead
  loading: boolean
  loadingNext: boolean
  error: string | null
  location: { lat: number; lng: number } | null
  locationName: string
  likedCount: number
  seenCount: number
  batchCount: number // Count within current batch (0-9)
  totalBatches: number // How many batches completed
  noMoreRestaurants: boolean
}

export default function DiscoverPage() {
  const { isSignedIn, isLoaded } = useUser()
  const [state, setState] = useState<DiscoverState>({
    phase: 'intro',
    currentRestaurant: null,
    nextRestaurant: null,
    loading: false,
    loadingNext: false,
    error: null,
    location: null,
    locationName: '',
    likedCount: 0,
    seenCount: 0,
    batchCount: 0,
    totalBatches: 0,
    noMoreRestaurants: false,
  })

  // Track seen restaurant IDs to avoid duplicates
  const seenIds = useRef<Set<string>>(new Set())

  // Fetch a single restaurant
  const fetchNextRestaurant = useCallback(async (
    lat: number,
    lng: number,
    excludeIds: string[]
  ): Promise<Restaurant | null> => {
    try {
      const response = await fetch('/api/restaurants/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lng,
          radius: 5000,
          limit: 1, // Only fetch 1 restaurant at a time
          filters: {
            minRating: 3.5,
            maxReviews: 10000,
            distance: 5,
            priceLevel: [1, 2, 3, 4],
            cuisines: [],
            openNow: false,
          },
          excludeIds, // Pass already seen IDs to backend
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch restaurant')
      }

      const data = await response.json()
      const restaurants = data.restaurants || []

      // Find first restaurant we haven't seen
      for (const restaurant of restaurants) {
        if (!seenIds.current.has(restaurant.id)) {
          seenIds.current.add(restaurant.id)
          return restaurant
        }
      }

      return null // No new restaurants
    } catch (error) {
      console.error('Error fetching restaurant:', error)
      return null
    }
  }, [])

  // Start swiping - get location first, then fetch restaurants
  const handleStartSwiping = useCallback(async () => {
    setState(s => ({ ...s, loading: true }))

    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation not supported', loading: false }))
      return
    }

    // Request location permission and get position
    const position = await new Promise<GeolocationPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (error) => {
          console.error('Geolocation error:', error)
          setState(s => ({
            ...s,
            error: 'Unable to get location. Please enable location services.',
            loading: false,
          }))
          resolve(null)
        }
      )
    })

    if (!position) return

    const { latitude: lat, longitude: lng } = position.coords
    setState(s => ({ ...s, location: { lat, lng } }))

    // Reverse geocode in background
    fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setState(s => ({ ...s, locationName: data.city || data.area || 'your area' }))
      })
      .catch(() => {})

    // Fetch first restaurant
    const first = await fetchNextRestaurant(lat, lng, [])
    if (first) {
      setState(s => ({
        ...s,
        phase: 'swiping',
        currentRestaurant: first,
        loading: false,
        batchCount: 0,
      }))

      // Pre-fetch the next one in the background
      const second = await fetchNextRestaurant(lat, lng, [first.id])
      setState(s => ({ ...s, nextRestaurant: second }))
    } else {
      setState(s => ({
        ...s,
        phase: 'all-done',
        loading: false,
        noMoreRestaurants: true,
      }))
    }
  }, [fetchNextRestaurant])

  // Handle swipe (like or pass)
  const handleSwipe = useCallback(async (liked: boolean) => {
    const restaurant = state.currentRestaurant
    if (!restaurant || !state.location) return

    const newBatchCount = state.batchCount + 1
    const batchComplete = newBatchCount >= BATCH_SIZE
    const next = state.nextRestaurant

    // Save the like in the background (only for signed-in users)
    if (liked && isSignedIn) {
      fetch('/api/restaurants/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: restaurant.id,
          name: restaurant.name,
          address: restaurant.address,
          lat: restaurant.lat,
          lng: restaurant.lng,
          cuisines: restaurant.cuisines,
          source: 'swipe',
        }),
      }).catch(error => console.error('Error saving like:', error))
    }

    // If batch is complete, go to batch-complete screen
    if (batchComplete) {
      setState(s => ({
        ...s,
        phase: 'batch-complete',
        currentRestaurant: null,
        nextRestaurant: next, // Keep the buffered one for continue
        likedCount: liked ? s.likedCount + 1 : s.likedCount,
        seenCount: s.seenCount + 1,
        batchCount: newBatchCount,
      }))
      return
    }

    // If we have a buffered next restaurant, show it immediately
    if (next) {
      setState(s => ({
        ...s,
        currentRestaurant: next,
        nextRestaurant: null,
        loadingNext: true,
        likedCount: liked ? s.likedCount + 1 : s.likedCount,
        seenCount: s.seenCount + 1,
        batchCount: newBatchCount,
      }))

      // Fetch the next restaurant in the background
      const { lat, lng } = state.location
      const excludeIds = Array.from(seenIds.current)
      const newNext = await fetchNextRestaurant(lat, lng, excludeIds)
      setState(s => ({
        ...s,
        nextRestaurant: newNext,
        loadingNext: false,
      }))
    } else {
      // No buffered restaurant - need to fetch one
      setState(s => ({
        ...s,
        currentRestaurant: null,
        loadingNext: true,
        likedCount: liked ? s.likedCount + 1 : s.likedCount,
        seenCount: s.seenCount + 1,
        batchCount: newBatchCount,
      }))

      const { lat, lng } = state.location
      const excludeIds = Array.from(seenIds.current)
      const newCurrent = await fetchNextRestaurant(lat, lng, excludeIds)

      if (newCurrent) {
        setState(s => ({
          ...s,
          currentRestaurant: newCurrent,
          loadingNext: false,
        }))
        // Also prefetch next
        const newNext = await fetchNextRestaurant(lat, lng, [...excludeIds, newCurrent.id])
        setState(s => ({ ...s, nextRestaurant: newNext }))
      } else {
        // Truly no more restaurants
        setState(s => ({
          ...s,
          phase: 'all-done',
          noMoreRestaurants: true,
          loadingNext: false,
        }))
      }
    }
  }, [state.currentRestaurant, state.nextRestaurant, state.location, state.batchCount, isSignedIn, fetchNextRestaurant])

  const handleLike = useCallback(() => handleSwipe(true), [handleSwipe])
  const handlePass = useCallback(() => handleSwipe(false), [handleSwipe])

  // Continue swiping after batch completion (keeps progress)
  const handleContinueSwiping = useCallback(async () => {
    if (!state.location) return

    setState(s => ({
      ...s,
      loading: true,
      totalBatches: s.totalBatches + 1,
    }))

    const { lat, lng } = state.location
    const excludeIds = Array.from(seenIds.current)

    // Use the buffered next restaurant if available
    const first = state.nextRestaurant || await fetchNextRestaurant(lat, lng, excludeIds)
    if (first) {
      setState(s => ({
        ...s,
        phase: 'swiping',
        currentRestaurant: first,
        nextRestaurant: null,
        loading: false,
        batchCount: 0,
      }))

      // Pre-fetch the next one
      const second = await fetchNextRestaurant(lat, lng, [...excludeIds, first.id])
      setState(s => ({ ...s, nextRestaurant: second }))
    } else {
      setState(s => ({
        ...s,
        phase: 'all-done',
        loading: false,
        noMoreRestaurants: true,
      }))
    }
  }, [state.location, state.nextRestaurant, fetchNextRestaurant])

  // User is done - go to saved restaurants
  const handleDone = useCallback(() => {
    window.location.href = '/saved'
  }, [])

  // Full refresh - reset everything
  const handleRefresh = useCallback(() => {
    // Reset seen IDs and start fresh
    seenIds.current.clear()
    setState(s => ({
      ...s,
      phase: 'intro',
      loading: false,
      currentRestaurant: null,
      nextRestaurant: null,
      noMoreRestaurants: false,
      batchCount: 0,
      totalBatches: 0,
      likedCount: 0,
      seenCount: 0,
    }))
  }, [])

  // Loading state (only during transitions)
  if (!isLoaded || state.loading) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#EA4D19] border-t-transparent mx-auto mb-4" />
          <p className="text-lg font-medium text-white/80">Finding restaurants near you...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state.error) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center p-4">
        <div className="bg-[#333333] rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 text-lg mb-4">{state.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#EA4D19] text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Intro screen with card alignment animation
  if (state.phase === 'intro') {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center p-4">
        <div className="text-center">
          {/* Animated card stack */}
          <div className="relative w-64 h-80 mx-auto mb-8">
            {/* 5 cards that animate from scattered to aligned stack */}
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="absolute inset-0 bg-white rounded-2xl shadow-xl"
                style={{
                  animation: `cardAlign 0.6s ease-out ${i * 0.08}s forwards`,
                  transform: `rotate(${(i - 2) * 12}deg) translateX(${(i - 2) * 15}px) translateY(${i * 6}px)`,
                  zIndex: 5 - i,
                }}
              >
                {/* Card content placeholder */}
                <div className="p-4 h-full flex flex-col">
                  <div className="bg-gray-200 rounded-xl h-32 mb-3 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="bg-gray-200 rounded h-4 w-3/4 mb-2" />
                  <div className="bg-gray-100 rounded h-3 w-1/2" />
                  <div className="mt-auto flex gap-2">
                    <div className="bg-orange-100 rounded-full h-5 w-16" />
                    <div className="bg-orange-100 rounded-full h-5 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CSS for alignment animation */}
          <style jsx>{`
            @keyframes cardAlign {
              to {
                transform: rotate(0deg) translateX(0) translateY(0);
              }
            }
          `}</style>

          {/* Title and CTA */}
          <h1 className="text-3xl font-bold text-white mb-2">
            Discover Restaurants
          </h1>
          <p className="text-white/60 mb-8 max-w-xs mx-auto">
            Swipe right to like, left to pass. We&apos;ll remember your favorites.
          </p>

          <button
            onClick={handleStartSwiping}
            className="px-8 py-4 rounded-2xl font-bold text-lg transition-all bg-[#EA4D19] text-white hover:scale-105 shadow-lg"
          >
            Start Swiping
          </button>
        </div>
      </div>
    )
  }

  // Batch complete screen - shown after every 10 cards
  if (state.phase === 'batch-complete') {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center p-4">
        <div className="bg-[#333333] rounded-2xl p-8 max-w-md text-center">
          <div className="text-5xl mb-4">
            {state.likedCount > 0 ? '🎉' : '👀'}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Nice work!
          </h2>
          <p className="text-white/60 mb-2">
            You&apos;ve swiped through {state.seenCount} restaurants
          </p>
          <p className="text-lg font-semibold text-[#EA4D19] mb-6">
            {state.likedCount} liked so far
          </p>

          <div className="space-y-3">
            <button
              onClick={handleContinueSwiping}
              className="w-full bg-[#EA4D19] text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition"
            >
              Continue Swiping
            </button>
            <button
              onClick={handleDone}
              className="w-full bg-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition"
            >
              {state.likedCount > 0 ? "I'm Done - View Saved" : "I'm Done"}
            </button>
          </div>

          {!isSignedIn && state.likedCount > 0 && (
            <div className="mt-4 bg-amber-500/20 border border-amber-500/30 rounded-xl p-3">
              <p className="text-amber-200 text-sm">
                <a href="/sign-in?redirect_url=/discover" className="font-semibold underline">
                  Sign in
                </a>
                {' '}to save your favorites permanently
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // All done - no more restaurants
  if (state.phase === 'all-done' || state.noMoreRestaurants) {
    return (
      <div className="min-h-screen bg-[#222222] flex items-center justify-center p-4">
        <div className="bg-[#333333] rounded-2xl p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🍽️</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            That&apos;s all for now!
          </h2>
          <p className="text-white/60 mb-4">
            You&apos;ve seen {state.seenCount} restaurant{state.seenCount !== 1 ? 's' : ''} and liked {state.likedCount}{' '}
            in {state.locationName || 'your area'}.
          </p>
          {!isSignedIn && state.likedCount > 0 && (
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4 mb-4">
              <p className="text-amber-200 text-sm font-medium">
                Sign in to save your favorites!
              </p>
              <a
                href="/sign-in?redirect_url=/saved"
                className="inline-block mt-2 text-amber-300 underline font-semibold"
              >
                Sign In →
              </a>
            </div>
          )}
          <div className="space-y-3">
            {state.likedCount > 0 && (
              <button
                onClick={handleDone}
                className="w-full bg-[#EA4D19] text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition"
              >
                View Saved Restaurants
              </button>
            )}
            <button
              onClick={handleRefresh}
              className={`w-full px-6 py-3 rounded-xl font-bold transition ${
                state.likedCount > 0
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-[#EA4D19] text-white hover:bg-orange-600'
              }`}
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Guard: If we're in swiping phase but have no restaurant, show loading
  if (state.phase === 'swiping' && !state.currentRestaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F97316] to-[#DC2626] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4" />
          <p className="text-lg font-medium">Loading next restaurant...</p>
        </div>
      </div>
    )
  }

  // Main swiping view - we know currentRestaurant is not null at this point
  const restaurant = state.currentRestaurant!
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F97316] to-[#DC2626] flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <div className="text-white">
          <h1 className="text-xl font-bold">Discover</h1>
          {state.locationName && (
            <p className="text-sm opacity-80 flex items-center gap-1">
              <LocationIcon size={12} />
              {state.locationName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Batch progress */}
          <div className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
            {state.batchCount + 1} of {BATCH_SIZE}
          </div>
          {state.likedCount > 0 && (
            <div className="bg-green-500/80 text-white px-3 py-1 rounded-full text-sm font-medium">
              {state.likedCount} liked
            </div>
          )}
          {state.loadingNext && (
            <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
          )}
        </div>
      </header>

      {/* Card Stack */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Local Badge above card */}
          {(restaurant.likeCount || restaurant.pickRate) && (
            <div className="mb-3">
              <LocalBadge
                likeCount={restaurant.likeCount || 0}
                pickRate={restaurant.pickRate}
                size="md"
              />
            </div>
          )}

          <RestaurantCard
            restaurant={restaurant}
            onYes={handleLike}
            onNo={handlePass}
            progress={`${state.batchCount + 1}/${BATCH_SIZE}`}
          />
        </div>
      </main>

      {/* Guest prompt */}
      {!isSignedIn && state.likedCount >= 3 && (
        <div className="p-4 bg-white/10 backdrop-blur-sm">
          <p className="text-white text-center text-sm">
            Sign in to save your favorites! →{' '}
            <a href="/sign-in" className="underline font-semibold">
              Sign In
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
