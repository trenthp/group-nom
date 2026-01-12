'use client'

import { useState, useEffect } from 'react'
import type { FoodMethod, Restaurant } from '@/lib/types'

interface FoodMethodTallies {
  dine_in: number
  pickup: number
  delivery: number
  total: number
}

interface HostFoodMethodPanelProps {
  sessionCode: string
  userId: string
  restaurant: Restaurant
  onDecision?: (method: FoodMethod) => void
}

const METHODS: { value: FoodMethod; label: string; emoji: string }[] = [
  { value: 'dine_in', label: 'Dine In', emoji: '🍽️' },
  { value: 'pickup', label: 'Pickup', emoji: '🥡' },
  { value: 'delivery', label: 'Delivery', emoji: '🚗' },
]

export default function HostFoodMethodPanel({
  sessionCode,
  userId,
  restaurant,
  onDecision,
}: HostFoodMethodPanelProps) {
  const [tallies, setTallies] = useState<FoodMethodTallies | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<FoodMethod | null>(null)
  const [finalResult, setFinalResult] = useState<FoodMethod | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPolling, setIsPolling] = useState(true)

  // Poll for vote tallies
  useEffect(() => {
    const fetchTallies = async () => {
      try {
        const res = await fetch(
          `/api/session/${sessionCode}/food-method?userId=${userId}`
        )
        if (res.ok) {
          const data = await res.json()
          setTallies(data.tallies)
          if (data.result) {
            setFinalResult(data.result)
            setSelectedMethod(data.result)
            setIsPolling(false)
          }
        }
      } catch (error) {
        console.error('Error fetching tallies:', error)
      }
    }

    fetchTallies()

    // Poll every 3 seconds while waiting for votes
    let interval: NodeJS.Timeout | null = null
    if (isPolling && !finalResult) {
      interval = setInterval(fetchTallies, 3000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [sessionCode, userId, isPolling, finalResult])

  const handleSetResult = async () => {
    if (!selectedMethod) return

    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/session/${sessionCode}/food-method`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, method: selectedMethod, setResult: true }),
      })

      if (res.ok) {
        setFinalResult(selectedMethod)
        setIsPolling(false)
        onDecision?.(selectedMethod)
      }
    } catch (error) {
      console.error('Error setting food method:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getActionUrl = (method: FoodMethod) => {
    const query = encodeURIComponent(`${restaurant.name} ${restaurant.address}`)

    switch (method) {
      case 'dine_in':
        // Link to OpenTable search or Google Maps
        return `https://www.google.com/maps/search/?api=1&query=${query}`
      case 'pickup':
      case 'delivery':
        // Link to DoorDash search
        return `https://www.doordash.com/search/store/${encodeURIComponent(restaurant.name)}/`
      default:
        return '#'
    }
  }

  const getActionLabel = (method: FoodMethod) => {
    switch (method) {
      case 'dine_in':
        return 'View on Maps / Make Reservation'
      case 'pickup':
        return 'Order for Pickup'
      case 'delivery':
        return 'Order Delivery'
      default:
        return 'View Options'
    }
  }

  // If final result is set, show the action
  if (finalResult) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center mb-4">
          <span className="text-4xl mb-2 block">
            {METHODS.find(m => m.value === finalResult)?.emoji}
          </span>
          <h3 className="text-lg font-semibold text-gray-800">
            {METHODS.find(m => m.value === finalResult)?.label}
          </h3>
          <p className="text-sm text-gray-500">Decision made!</p>
        </div>

        <a
          href={getActionUrl(finalResult)}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition"
        >
          {getActionLabel(finalResult)}
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        How should the group get the food?
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        You're the host - see the votes and make the call
      </p>

      {/* Vote Tallies */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {METHODS.map(({ value, label, emoji }) => {
          const count = tallies?.[value] ?? 0
          const isSelected = selectedMethod === value
          const isTopVote = tallies && count === Math.max(tallies.dine_in, tallies.pickup, tallies.delivery) && count > 0

          return (
            <button
              key={value}
              onClick={() => setSelectedMethod(value)}
              className={`
                relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition
                ${isSelected
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-orange-300'
                }
              `}
            >
              {isTopVote && !isSelected && (
                <span className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-medium">
                  Top
                </span>
              )}
              <span className="text-2xl mb-1">{emoji}</span>
              <span className="font-medium text-gray-800 text-sm">{label}</span>
              <span className="text-lg font-bold text-orange-600 mt-1">
                {count}
              </span>
              <span className="text-xs text-gray-400">
                {count === 1 ? 'vote' : 'votes'}
              </span>
            </button>
          )
        })}
      </div>

      {/* Waiting indicator */}
      {tallies && tallies.total === 0 && (
        <p className="text-center text-sm text-gray-500 mb-4">
          Waiting for group to vote...
        </p>
      )}

      {/* Set Decision Button */}
      <button
        onClick={handleSetResult}
        disabled={!selectedMethod || isSubmitting}
        className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Setting...' : `Decide: ${METHODS.find(m => m.value === selectedMethod)?.label || 'Select an option'}`}
      </button>

      <p className="text-xs text-gray-400 text-center mt-3">
        Your decision will be shown to the group
      </p>
    </div>
  )
}
