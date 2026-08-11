'use client'

interface NominationBadgeProps {
  nominationCount: number
  userHasNominated?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function NominationBadge({
  nominationCount,
  userHasNominated = false,
  size = 'md',
  className = '',
}: NominationBadgeProps) {
  if (nominationCount === 0) {
    return null
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  }

  const getMessage = () => {
    if (userHasNominated) {
      if (nominationCount === 1) {
        return 'You nominated this!'
      }
      return `You + ${nominationCount - 1} local${nominationCount > 2 ? 's' : ''}`
    }

    if (nominationCount === 1) {
      return '1 local nomination'
    }
    return `${nominationCount} local nominations`
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        bg-gradient-to-r from-orange-500 to-red-500 text-white
        shadow-sm
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <span className="text-yellow-200">🔥</span>
      {getMessage()}
    </span>
  )
}

// Variant for un-nominated restaurants
export function NominatePromptBadge({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        bg-gray-100 text-gray-600 border border-gray-200
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <span>📍</span>
      Be the first to nominate!
    </span>
  )
}
