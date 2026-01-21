'use client'

import { useState, useEffect } from 'react'

interface UserStatus {
  userIndex: number
  finished: boolean
  voteCount: number
  isHost: boolean
  lastVoteTime?: number // Timestamp of last vote
}

interface HostStatusPanelProps {
  userStatus: UserStatus[]
  totalRestaurants: number
  pollingStartTime?: number
}

export default function HostStatusPanel({ userStatus, totalRestaurants, pollingStartTime }: HostStatusPanelProps) {
  const totalUsers = userStatus.length
  const finishedUsers = userStatus.filter(u => u.finished).length
  const votingUsers = totalUsers - finishedUsers

  // Track elapsed time for idle indicators (updates every 30s)
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  // Calculate idle time for a user (time since polling started if no lastVoteTime)
  const getIdleMinutes = (user: UserStatus): number => {
    if (user.finished) return 0
    const baseTime = user.lastVoteTime || pollingStartTime || Date.now()
    return Math.floor((Date.now() - baseTime) / 60000)
  }

  return (
    <div className="bg-white bg-opacity-20 backdrop-blur rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold text-sm">Group Status</h3>
        <span className="text-white text-opacity-80 text-xs">
          {finishedUsers}/{totalUsers} done
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {userStatus.map((user) => {
          const idleMinutes = getIdleMinutes(user)
          const showIdleWarning = !user.finished && idleMinutes >= 2

          return (
            <div
              key={user.userIndex}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                user.finished
                  ? 'bg-green-500 bg-opacity-80 text-white'
                  : showIdleWarning
                    ? 'bg-amber-500 bg-opacity-80 text-white'
                    : 'bg-white bg-opacity-30 text-white'
              }`}
            >
              <span>{user.isHost ? '👑' : '👤'}</span>
              <span>
                {user.isHost ? 'You' : `User ${user.userIndex}`}
              </span>
              {!user.finished && (
                <>
                  <span className="text-white text-opacity-70">
                    {user.voteCount}/{totalRestaurants}
                  </span>
                  {showIdleWarning && (
                    <span className="text-amber-200" title={`Idle for ${idleMinutes} min`}>
                      ({idleMinutes}m idle)
                    </span>
                  )}
                </>
              )}
              {user.finished && <span>✓</span>}
            </div>
          )
        })}
      </div>

      {votingUsers > 0 && (
        <p className="text-white text-opacity-60 text-xs mt-3">
          Waiting on {votingUsers} {votingUsers === 1 ? 'person' : 'people'}...
        </p>
      )}
    </div>
  )
}
