'use client'

interface CoNominator {
  clerkUserId: string
  displayName?: string
  avatarUrl?: string
}

interface CoNominatorsProps {
  nominationCount: number
  coNominators: CoNominator[]
  userHasNominated: boolean
  className?: string
}

export default function CoNominators({
  nominationCount,
  coNominators,
  userHasNominated,
  className = '',
}: CoNominatorsProps) {
  if (nominationCount === 0) {
    return null
  }

  const getMessage = () => {
    if (userHasNominated) {
      if (coNominators.length === 0) {
        return 'You nominated this spot!'
      }
      return `You and ${coNominators.length} other${coNominators.length > 1 ? 's' : ''} nominated this spot!`
    }

    if (nominationCount === 1) {
      return 'Nominated by 1 local'
    }
    return `Nominated by ${nominationCount} locals`
  }

  const displayedAvatars = coNominators.slice(0, 5)
  const remainingCount = coNominators.length - displayedAvatars.length

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Avatar stack */}
      {displayedAvatars.length > 0 && (
        <div className="flex -space-x-2">
          {displayedAvatars.map((nominator, index) => (
            <div
              key={nominator.clerkUserId}
              className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-gray-200"
              style={{ zIndex: displayedAvatars.length - index }}
              title={nominator.displayName || 'Local nominator'}
            >
              {nominator.avatarUrl ? (
                <img
                  src={nominator.avatarUrl}
                  alt={nominator.displayName || 'Nominator'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-medium">
                  {nominator.displayName?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
              +{remainingCount}
            </div>
          )}
        </div>
      )}

      {/* Message */}
      <span className="text-sm text-gray-600">{getMessage()}</span>
    </div>
  )
}

// Simple inline variant
export function CoNominatorsInline({
  count,
  userHasNominated = false,
}: {
  count: number
  userHasNominated?: boolean
}) {
  if (count === 0) return null

  if (userHasNominated) {
    if (count === 1) return <span>You nominated this!</span>
    return <span>You + {count - 1} others</span>
  }

  return <span>{count} local{count > 1 ? 's' : ''}</span>
}
