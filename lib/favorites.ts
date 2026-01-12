/**
 * User Favorites Management
 *
 * Handles saving and retrieving user's favorite restaurants.
 */

import { sql } from './db'
import type { UserFavorite, FavoriteSource } from './types'

// ============================================================================
// Database Row Types
// ============================================================================

interface DbUserFavorite {
  id: string
  clerk_user_id: string
  gers_id: string
  source: string
  created_at: Date
  // Joined restaurant data
  name?: string
  address?: string
  city?: string
  lat?: number
  lng?: number
  ta_photo_urls?: string[]
  ta_price_level?: string
  nomination_count?: number
}

// ============================================================================
// Serialization
// ============================================================================

function serializeFavorite(row: DbUserFavorite): UserFavorite {
  const favorite: UserFavorite = {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    gersId: row.gers_id,
    source: row.source as FavoriteSource,
    createdAt: row.created_at,
  }

  // Include restaurant data if joined
  if (row.name) {
    favorite.restaurant = {
      id: row.gers_id,
      name: row.name,
      address: [row.address, row.city].filter(Boolean).join(', '),
      rating: 0,
      reviewCount: 0,
      cuisines: [],
      imageUrl: row.ta_photo_urls?.[0],
      lat: row.lat ?? 0,
      lng: row.lng ?? 0,
      priceLevel: row.ta_price_level ?? undefined,
    }
  }

  return favorite
}

// ============================================================================
// Favorites CRUD
// ============================================================================

/**
 * Add a restaurant to favorites
 */
export async function addFavorite(
  clerkUserId: string,
  gersId: string,
  source: FavoriteSource = 'discover'
): Promise<UserFavorite> {
  const rows = await sql`
    INSERT INTO user_favorites (clerk_user_id, gers_id, source)
    VALUES (${clerkUserId}, ${gersId}, ${source})
    ON CONFLICT (clerk_user_id, gers_id) DO UPDATE SET
      source = EXCLUDED.source
    RETURNING *
  `

  return serializeFavorite(rows[0] as DbUserFavorite)
}

/**
 * Remove a restaurant from favorites
 */
export async function removeFavorite(
  clerkUserId: string,
  gersId: string
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM user_favorites
    WHERE clerk_user_id = ${clerkUserId} AND gers_id = ${gersId}
    RETURNING id
  `

  return rows.length > 0
}

/**
 * Check if a restaurant is in user's favorites
 */
export async function isFavorite(
  clerkUserId: string,
  gersId: string
): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM user_favorites
    WHERE clerk_user_id = ${clerkUserId} AND gers_id = ${gersId}
    LIMIT 1
  `

  return rows.length > 0
}

/**
 * Get user's favorites with restaurant data
 */
export async function getUserFavorites(
  clerkUserId: string,
  options: {
    limit?: number
    source?: FavoriteSource
  } = {}
): Promise<UserFavorite[]> {
  const { limit = 50, source } = options

  const rows = source
    ? await sql`
        SELECT
          uf.*,
          r.name, r.address, r.city, r.lat, r.lng,
          r.ta_photo_urls, r.ta_price_level, r.nomination_count
        FROM user_favorites uf
        JOIN restaurants r ON uf.gers_id = r.gers_id
        WHERE uf.clerk_user_id = ${clerkUserId}
          AND uf.source = ${source}
        ORDER BY uf.created_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT
          uf.*,
          r.name, r.address, r.city, r.lat, r.lng,
          r.ta_photo_urls, r.ta_price_level, r.nomination_count
        FROM user_favorites uf
        JOIN restaurants r ON uf.gers_id = r.gers_id
        WHERE uf.clerk_user_id = ${clerkUserId}
        ORDER BY uf.created_at DESC
        LIMIT ${limit}
      `

  return rows.map(row => serializeFavorite(row as DbUserFavorite))
}

/**
 * Get count of user's favorites
 */
export async function getFavoriteCount(clerkUserId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*) as count
    FROM user_favorites
    WHERE clerk_user_id = ${clerkUserId}
  `

  return parseInt(rows[0].count, 10)
}

/**
 * Get favorite IDs for quick lookup (useful for UI)
 */
export async function getFavoriteIds(clerkUserId: string): Promise<Set<string>> {
  const rows = await sql`
    SELECT gers_id FROM user_favorites
    WHERE clerk_user_id = ${clerkUserId}
  `

  return new Set(rows.map(row => row.gers_id))
}
