/**
 * User Profile Management for Group Nom
 *
 * Handles user profile CRUD operations using Clerk for authentication.
 */

import { sql } from './db'

export interface UserProfile {
  id: string
  clerkUserId: string
  displayName: string | null
  avatarUrl: string | null
  likeCount: number
  nominationCount: number
  createdAt: Date
}

/**
 * Get or create a user profile
 * Optionally sync display name and avatar from Clerk
 */
export async function getOrCreateProfile(
  clerkUserId: string,
  clerkData?: { displayName?: string; avatarUrl?: string }
): Promise<UserProfile> {
  // Try to get existing profile
  const existing = await sql`
    SELECT * FROM user_profiles
    WHERE clerk_user_id = ${clerkUserId}
  `

  if (existing.length > 0) {
    const profile = mapDbToProfile(existing[0])

    // Sync from Clerk if profile has no display name but Clerk data is provided
    if (!profile.displayName && clerkData?.displayName) {
      const updated = await sql`
        UPDATE user_profiles
        SET
          display_name = ${clerkData.displayName},
          avatar_url = COALESCE(${clerkData.avatarUrl ?? null}, avatar_url)
        WHERE clerk_user_id = ${clerkUserId}
        RETURNING *
      `
      if (updated.length > 0) {
        return mapDbToProfile(updated[0])
      }
    }

    return profile
  }

  // Create new profile with Clerk data if available
  const created = await sql`
    INSERT INTO user_profiles (clerk_user_id, display_name, avatar_url)
    VALUES (${clerkUserId}, ${clerkData?.displayName ?? null}, ${clerkData?.avatarUrl ?? null})
    RETURNING *
  `

  return mapDbToProfile(created[0])
}

/**
 * Get user profile by Clerk user ID
 */
export async function getProfile(clerkUserId: string): Promise<UserProfile | null> {
  const result = await sql`
    SELECT * FROM user_profiles
    WHERE clerk_user_id = ${clerkUserId}
  `

  if (result.length === 0) {
    return null
  }

  return mapDbToProfile(result[0])
}

/**
 * Update user profile
 */
export async function updateProfile(
  clerkUserId: string,
  updates: {
    displayName?: string
    avatarUrl?: string
  }
): Promise<UserProfile | null> {
  const result = await sql`
    UPDATE user_profiles
    SET
      display_name = COALESCE(${updates.displayName ?? null}, display_name),
      avatar_url = COALESCE(${updates.avatarUrl ?? null}, avatar_url)
    WHERE clerk_user_id = ${clerkUserId}
    RETURNING *
  `

  if (result.length === 0) {
    return null
  }

  return mapDbToProfile(result[0])
}

/**
 * Get user stats
 */
export async function getUserStats(clerkUserId: string): Promise<{
  likes: number
  nominations: number
  favorites: number
}> {
  const profile = await sql`
    SELECT like_count, nomination_count FROM user_profiles
    WHERE clerk_user_id = ${clerkUserId}
  `

  const favorites = await sql`
    SELECT COUNT(*) as count FROM user_favorites
    WHERE clerk_user_id = ${clerkUserId}
  `

  return {
    likes: profile.length > 0 ? profile[0].like_count : 0,
    nominations: profile.length > 0 ? profile[0].nomination_count : 0,
    favorites: favorites.length > 0 ? Number(favorites[0].count) : 0,
  }
}

// Helper to map database record to profile interface
function mapDbToProfile(db: Record<string, unknown>): UserProfile {
  return {
    id: db.id as string,
    clerkUserId: db.clerk_user_id as string,
    displayName: db.display_name as string | null,
    avatarUrl: db.avatar_url as string | null,
    likeCount: db.like_count as number,
    nominationCount: db.nomination_count as number,
    createdAt: db.created_at as Date,
  }
}
