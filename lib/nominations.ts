/**
 * Nominations Management
 *
 * Handles nomination CRUD operations - the personal endorsements
 * that form the core UGC layer of Group Nom.
 */

import { sql } from './db'
import type { Nomination, GoodForTag } from './types'

// ============================================================================
// Database Row Types
// ============================================================================

interface DbNomination {
  id: string
  gers_id: string
  clerk_user_id: string
  photo_url: string
  why_i_love_it: string
  my_favorite_dishes: string[]
  good_for: string[]
  created_at: Date
  // Joined fields
  display_name?: string
  avatar_url?: string
}

// ============================================================================
// Serialization
// ============================================================================

function serializeNomination(row: DbNomination): Nomination {
  return {
    id: row.id,
    gersId: row.gers_id,
    clerkUserId: row.clerk_user_id,
    photoUrl: row.photo_url,
    whyILoveIt: row.why_i_love_it,
    myFavoriteDishes: row.my_favorite_dishes ?? [],
    goodFor: (row.good_for ?? []) as GoodForTag[],
    createdAt: row.created_at,
    user: row.display_name !== undefined ? {
      displayName: row.display_name ?? undefined,
      avatarUrl: row.avatar_url ?? undefined,
    } : undefined,
  }
}

// ============================================================================
// Nomination CRUD
// ============================================================================

/**
 * Create a new nomination (quick capture: photo + why I love it)
 */
export async function createNomination(
  gersId: string,
  clerkUserId: string,
  photoUrl: string,
  whyILoveIt: string
): Promise<Nomination> {
  const rows = await sql`
    INSERT INTO nominations (gers_id, clerk_user_id, photo_url, why_i_love_it)
    VALUES (${gersId}, ${clerkUserId}, ${photoUrl}, ${whyILoveIt})
    RETURNING *
  `

  return serializeNomination(rows[0] as DbNomination)
}

/**
 * Update a nomination with additional details (progressive enrichment)
 */
export async function updateNomination(
  nominationId: string,
  clerkUserId: string,
  updates: {
    myFavoriteDishes?: string[]
    goodFor?: GoodForTag[]
  }
): Promise<Nomination | null> {
  const rows = await sql`
    UPDATE nominations SET
      my_favorite_dishes = COALESCE(${updates.myFavoriteDishes ?? null}::text[], my_favorite_dishes),
      good_for = COALESCE(${updates.goodFor ?? null}::text[], good_for)
    WHERE id = ${nominationId}::uuid AND clerk_user_id = ${clerkUserId}
    RETURNING *
  `

  if (rows.length === 0) {
    return null
  }

  return serializeNomination(rows[0] as DbNomination)
}

/**
 * Delete a nomination
 */
export async function deleteNomination(
  nominationId: string,
  clerkUserId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM nominations
    WHERE id = ${nominationId}::uuid AND clerk_user_id = ${clerkUserId}
    RETURNING id
  `

  return rows.length > 0
}

/**
 * Get a user's nomination for a specific restaurant
 */
export async function getUserNomination(
  gersId: string,
  clerkUserId: string
): Promise<Nomination | null> {
  const rows = await sql`
    SELECT n.*, up.display_name, up.avatar_url
    FROM nominations n
    LEFT JOIN user_profiles up ON n.clerk_user_id = up.clerk_user_id
    WHERE n.gers_id = ${gersId} AND n.clerk_user_id = ${clerkUserId}
  `

  if (rows.length === 0) {
    return null
  }

  return serializeNomination(rows[0] as DbNomination)
}

/**
 * Get all nominations for a restaurant
 */
export async function getRestaurantNominations(
  gersId: string,
  limit = 20
): Promise<Nomination[]> {
  const rows = await sql`
    SELECT n.*, up.display_name, up.avatar_url
    FROM nominations n
    LEFT JOIN user_profiles up ON n.clerk_user_id = up.clerk_user_id
    WHERE n.gers_id = ${gersId}
    ORDER BY n.created_at DESC
    LIMIT ${limit}
  `

  return rows.map(row => serializeNomination(row as DbNomination))
}

/**
 * Get all nominations by a user
 */
export async function getUserNominations(
  clerkUserId: string,
  limit = 50
): Promise<Nomination[]> {
  const rows = await sql`
    SELECT n.*, up.display_name, up.avatar_url
    FROM nominations n
    LEFT JOIN user_profiles up ON n.clerk_user_id = up.clerk_user_id
    WHERE n.clerk_user_id = ${clerkUserId}
    ORDER BY n.created_at DESC
    LIMIT ${limit}
  `

  return rows.map(row => serializeNomination(row as DbNomination))
}

/**
 * Check if a restaurant has been nominated
 */
export async function isRestaurantNominated(gersId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM nominations WHERE gers_id = ${gersId} LIMIT 1
  `
  return rows.length > 0
}

/**
 * Get nomination count for a restaurant
 */
export async function getNominationCount(gersId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*) as count FROM nominations WHERE gers_id = ${gersId}
  `
  return parseInt(rows[0].count, 10)
}

/**
 * Get co-nominators (other users who nominated the same restaurants as the given user)
 */
export async function getCoNominators(
  clerkUserId: string,
  gersId: string
): Promise<Array<{ clerkUserId: string; displayName?: string; avatarUrl?: string }>> {
  const rows = await sql`
    SELECT n.clerk_user_id, up.display_name, up.avatar_url
    FROM nominations n
    LEFT JOIN user_profiles up ON n.clerk_user_id = up.clerk_user_id
    WHERE n.gers_id = ${gersId}
      AND n.clerk_user_id != ${clerkUserId}
    ORDER BY n.created_at DESC
    LIMIT 10
  `

  return rows.map(row => ({
    clerkUserId: row.clerk_user_id,
    displayName: row.display_name ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
  }))
}

/**
 * Get users who need to complete their nominations (have nominations without favorite dishes)
 */
export async function getIncompleteNominations(
  clerkUserId: string
): Promise<Nomination[]> {
  const rows = await sql`
    SELECT n.*, up.display_name, up.avatar_url
    FROM nominations n
    LEFT JOIN user_profiles up ON n.clerk_user_id = up.clerk_user_id
    WHERE n.clerk_user_id = ${clerkUserId}
      AND (n.my_favorite_dishes IS NULL OR array_length(n.my_favorite_dishes, 1) IS NULL)
    ORDER BY n.created_at DESC
    LIMIT 10
  `

  return rows.map(row => serializeNomination(row as DbNomination))
}
