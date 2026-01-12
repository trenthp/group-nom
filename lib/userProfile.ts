/**
 * User Profile Management
 *
 * Handles user profile CRUD operations linked to Clerk authentication.
 */

import { sql } from './db'
import type { UserProfile, UserStats } from './types'

// ============================================================================
// Database Row Types
// ============================================================================

interface DbUserProfile {
  clerk_user_id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  default_lat: number
  default_lng: number
  default_city: string
  nomination_count: number
  enrichment_count: number
  created_at: Date
  updated_at: Date
}

// ============================================================================
// Serialization
// ============================================================================

function serializeProfile(row: DbUserProfile): UserProfile {
  return {
    clerkUserId: row.clerk_user_id,
    email: row.email,
    displayName: row.display_name ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    defaultLat: row.default_lat,
    defaultLng: row.default_lng,
    defaultCity: row.default_city,
    nominationCount: row.nomination_count,
    enrichmentCount: row.enrichment_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ============================================================================
// Profile CRUD
// ============================================================================

/**
 * Get a user profile by Clerk user ID
 */
export async function getProfile(clerkUserId: string): Promise<UserProfile | null> {
  const rows = await sql`
    SELECT * FROM user_profiles WHERE clerk_user_id = ${clerkUserId}
  `

  if (rows.length === 0) {
    return null
  }

  return serializeProfile(rows[0] as DbUserProfile)
}

/**
 * Get or create a user profile.
 * Called on first sign-in to ensure profile exists.
 */
export async function getOrCreateProfile(
  clerkUserId: string,
  email: string,
  displayName?: string,
  avatarUrl?: string
): Promise<UserProfile> {
  // Try to insert, on conflict return existing
  const rows = await sql`
    INSERT INTO user_profiles (clerk_user_id, email, display_name, avatar_url)
    VALUES (${clerkUserId}, ${email}, ${displayName ?? null}, ${avatarUrl ?? null})
    ON CONFLICT (clerk_user_id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
      updated_at = NOW()
    RETURNING *
  `

  return serializeProfile(rows[0] as DbUserProfile)
}

/**
 * Update a user profile
 */
export async function updateProfile(
  clerkUserId: string,
  updates: {
    displayName?: string
    avatarUrl?: string
    defaultLat?: number
    defaultLng?: number
    defaultCity?: string
  }
): Promise<UserProfile | null> {
  const rows = await sql`
    UPDATE user_profiles SET
      display_name = COALESCE(${updates.displayName ?? null}, display_name),
      avatar_url = COALESCE(${updates.avatarUrl ?? null}, avatar_url),
      default_lat = COALESCE(${updates.defaultLat ?? null}, default_lat),
      default_lng = COALESCE(${updates.defaultLng ?? null}, default_lng),
      default_city = COALESCE(${updates.defaultCity ?? null}, default_city),
      updated_at = NOW()
    WHERE clerk_user_id = ${clerkUserId}
    RETURNING *
  `

  if (rows.length === 0) {
    return null
  }

  return serializeProfile(rows[0] as DbUserProfile)
}

// ============================================================================
// User Stats
// ============================================================================

/**
 * Get detailed stats for a user
 */
export async function getUserStats(clerkUserId: string): Promise<UserStats | null> {
  const rows = await sql`
    SELECT
      up.nomination_count as nominations,
      up.enrichment_count as enrichments,
      (SELECT COUNT(*) FROM user_favorites uf WHERE uf.clerk_user_id = up.clerk_user_id) as favorites,
      (
        SELECT COUNT(DISTINCT n2.clerk_user_id)
        FROM nominations n1
        JOIN nominations n2 ON n1.gers_id = n2.gers_id AND n1.clerk_user_id != n2.clerk_user_id
        WHERE n1.clerk_user_id = up.clerk_user_id
      ) as backers
    FROM user_profiles up
    WHERE up.clerk_user_id = ${clerkUserId}
  `

  if (rows.length === 0) {
    return null
  }

  const row = rows[0] as { nominations: number; enrichments: number; favorites: string; backers: string }
  return {
    nominations: row.nominations,
    enrichments: row.enrichments,
    favorites: parseInt(row.favorites, 10),
    backers: parseInt(row.backers, 10),
  }
}

/**
 * Increment enrichment count when user adds factual data
 */
export async function incrementEnrichmentCount(clerkUserId: string): Promise<void> {
  await sql`
    UPDATE user_profiles
    SET enrichment_count = enrichment_count + 1
    WHERE clerk_user_id = ${clerkUserId}
  `
}
