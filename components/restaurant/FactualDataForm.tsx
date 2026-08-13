'use client'

import { useState } from 'react'
import type { RestaurantEnrichment } from '@/lib/types'

interface FactualDataFormProps {
  restaurantId: string
  restaurantName: string
  existingData?: RestaurantEnrichment | null
  onSuccess: (enrichment: RestaurantEnrichment) => void
  onCancel: () => void
}

export default function FactualDataForm({
  restaurantId,
  existingData,
  onSuccess,
  onCancel,
}: FactualDataFormProps) {
  const [hoursNotes, setHoursNotes] = useState(existingData?.hoursNotes || '')
  const [menuUrl, setMenuUrl] = useState(existingData?.menuUrl || '')
  const [parkingNotes, setParkingNotes] = useState(existingData?.parkingNotes || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasChanges =
    hoursNotes.trim() !== (existingData?.hoursNotes || '') ||
    menuUrl.trim() !== (existingData?.menuUrl || '') ||
    parkingNotes.trim() !== (existingData?.parkingNotes || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate URL if provided
    if (menuUrl.trim()) {
      try {
        new URL(menuUrl.trim())
      } catch {
        setError('Please enter a valid menu URL')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/enrichment/${restaurantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hoursNotes: hoursNotes.trim() || undefined,
          menuUrl: menuUrl.trim() || undefined,
          parkingNotes: parkingNotes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      const { enrichment } = await res.json()
      onSuccess(enrichment)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass = 'w-full px-4 py-2 bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-lg focus:outline-none focus:border-brand'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Hours Notes */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1">
          Hours Notes
          {existingData?.hoursNotes && (
            <span className="ml-2 text-green-400 text-xs">✓ Has data</span>
          )}
        </label>
        <input
          type="text"
          value={hoursNotes}
          onChange={(e) => setHoursNotes(e.target.value)}
          placeholder="e.g., Closed Mondays, Late night Fri-Sat"
          maxLength={200}
          className={inputClass}
        />
        <p className="text-xs text-white/40 mt-1">
          Any helpful notes about when they&apos;re open
        </p>
      </div>

      {/* Menu URL */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1">
          Menu Link
          {existingData?.menuUrl && (
            <span className="ml-2 text-green-400 text-xs">✓ Has data</span>
          )}
        </label>
        <input
          type="url"
          value={menuUrl}
          onChange={(e) => setMenuUrl(e.target.value)}
          placeholder="https://restaurant.com/menu"
          className={inputClass}
        />
        <p className="text-xs text-white/40 mt-1">
          Link to their online menu
        </p>
      </div>

      {/* Parking Notes */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1">
          Parking Tips
          {existingData?.parkingNotes && (
            <span className="ml-2 text-green-400 text-xs">✓ Has data</span>
          )}
        </label>
        <input
          type="text"
          value={parkingNotes}
          onChange={(e) => setParkingNotes(e.target.value)}
          placeholder="e.g., Street parking, Lot in back, Valet available"
          maxLength={200}
          className={inputClass}
        />
        <p className="text-xs text-white/40 mt-1">
          Help others know where to park
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 text-red-300 px-4 py-3 rounded-lg text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Info */}
      <div className="bg-white/5 text-white/60 px-4 py-3 rounded-lg text-sm">
        <strong className="text-white/80">Thanks for helping!</strong> Your contribution helps other locals discover great spots.
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 px-4 py-3 border border-white/20 text-white/70 rounded-lg font-medium hover:bg-white/5 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !hasChanges}
          className="flex-1 px-4 py-3 bg-brand text-white rounded-lg font-medium hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}
