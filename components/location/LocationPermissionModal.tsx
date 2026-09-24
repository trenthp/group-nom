'use client'

import { useState } from 'react'
import { LocationIcon } from '@/components/icons'
import { Modal, Button, Spinner } from '@/components/ui'

interface LocationPermissionModalProps {
  isOpen: boolean
  onRequestPermission: () => Promise<boolean>
  onSkip?: () => void
  onClose?: () => void
}

/**
 * Explains why we want location BEFORE triggering the browser's native
 * permission prompt, so the prompt never appears cold.
 */
export default function LocationPermissionModal({
  isOpen,
  onRequestPermission,
  onSkip,
  onClose,
}: LocationPermissionModalProps) {
  const [isRequesting, setIsRequesting] = useState(false)

  const handleAllow = async () => {
    setIsRequesting(true)
    await onRequestPermission()
    setIsRequesting(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onClose?.()}
      ariaLabel="Location access"
      className="max-w-sm"
      closeOnOverlayClick={!!onClose}
    >
      {/* Header */}
      <div className="px-6 pt-8 pb-2 text-center">
        <div className="w-16 h-16 bg-brand-soft rounded-full flex items-center justify-center mx-auto mb-4">
          <LocationIcon size={32} className="text-brand" />
        </div>
        <h2 className="text-2xl font-bold text-white">Find places near you</h2>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        <p className="text-white/70 text-center mb-6">
          We use your location to show the library and places nearby. It&apos;s
          only used to search and is never stored.
        </p>

        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full"
            onClick={handleAllow}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <>
                <Spinner size="sm" variant="white" />
                Getting location...
              </>
            ) : (
              <>
                <LocationIcon size={20} />
                Allow location access
              </>
            )}
          </Button>

          {onSkip && (
            <Button variant="ghost" className="w-full" onClick={onSkip}>
              Enter a location manually instead
            </Button>
          )}
        </div>
      </div>

      {/* Footer note */}
      <div className="px-6 pb-6">
        <p className="text-xs text-white/50 text-center">
          You can change this anytime in your browser settings
        </p>
      </div>
    </Modal>
  )
}
