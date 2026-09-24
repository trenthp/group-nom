'use client'

import { useState } from 'react'
import { LocationIcon } from '@/components/icons'
import { Button, Input } from '@/components/ui'
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
 * Shows the current location with an option to change it.
 * Adapts to permission state (Dark Ember skin).
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

  // Denied state without a location yet - prominent manual entry
  if (permissionState === 'denied' && !locationName) {
    return (
      <div className="bg-surface-card rounded-card p-4 border border-white/10">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <LocationIcon size={20} className="text-amber-300" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Location access blocked</h3>
            <p className="text-white/70 text-sm">
              Enter a city or address to browse nearby
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitAddress()
              }}
              placeholder="City, address, or zip code..."
              aria-label="City, address, or zip code"
              className="py-2.5 text-sm"
              autoFocus
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmitAddress}
            disabled={!addressInput.trim() || isSubmitting}
            className="px-4"
          >
            {isSubmitting ? '...' : 'Go'}
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-red-400 text-sm mt-2">{error}</p>
        )}

        <p className="text-white/50 text-xs mt-3">
          Tip: enable location in browser settings for automatic detection
        </p>
      </div>
    )
  }

  // Collapsed state - location chip with edit affordance
  if (!isEditing) {
    const hasLocation = !!locationName
    return (
      <button
        onClick={() => setIsEditing(true)}
        disabled={isLoading}
        className={`
          inline-flex items-center gap-1.5 px-4 py-2 rounded-pill text-base font-semibold
          transition-all duration-200 text-left
          focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60
          motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98] disabled:opacity-70
          ${hasLocation
            ? 'bg-white/10 text-white hover:bg-white/20'
            : 'bg-brand text-white hover:bg-brand-hover'
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
        <div className="w-48">
          <Input
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
            aria-label="City or zip code"
            className="py-2"
            autoFocus
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSubmitAddress}
          disabled={!addressInput.trim() || isSubmitting}
        >
          {isSubmitting ? '...' : 'Go'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsEditing(false)
            setAddressInput('')
          }}
        >
          Cancel
        </Button>
      </div>

      {permissionState !== 'unsupported' && (
        <button
          onClick={handleUseCurrentLocation}
          disabled={isSubmitting}
          className="text-sm text-white/50 hover:text-white/80 mt-2 block underline underline-offset-2 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
        >
          Use my current location
        </button>
      )}

      {error && (
        <span role="alert" className="text-red-400 text-sm block mt-1">{error}</span>
      )}
    </div>
  )
}
