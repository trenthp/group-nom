'use client'

interface UserStatus {
  userIndex: number
  finished: boolean
  voteCount: number
  isHost: boolean
}

interface HostStatusPanelProps {
  userStatus: UserStatus[]
  totalRestaurants: number
}

export default function HostStatusPanel({ userStatus, totalRestaurants }: HostStatusPanelProps) {
  const totalUsers = userStatus.length
  const finishedUsers = userStatus.filter(u => u.finished).length
  const votingUsers = totalUsers - finishedUsers

  return (
    <div className="bg-white bg-opacity-20 backdrop-blur rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold text-sm">Group Status</h3>
        <span className="text-white text-opacity-80 text-xs">
          {finishedUsers}/{totalUsers} done
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {userStatus.map((user) => (
          <div
            key={user.userIndex}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
              user.finished
                ? 'bg-green-500 bg-opacity-80 text-white'
                : 'bg-white bg-opacity-30 text-white'
            }`}
          >
            <span>{user.isHost ? '👑' : '👤'}</span>
            <span>
              {user.isHost ? 'You' : `User ${user.userIndex}`}
            </span>
            {!user.finished && (
              <span className="text-white text-opacity-70">
                {user.voteCount}/{totalRestaurants}
              </span>
            )}
            {user.finished && <span>✓</span>}
          </div>
        ))}
      </div>

      {votingUsers > 0 && (
        <p className="text-white text-opacity-60 text-xs mt-3">
          Waiting on {votingUsers} {votingUsers === 1 ? 'person' : 'people'}...
        </p>
      )}
    </div>
  )
}
