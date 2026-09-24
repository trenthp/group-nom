'use client'

import { Button } from '@/components/ui'
import { SadFaceIcon } from '@/components/icons'

export interface NoMatchesStateProps {
  isHost: boolean
  onReconfigure: () => void
  onLeaveSession: () => void
}

/** Shown when no restaurant got everyone's yes (Sunset Glass skin). */
export function NoMatchesState({ isHost, onReconfigure, onLeaveSession }: NoMatchesStateProps) {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-card-light p-8 text-center mb-6">
        <div className="mb-4 flex justify-center" aria-hidden="true">
          <SadFaceIcon size={64} className="text-gray-400" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">No Matches Found</h2>
        <p className="text-gray-600 mb-2">Looks like the spark wasn&apos;t there.</p>
        <p className="text-gray-600 mb-6">
          {isHost ? 'Try again. Maybe lower your standards?' : 'Waiting on the host to try again.'}
        </p>
      </div>

      {isHost ? (
        <Button variant="inverse" size="lg" className="w-full" onClick={onReconfigure}>
          Try Different Settings
        </Button>
      ) : (
        <Button variant="inverse" size="lg" className="w-full" onClick={onLeaveSession}>
          Leave Group
        </Button>
      )}
    </div>
  )
}
