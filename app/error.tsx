'use client'

import { useEffect } from 'react'
import Image from 'next/image'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
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
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-orange-100 mb-6">
          Don't worry, it happens to the best of us.
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
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}
