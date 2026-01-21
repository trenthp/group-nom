'use client'

import { SadFaceIcon } from '@/components/icons'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export interface NoMatchesStateProps {
  sessionCode: string
  isHost: boolean
  onReconfigure: () => void
  onLeaveSession: () => void
}

export function NoMatchesState({
  sessionCode,
  isHost,
  onReconfigure,
  onLeaveSession,
}: NoMatchesStateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600">
      <Header sessionCode={sessionCode} />
      <div
        className="flex flex-col items-center justify-center p-4"
        style={{ minHeight: 'calc(100vh - 56px)' }}
      >
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center mb-6">
            <div className="mb-4 flex justify-center">
              <SadFaceIcon size={64} className="text-gray-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              No Matches Found
            </h2>
            <p className="text-gray-600 mb-2">
              Looks like the spark wasn't there.
            </p>
            <p className="text-gray-600 mb-6">
              {isHost
                ? "Try again. Maybe lower your standards?"
                : 'Waiting on the host to try again.'}
            </p>
          </div>

          {isHost ? (
            <button
              onClick={onReconfigure}
              className="w-full bg-white text-orange-600 font-semibold py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition"
            >
              Try Different Settings
            </button>
          ) : (
            <button
              onClick={onLeaveSession}
              className="w-full bg-white text-orange-600 font-semibold py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition"
            >
              Leave Group
            </button>
          )}

          <Footer />
        </div>
      </div>
    </div>
  )
}
