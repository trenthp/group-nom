'use client'

import { useState } from 'react'
import type { Nomination, GoodForTag } from '@/lib/types'

interface EnrichmentFormProps {
  nomination: Nomination
  onSuccess: (updated: Nomination) => void
  onSkip: () => void
}

const GOOD_FOR_OPTIONS: { value: GoodForTag; label: string; emoji: string }[] = [
  { value: 'date_night', label: 'Date Night', emoji: '💕' },
  { value: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
  { value: 'groups', label: 'Groups', emoji: '👥' },
  { value: 'solo', label: 'Solo', emoji: '🧑' },
  { value: 'quick_bite', label: 'Quick Bite', emoji: '⚡' },
  { value: 'late_night', label: 'Late Night', emoji: '🌙' },
  { value: 'brunch', label: 'Brunch', emoji: '🥂' },
]

export default function EnrichmentForm({
  nomination,
  onSuccess,
  onSkip,
}: EnrichmentFormProps) {
  const [favoriteDishes, setFavoriteDishes] = useState<string[]>(
    nomination.myFavoriteDishes || []
  )
  const [newDish, setNewDish] = useState('')
  const [goodFor, setGoodFor] = useState<GoodForTag[]>(
    nomination.goodFor || []
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddDish = () => {
    const dish = newDish.trim()
    if (dish && !favoriteDishes.includes(dish) && favoriteDishes.length < 10) {
      setFavoriteDishes([...favoriteDishes, dish])
      setNewDish('')
    }
  }

  const handleRemoveDish = (dish: string) => {
    setFavoriteDishes(favoriteDishes.filter(d => d !== dish))
  }

  const handleToggleGoodFor = (tag: GoodForTag) => {
    if (goodFor.includes(tag)) {
      setGoodFor(goodFor.filter(t => t !== tag))
    } else {
      setGoodFor([...goodFor, tag])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/nominations/${nomination.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          myFavoriteDishes: favoriteDishes,
          goodFor,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update nomination')
      }

      const { nomination: updated } = await res.json()
      onSuccess(updated)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasChanges = favoriteDishes.length > 0 || goodFor.length > 0

  return (
    <div className="bg-surface-card rounded-2xl overflow-hidden max-w-md mx-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/10">
        <h2 className="text-xl font-bold text-white">Your nomination is live! 🎉</h2>
        <p className="text-green-300 text-sm">Want to add more details?</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Favorite Dishes */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Your favorite dishes
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newDish}
              onChange={(e) => setNewDish(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddDish()
                }
              }}
              placeholder="e.g., Al Pastor Tacos"
              maxLength={100}
              className="flex-1 px-4 py-2 bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-lg focus:outline-none focus:border-green-400"
            />
            <button
              type="button"
              onClick={handleAddDish}
              disabled={!newDish.trim() || favoriteDishes.length >= 10}
              className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {favoriteDishes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {favoriteDishes.map((dish) => (
                <span
                  key={dish}
                  className="inline-flex items-center gap-1 bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm"
                >
                  {dish}
                  <button
                    type="button"
                    onClick={() => handleRemoveDish(dish)}
                    className="text-green-400 hover:text-green-200"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-white/40 mt-1">
            {favoriteDishes.length}/10 dishes
          </p>
        </div>

        {/* Good For */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Good for
          </label>
          <div className="flex flex-wrap gap-2">
            {GOOD_FOR_OPTIONS.map(({ value, label, emoji }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleToggleGoodFor(value)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition
                  ${goodFor.includes(value)
                    ? 'bg-green-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }
                `}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 text-red-300 px-4 py-3 rounded-lg text-sm" role="alert">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSkip}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 border border-white/20 text-white/70 rounded-lg font-medium hover:bg-white/5 disabled:opacity-50"
          >
            Maybe Later
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !hasChanges}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      </form>
    </div>
  )
}
