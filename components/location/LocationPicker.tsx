'use client'

import { useState } from 'react'
import { LocationIcon } from '@/components/icons'
import type { PermissionState, LocationSource } from '@/lib/useLocation'

interface LocationPickerProps {
  permissionState: PermissionState
  locationName: string
  locationSource: LocationSource
  isLoading: boolean
  error: string | null
  onRefreshLocation: () => Promise<boolean>
  onGeocodeAddress: (address: string) => Promise<boolean>
  /** Start with the input field open for immediate entry */
  startInEditMode?: boolean
}

/**
 * Location picker component
 * Shows current location with option to change
 * Adapts based on permission state
 */
export default function LocationPicker({
  permissionState,
  locationName,
  locationSource,
  isLoading,
  error,
  onRefreshLocation,
  onGeocodeAddress,
  startInEditMode = false,
}: LocationPickerProps) {
  const [isEditing, setIsEditing] = useState(startInEditMode)
  const [addressInput, setAddressInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitAddress = async () => {
    if (!addressInput.trim()) return

    setIsSubmitting(true)
    const success = await onGeocodeAddress(addressInput.trim())
    setIsSubmitting(false)

    if (success) {
      setAddressInput('')
      setIsEditing(false)
    }
  }

  const handleUseCurrentLocation = async () => {
    setIsSubmitting(true)
    const success = await onRefreshLocation()
    setIsSubmitting(false)

    if (success) {
      setAddressInput('')
      setIsEditing(false)
    }
  }

  // Denied state - show prominent manual entry
  if (permissionState === 'denied' && !locationName) {
    return (
      <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <LocationIcon size={20} className="text-amber-300" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Location Access Blocked</h3>
            <p className="text-white/70 text-sm">
              Enter a city or address to find restaurants
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmitAddress()
            }}
            placeholder="City, address, or zip code..."
            className="flex-1 px-4 py-2.5 rounded-lg bg-white/90 text-gray-800 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            autoFocus
          />
          <button
            onClick={handleSubmitAddress}
            disabled={!addressInput.trim() || isSubmitting}
            className="px-4 py-2.5 bg-white text-orange-600 font-semibold rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '...' : 'Go'}
          </button>
        </div>

        {error && (
          <p className="text-red-300 text-sm mt-2">{error}</p>
        )}

        <p className="text-white/50 text-xs mt-3">
          Tip: Enable location in browser settings for automatic detection
        </p>
      </div>
    )
  }

  // Normal state - show location with edit option
  // Show location icon only when source is GPS
  // Active state (white bg) when location is set
  if (!isEditing) {
    const hasLocation = !!locationName
    return (
      <button
        onClick={() => setIsEditing(true)}
        disabled={isLoading}
        className={`
          inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-base font-semibold
          transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 text-left
          ${hasLocation
            ? 'bg-white text-orange-600 shadow-md shadow-orange-900/25'
            : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm border border-white/15'
          }
        `}
      >
        {locationSource === 'gps' && <LocationIcon size={16} className="flex-shrink-0" />}
        <span>
          {isLoading ? 'Finding...' : (locationName || 'Set location')}
        </span>
      </button>
    )
  }

  // Editing state
  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmitAddress()
            if (e.key === 'Escape') {
              setIsEditing(false)
              setAddressInput('')
            }
          }}
          placeholder="City or zip..."
          className="w-44 px-4 py-2 rounded-full bg-white/95 text-gray-800 text-base font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-inner transition-all duration-150"
          autoFocus
        />
        <button
          onClick={handleSubmitAddress}
          disabled={!addressInput.trim() || isSubmitting}
          className="text-white font-semibold text-base px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
        >
          {isSubmitting ? '...' : 'Go'}
        </button>
        <button
          onClick={() => {
            setIsEditing(false)
            setAddressInput('')
          }}
          className="text-white/50 hover:text-white text-base transition-colors"
        >
          Cancel
        </button>
      </div>

      <button
        onClick={handleUseCurrentLocation}
        disabled={isSubmitting}
        className="text-sm text-white/50 hover:text-white/80 mt-2 block underline underline-offset-2 transition-colors duration-150"
      >
        Use my current location
      </button>

      {error && (
        <span className="text-red-300 text-sm block mt-1">{error}</span>
      )}
    </div>
  )
}
