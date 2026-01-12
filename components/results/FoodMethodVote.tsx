'use client'

import { useState, useEffect } from 'react'
import type { FoodMethod } from '@/lib/types'

interface FoodMethodVoteProps {
  sessionCode: string
  userId: string
  onVoted?: (method: FoodMethod) => void
}

const METHODS: { value: FoodMethod; label: string; emoji: string; description: string }[] = [
  {
    value: 'dine_in',
    label: 'Dine In',
    emoji: '🍽️',
    description: 'Eat at the restaurant',
  },
  {
    value: 'pickup',
    label: 'Pickup',
    emoji: '🥡',
    description: 'Order and pick it up',
  },
  {
    value: 'delivery',
    label: 'Delivery',
    emoji: '🚗',
    description: 'Get it delivered',
  },
]

export default function FoodMethodVote({
  sessionCode,
  userId,
  onVoted,
}: FoodMethodVoteProps) {
  const [selectedMethod, setSelectedMethod] = useState<FoodMethod | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)

  // Fetch current vote status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(
          `/api/session/${sessionCode}/food-method?userId=${userId}`
        )
        if (res.ok) {
          const data = await res.json()
          if (data.userVote) {
            setSelectedMethod(data.userVote)
            setHasVoted(true)
          }
        }
      } catch (error) {
        console.error('Error fetching food method status:', error)
      }
    }

    fetchStatus()
  }, [sessionCode, userId])

  const handleVote = async (method: FoodMethod) => {
    setSelectedMethod(method)
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/session/${sessionCode}/food-method`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, method }),
      })

      if (res.ok) {
        setHasVoted(true)
        onVoted?.(method)
      }
    } catch (error) {
      console.error('Error voting for food method:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        How do you want to get the food?
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {hasVoted ? 'You voted! The host will decide.' : 'Vote for your preference'}
      </p>

      <div className="grid grid-cols-3 gap-3">
        {METHODS.map(({ value, label, emoji, description }) => (
          <button
            key={value}
            onClick={() => handleVote(value)}
            disabled={isSubmitting}
            className={`
              flex flex-col items-center justify-center p-4 rounded-xl border-2 transition
              ${selectedMethod === value
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
              }
              ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <span className="text-3xl mb-2">{emoji}</span>
            <span className="font-medium text-gray-800">{label}</span>
            <span className="text-xs text-gray-500 mt-1 text-center">
              {description}
            </span>
            {selectedMethod === value && hasVoted && (
              <span className="mt-2 text-xs text-orange-600 font-medium">
                ✓ Your vote
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
