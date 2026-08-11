/**
 * Completeness Calculation
 *
 * Calculates how "complete" a restaurant's Group Nom data is,
 * encouraging users to fill in missing information.
 */

import type { Nomination, RestaurantEnrichment, NominationCompleteness } from './types'

/**
 * Calculate completeness score for a restaurant
 *
 * Fields tracked:
 * - Has nominations (20%)
 * - Has hours notes (20%)
 * - Has menu URL (20%)
 * - Has parking notes (20%)
 * - Has favorite dishes from any nomination (20%)
 */
export function calculateCompleteness(
  nominationCount: number,
  enrichment: RestaurantEnrichment | null,
  nominations: Nomination[]
): NominationCompleteness {
  const hasNominations = nominationCount > 0
  const hasHours = !!enrichment?.hoursNotes
  const hasMenu = !!enrichment?.menuUrl
  const hasParking = !!enrichment?.parkingNotes
  const hasFavoriteDishes = nominations.some(n => n.myFavoriteDishes && n.myFavoriteDishes.length > 0)

  // Calculate score
  const fields = [hasNominations, hasHours, hasMenu, hasParking, hasFavoriteDishes]
  const completenessScore = Math.round((fields.filter(Boolean).length / fields.length) * 100)

  // Determine missing fields
  const missingFields: string[] = []
  if (!hasNominations) missingFields.push('nomination')
  if (!hasHours) missingFields.push('hours')
  if (!hasMenu) missingFields.push('menu')
  if (!hasParking) missingFields.push('parking')
  if (!hasFavoriteDishes) missingFields.push('favorite dishes')

  return {
    hasNominations,
    nominationCount,
    hasHours,
    hasMenu,
    hasParking,
    hasFavoriteDishes,
    completenessScore,
    missingFields,
  }
}

/**
 * Get a human-readable description of what's missing
 */
export function getMissingFieldsDescription(completeness: NominationCompleteness): string {
  if (completeness.missingFields.length === 0) {
    return 'Complete!'
  }

  if (!completeness.hasNominations) {
    return 'Be the first to nominate this spot!'
  }

  const missing = completeness.missingFields.filter(f => f !== 'nomination')
  if (missing.length === 0) {
    return 'Nominated! Add more details to help others.'
  }

  if (missing.length === 1) {
    return `Missing: ${formatFieldName(missing[0])}`
  }

  if (missing.length === 2) {
    return `Missing: ${formatFieldName(missing[0])} and ${formatFieldName(missing[1])}`
  }

  return `Missing: ${missing.slice(0, -1).map(formatFieldName).join(', ')}, and ${formatFieldName(missing[missing.length - 1])}`
}

/**
 * Format field name for display
 */
function formatFieldName(field: string): string {
  const names: Record<string, string> = {
    nomination: 'nomination',
    hours: 'hours',
    menu: 'menu link',
    parking: 'parking tips',
    'favorite dishes': 'favorite dishes',
  }
  return names[field] ?? field
}

/**
 * Get call-to-action text based on completeness
 */
export function getCompletionCTA(completeness: NominationCompleteness): {
  text: string
  priority: 'high' | 'medium' | 'low'
} {
  if (!completeness.hasNominations) {
    return {
      text: 'Nominate This Spot',
      priority: 'high',
    }
  }

  if (completeness.completenessScore < 60) {
    return {
      text: 'Help Complete This Listing',
      priority: 'medium',
    }
  }

  if (completeness.completenessScore < 100) {
    return {
      text: 'Add More Details',
      priority: 'low',
    }
  }

  return {
    text: 'View Details',
    priority: 'low',
  }
}

/**
 * Get badge text for nomination count
 */
export function getNominationBadgeText(nominationCount: number): string {
  if (nominationCount === 0) {
    return ''
  }

  if (nominationCount === 1) {
    return 'Nominated by 1 local'
  }

  return `Nominated by ${nominationCount} locals`
}

/**
 * Determine if we should show the completeness indicator
 * (Only show for nominated restaurants)
 */
export function shouldShowCompleteness(nominationCount: number): boolean {
  return nominationCount > 0
}
