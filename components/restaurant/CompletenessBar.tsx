'use client'

import type { NominationCompleteness } from '@/lib/types'

interface CompletenessBarProps {
  completeness: NominationCompleteness
  showDetails?: boolean
  className?: string
}

export default function CompletenessBar({
  completeness,
  showDetails = true,
  className = '',
}: CompletenessBarProps) {
  const { completenessScore, missingFields, hasNominations } = completeness

  // Don't show for un-nominated restaurants
  if (!hasNominations) {
    return null
  }

  const getBarColor = () => {
    if (completenessScore >= 80) return 'bg-green-500'
    if (completenessScore >= 60) return 'bg-yellow-500'
    if (completenessScore >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const formatMissingField = (field: string) => {
    const names: Record<string, string> = {
      hours: 'hours',
      menu: 'menu',
      parking: 'parking',
      'favorite dishes': 'dishes',
    }
    return names[field] || field
  }

  const filteredMissing = missingFields.filter(f => f !== 'nomination')

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getBarColor()} transition-all duration-300`}
            style={{ width: `${completenessScore}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-500 w-10">
          {completenessScore}%
        </span>
      </div>

      {/* Missing fields */}
      {showDetails && filteredMissing.length > 0 && (
        <p className="text-xs text-gray-500">
          Missing: {filteredMissing.map(formatMissingField).join(', ')}
        </p>
      )}
    </div>
  )
}

// Compact inline version
export function CompletenessIndicator({
  completenessScore,
  className = '',
}: {
  completenessScore: number
  className?: string
}) {
  const getColor = () => {
    if (completenessScore >= 80) return 'text-green-600 bg-green-50'
    if (completenessScore >= 60) return 'text-yellow-600 bg-yellow-50'
    if (completenessScore >= 40) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
        ${getColor()}
        ${className}
      `}
    >
      {completenessScore}% complete
    </span>
  )
}
