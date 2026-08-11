/**
 * Social Features
 *
 * Handles social interactions like co-nominators, backers, and social proof.
 */

import { sql } from './db'

// ============================================================================
// Types
// ============================================================================

export interface CoNominator {
  clerkUserId: string
  displayName?: string
  avatarUrl?: string
  nominatedAt: Date
}

export interface BackerInfo {
  totalBackers: number
  recentBackers: CoNominator[]
}

export interface UserSocialStats {
  nominationsCount: number
  totalBackers: number        // Others who also nominated your spots
  sharedNominations: number   // Restaurants you've both nominated with others
}

// ============================================================================
// Co-Nominators (Others who nominated the same restaurant)
// ============================================================================

/**
 * Get users who also nominated a specific restaurant
 */
export async function getCoNominators(
  gersId: string,
  excludeUserId?: string,
  limit = 10
): Promise<CoNominator[]> {
  const rows = excludeUserId
    ? await sql`
        SELECT n.clerk_user_id, up.display_name, up.avatar_url, n.created_at as nominated_at
        FROM nominations n
        LEFT JOIN user_profiles up ON n.clerk_user_id = up.clerk_user_id
        WHERE n.gers_id = ${gersId}
          AND n.clerk_user_id != ${excludeUserId}
        ORDER BY n.created_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT n.clerk_user_id, up.display_name, up.avatar_url, n.created_at as nominated_at
        FROM nominations n
        LEFT JOIN user_profiles up ON n.clerk_user_id = up.clerk_user_id
        WHERE n.gers_id = ${gersId}
        ORDER BY n.created_at DESC
        LIMIT ${limit}
      `

  return rows.map(row => ({
    clerkUserId: row.clerk_user_id,
    displayName: row.display_name ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    nominatedAt: row.nominated_at,
  }))
}

/**
 * Get count of co-nominators for a restaurant
 */
export async function getCoNominatorCount(
  gersId: string,
  excludeUserId?: string
): Promise<number> {
  const rows = excludeUserId
    ? await sql`
        SELECT COUNT(*) as count
        FROM nominations
        WHERE gers_id = ${gersId} AND clerk_user_id != ${excludeUserId}
      `
    : await sql`
        SELECT COUNT(*) as count
        FROM nominations
        WHERE gers_id = ${gersId}
      `

  return parseInt(rows[0].count, 10)
}

// ============================================================================
// Backers (Others who nominated the same restaurants as a user)
// ============================================================================

/**
 * Get users who also nominated any of the restaurants a user has nominated
 * (These are your "backers" - social proof that others agree with your picks)
 */
export async function getBackers(
  clerkUserId: string,
  limit = 20
): Promise<BackerInfo> {
  // Count total unique backers
  const countRows = await sql`
    SELECT COUNT(DISTINCT n2.clerk_user_id) as total
    FROM nominations n1
    JOIN nominations n2 ON n1.gers_id = n2.gers_id AND n1.clerk_user_id != n2.clerk_user_id
    WHERE n1.clerk_user_id = ${clerkUserId}
  `
  const totalBackers = parseInt(countRows[0].total, 10)

  // Get recent backers with details
  const backerRows = await sql`
    SELECT DISTINCT ON (n2.clerk_user_id)
      n2.clerk_user_id,
      up.display_name,
      up.avatar_url,
      n2.created_at as nominated_at
    FROM nominations n1
    JOIN nominations n2 ON n1.gers_id = n2.gers_id AND n1.clerk_user_id != n2.clerk_user_id
    LEFT JOIN user_profiles up ON n2.clerk_user_id = up.clerk_user_id
    WHERE n1.clerk_user_id = ${clerkUserId}
    ORDER BY n2.clerk_user_id, n2.created_at DESC
    LIMIT ${limit}
  `

  const recentBackers: CoNominator[] = backerRows.map(row => ({
    clerkUserId: row.clerk_user_id,
    displayName: row.display_name ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    nominatedAt: row.nominated_at,
  }))

  return {
    totalBackers,
    recentBackers,
  }
}

/**
 * Get count of unique backers for a user
 */
export async function getBackerCount(clerkUserId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(DISTINCT n2.clerk_user_id) as count
    FROM nominations n1
    JOIN nominations n2 ON n1.gers_id = n2.gers_id AND n1.clerk_user_id != n2.clerk_user_id
    WHERE n1.clerk_user_id = ${clerkUserId}
  `
  return parseInt(rows[0].count, 10)
}

// ============================================================================
// Social Stats
// ============================================================================

/**
 * Get comprehensive social stats for a user
 */
export async function getUserSocialStats(clerkUserId: string): Promise<UserSocialStats> {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*) FROM nominations WHERE clerk_user_id = ${clerkUserId}) as nominations_count,
      (
        SELECT COUNT(DISTINCT n2.clerk_user_id)
        FROM nominations n1
        JOIN nominations n2 ON n1.gers_id = n2.gers_id AND n1.clerk_user_id != n2.clerk_user_id
        WHERE n1.clerk_user_id = ${clerkUserId}
      ) as total_backers,
      (
        SELECT COUNT(DISTINCT n1.gers_id)
        FROM nominations n1
        WHERE n1.clerk_user_id = ${clerkUserId}
          AND EXISTS (
            SELECT 1 FROM nominations n2
            WHERE n2.gers_id = n1.gers_id AND n2.clerk_user_id != n1.clerk_user_id
          )
      ) as shared_nominations
  `

  return {
    nominationsCount: parseInt(rows[0].nominations_count, 10),
    totalBackers: parseInt(rows[0].total_backers, 10),
    sharedNominations: parseInt(rows[0].shared_nominations, 10),
  }
}

// ============================================================================
// Social Messages
// ============================================================================

/**
 * Generate a social proof message for co-nominators
 */
export function getCoNominatorMessage(
  nominationCount: number,
  userHasNominated: boolean
): string {
  if (nominationCount === 0) {
    return ''
  }

  if (userHasNominated) {
    if (nominationCount === 1) {
      return 'You nominated this spot!'
    }
    return `You and ${nominationCount - 1} other${nominationCount > 2 ? 's' : ''} nominated this spot!`
  }

  if (nominationCount === 1) {
    return 'Nominated by 1 local'
  }
  return `Nominated by ${nominationCount} locals`
}

/**
 * Generate a backer message for a user's profile
 */
export function getBackerMessage(backerCount: number): string {
  if (backerCount === 0) {
    return 'Be the first to get backers by nominating popular spots!'
  }

  if (backerCount === 1) {
    return '1 local backs your nominations'
  }

  return `${backerCount} locals back your nominations`
}
