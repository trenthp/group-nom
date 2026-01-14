'use client'

import { useEffect } from 'react'
import Image from 'next/image'

export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Session error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <Image
          src="/logo_groupNom.svg"
          alt="Group Nom"
          width={64}
          height={64}
          className="mx-auto rounded-xl mb-6"
        />
        <h1 className="text-2xl font-bold text-white mb-2">Session hiccup</h1>
        <p className="text-orange-100 mb-6">
          Something went wrong with this group. Let's get you back on track.
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full bg-white text-orange-600 font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg hover:bg-orange-600 transition"
          >
            Start Fresh
          </button>
        </div>
        <p className="text-orange-200 text-sm mt-6">
          If this keeps happening, the session may have expired.
        </p>
      </div>
    </div>
  )
}
