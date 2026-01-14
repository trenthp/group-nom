'use client'

import { useState, useEffect } from 'react'

interface SessionCodeOverlayProps {
  code: string
  isOpen: boolean
  onClose: () => void
}

export default function SessionCodeOverlay({ code, isOpen, onClose }: SessionCodeOverlayProps) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    })
  }

  const copyUrl = () => {
    const url = `${window.location.origin}/session/${code}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    })
  }

  const shareSession = async () => {
    const url = `${window.location.origin}/session/${code}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Group Nom group!',
          text: `Join my restaurant voting group with code: ${code}`,
          url,
        })
      } catch (err) {
        // User cancelled or share failed, fall back to copy
        copyUrl()
      }
    } else {
      copyUrl()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close share dialog"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="text-center">
          <h2 id="share-modal-title" className="text-xl font-bold text-gray-800 mb-2">Share Group</h2>
          <p className="text-gray-600 text-sm mb-6">Invite friends to vote on restaurants together</p>

          {/* Session Code Display */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 mb-6">
            <p className="text-white text-sm opacity-90 mb-1">Group Code</p>
            <code className="text-white text-3xl font-mono font-bold tracking-widest">{code}</code>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={copyCode}
              className="w-full py-3 px-4 bg-orange-100 text-orange-700 rounded-xl font-semibold hover:bg-orange-200 transition flex items-center justify-center gap-2"
            >
              {copiedCode ? (
                <>
                  <span>✓</span>
                  <span>Code Copied!</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              onClick={copyUrl}
              className="w-full py-3 px-4 bg-orange-100 text-orange-700 rounded-xl font-semibold hover:bg-orange-200 transition flex items-center justify-center gap-2"
            >
              {copiedUrl ? (
                <>
                  <span>✓</span>
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <span>🔗</span>
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <button
              onClick={shareSession}
              className="w-full py-3 px-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition flex items-center justify-center gap-2"
            >
              <span>📤</span>
              <span>Share</span>
            </button>
          </div>

          <p className="text-gray-500 text-xs mt-4">
            Friends can join at groupnom.com or enter the code on the home screen
          </p>
        </div>
      </div>
    </div>
  )
}
