'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const COOKIE_CONSENT_KEY = 'groupnom-cookie-consent'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Small delay to avoid layout shift on initial load
      const timer = setTimeout(() => setShowBanner(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pt-4 pb-safe">
      <div className="max-w-lg mx-auto mb-4 bg-surface-card rounded-xl shadow-xl border border-white/10 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-white text-sm">
              We use cookies to keep you signed in and improve your experience.
            </p>
            <Link
              href="/privacy"
              className="text-brand text-sm hover:underline"
            >
              Learn more
            </Link>
          </div>
          <button
            onClick={handleAccept}
            className="bg-brand text-white px-5 py-2 rounded-lg font-medium hover:bg-brand-hover transition text-sm whitespace-nowrap"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
