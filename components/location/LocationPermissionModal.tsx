'use client'

import { useState } from 'react'
import { LocationIcon } from '@/components/icons'

interface LocationPermissionModalProps {
  isOpen: boolean
  onRequestPermission: () => Promise<boolean>
  onSkip?: () => void // Optional: allow skipping to manual entry
  onClose?: () => void
}

/**
 * Modal explaining why we need location permission
 * Shown before triggering the browser's native permission prompt
 */
export default function LocationPermissionModal({
  isOpen,
  onRequestPermission,
  onSkip,
  onClose,
}: LocationPermissionModalProps) {
  const [isRequesting, setIsRequesting] = useState(false)

  if (!isOpen) return null

  const handleAllow = async () => {
    setIsRequesting(true)
    await onRequestPermission()
    setIsRequesting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header with icon */}
        <div className="bg-gradient-to-br from-orange-500 to-red-600 px-6 py-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <LocationIcon size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            Find Restaurants Near You
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-gray-600 text-center mb-6">
            We need your location to find nearby restaurants. Your location is only used to search and is never stored.
          </p>

          <div className="space-y-3">
            {/* Allow button */}
            <button
              onClick={handleAllow}
              disabled={isRequesting}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold py-3.5 px-4 rounded-xl hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRequesting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Getting Location...
                </>
              ) : (
                <>
                  <LocationIcon size={20} />
                  Allow Location Access
                </>
              )}
            </button>

            {/* Skip option */}
            {onSkip && (
              <button
                onClick={onSkip}
                className="w-full text-gray-500 font-medium py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Enter location manually instead
              </button>
            )}
          </div>
        </div>

        {/* Footer note */}
        <div className="px-6 pb-6">
          <p className="text-xs text-gray-400 text-center">
            You can change this anytime in your browser settings
          </p>
        </div>
      </div>
    </div>
  )
}
