'use client'

import ShareCode from './ShareCode'
import { HourglassIcon, CheckIcon, LoaderIcon } from '@/components/icons'

interface WaitingScreenProps {
  code: string
}

export default function WaitingScreen({ code }: WaitingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white bg-opacity-20 backdrop-blur rounded-3xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="mb-4 animate-bounce flex justify-center">
            <HourglassIcon size={64} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Waiting in the lobby...
          </h1>
          <p className="text-white text-opacity-90">
            The host is picking the vibe
          </p>
        </div>

        <div className="mb-6">
          <ShareCode code={code} />
        </div>

        <div className="space-y-2 text-sm text-white text-opacity-80">
          <p className="flex items-center justify-center gap-2">
            <CheckIcon size={14} />
            You've joined the group
          </p>
          <p className="flex items-center justify-center gap-2">
            <CheckIcon size={14} />
            Waiting for host to finish setup
          </p>
          <p className="flex items-center justify-center gap-2 animate-pulse">
            <LoaderIcon size={14} className="animate-spin" />
            Checking status...
          </p>
        </div>

        <p className="text-xs text-white text-opacity-60 mt-6">
          Sit tight. We'll let you know.
        </p>
      </div>
    </div>
  )
}
