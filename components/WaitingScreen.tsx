'use client'

import { useEffect, useState } from 'react'
import ShareCode from './ShareCode'
import { HourglassIcon, CheckIcon, LoaderIcon, UsersIcon } from '@/components/icons'

interface WaitingScreenProps {
  code: string
  isHost?: boolean
}

export default function WaitingScreen({ code, isHost = false }: WaitingScreenProps) {
  const [userCount, setUserCount] = useState<number>(1)

  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const response = await fetch(`/api/session/${code}/status`)
        if (response.ok) {
          const data = await response.json()
          setUserCount(data.userCount || 1)
        }
      } catch {
        // Silently fail
      }
    }

    fetchUserCount()
    const interval = setInterval(fetchUserCount, 3000)
    return () => clearInterval(interval)
  }, [code])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white bg-opacity-20 backdrop-blur rounded-3xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="mb-4 animate-bounce flex justify-center">
            <HourglassIcon size={64} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isHost ? 'Waiting for your group...' : 'Waiting in the lobby...'}
          </h1>
          <p className="text-white text-opacity-90">
            {isHost ? 'Share the code to invite friends' : 'The host is picking the vibe'}
          </p>
        </div>

        {/* User count indicator */}
        <div className="bg-white bg-opacity-30 rounded-xl py-3 px-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-white">
            <UsersIcon size={20} />
            <span className="text-lg font-semibold">
              {userCount} {userCount === 1 ? 'person' : 'people'} in group
            </span>
          </div>
        </div>

        <div className="mb-6">
          <ShareCode code={code} />
        </div>

        <div className="space-y-2 text-sm text-white text-opacity-80">
          <p className="flex items-center justify-center gap-2">
            <CheckIcon size={14} />
            {isHost ? 'Group created' : "You've joined the group"}
          </p>
          <p className="flex items-center justify-center gap-2">
            <CheckIcon size={14} />
            {isHost ? 'Share code with friends' : 'Waiting for host to finish setup'}
          </p>
          <p className="flex items-center justify-center gap-2 animate-pulse">
            <LoaderIcon size={14} className="animate-spin" />
            {isHost ? 'Waiting for friends to join...' : 'Checking status...'}
          </p>
        </div>

        <p className="text-xs text-white text-opacity-60 mt-6">
          {isHost ? 'Start swiping when everyone has joined.' : "Sit tight. We'll let you know."}
        </p>
      </div>
    </div>
  )
}
