/**
 * Favorites Management for Group Nom
 *
 * Handles user favorites (liked restaurants) with local_id linking.
 * When a user "likes" a restaurant, we match it to our local database
 * and store the reference for data ownership.
 */

import { sql } from './db'
import { matchOrCreateRestaurant, GooglePlace } from './restaurantMatcher'

export interface UserFavorite {
  id: string
  clerkUserId: string
  localId: string
  googlePlaceId: string | null
  source: 'swipe' | 'group_vote' | 'nomination'
  createdAt: Date
}

export interface FavoriteWithRestaurant extends UserFavorite {
  restaurantName: string
  restaurantAddress: string | null
  restaurantCity: string | null
  restaurantLat: number
  restaurantLng: number
  restaurantCategories: string[]
  likeCount: number
}

/**
 * Add a restaurant to user's favorites (from Google Places data)
 * This is the main entry point when a user swipes right
 */
export async function addFavorite(
  clerkUserId: string,
  googlePlace: GooglePlace,
  source: 'swipe' | 'group_vote' | 'nomination' = 'swipe'
): Promise<UserFavorite> {
  // Match or create the restaurant in our local database
  const localId = await matchOrCreateRestaurant(googlePlace)

  // Add to favorites (upsert to handle duplicates)
  const result = await sql`
    INSERT INTO user_favorites (clerk_user_id, local_id, google_place_id, source)
    VALUES (${clerkUserId}, ${localId}, ${googlePlace.place_id}, ${source})
    ON CONFLICT (clerk_user_id, local_id) DO UPDATE
    SET source = EXCLUDED.source
    RETURNING *
  `

  // Increment like counts
  await sql`SELECT increment_like_count(${localId}, ${clerkUserId})`

  return mapDbToFavorite(result[0])
}

/**
 * Add a favorite by local_id (when we already have the local reference)
 */
export async function addFavoriteByLocalId(
  clerkUserId: string,
  localId: string,
  googlePlaceId: string | null = null,
  source: 'swipe' | 'group_vote' | 'nomination' = 'swipe'
): Promise<UserFavorite> {
  const result = await sql`
    INSERT INTO user_favorites (clerk_user_id, local_id, google_place_id, source)
    VALUES (${clerkUserId}, ${localId}, ${googlePlaceId}, ${source})
    ON CONFLICT (clerk_user_id, local_id) DO UPDATE
    SET source = EXCLUDED.source
    RETURNING *
  `

  // Increment like counts
  await sql`SELECT increment_like_count(${localId}, ${clerkUserId})`

  return mapDbToFavorite(result[0])
}

/**
 * Remove a restaurant from user's favorites
 */
export async function removeFavorite(
  clerkUserId: string,
  localId: string
): Promise<boolean> {
  const result = await sql`
    DELETE FROM user_favorites
    WHERE clerk_user_id = ${clerkUserId}
    AND local_id = ${localId}
    RETURNING id
  `

  if (result.length > 0) {
    // Decrement like counts
    await sql`
      UPDATE restaurants
      SET like_count = GREATEST(0, like_count - 1),
          updated_at = NOW()
      WHERE gers_id = ${localId}
    `

    await sql`
      UPDATE user_profiles
      SET like_count = GREATEST(0, like_count - 1)
      WHERE clerk_user_id = ${clerkUserId}
    `
  }

  return result.length > 0
}

/**
 * Get all favorites for a user with restaurant details
 */
export async function getFavorites(
  clerkUserId: string,
  limit: number = 50,
  offset: number = 0
): Promise<FavoriteWithRestaurant[]> {
  const results = await sql`
    SELECT
      f.id,
      f.clerk_user_id,
      f.local_id,
      f.google_place_id,
      f.source,
      f.created_at,
      r.name as restaurant_name,
      r.address as restaurant_address,
      r.city as restaurant_city,
      r.lat as restaurant_lat,
      r.lng as restaurant_lng,
      r.categories as restaurant_categories,
      r.like_count
    FROM user_favorites f
    JOIN restaurants r ON f.local_id = r.gers_id
    WHERE f.clerk_user_id = ${clerkUserId}
    ORDER BY f.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `

  return results.map(mapDbToFavoriteWithRestaurant)
}

/**
 * Check if a restaurant is in user's favorites
 */
export async function isFavorite(
  clerkUserId: string,
  localId: string
): Promise<boolean> {
  const result = await sql`
    SELECT 1 FROM user_favorites
    WHERE clerk_user_id = ${clerkUserId}
    AND local_id = ${localId}
    LIMIT 1
  `
  return result.length > 0
}

/**
 * Check if multiple restaurants are in user's favorites (batch)
 */
export async function getFavoriteStatus(
  clerkUserId: string,
  localIds: string[]
): Promise<Set<string>> {
  if (localIds.length === 0) {
    return new Set()
  }

  const results = await sql`
    SELECT local_id FROM user_favorites
    WHERE clerk_user_id = ${clerkUserId}
    AND local_id = ANY(${localIds})
  `

  return new Set(results.map(r => r.local_id))
}

/**
 * Get favorite count for a user
 */
export async function getFavoriteCount(clerkUserId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count FROM user_favorites
    WHERE clerk_user_id = ${clerkUserId}
  `
  return Number(result[0]?.count || 0)
}

/**
 * Get recent favorites for display (e.g., "Pick from your favorites" in group creation)
 */
export async function getRecentFavorites(
  clerkUserId: string,
  limit: number = 10
): Promise<FavoriteWithRestaurant[]> {
  return getFavorites(clerkUserId, limit, 0)
}

// Helper functions to map database records
function mapDbToFavorite(db: Record<string, unknown>): UserFavorite {
  return {
    id: db.id as string,
    clerkUserId: db.clerk_user_id as string,
    localId: db.local_id as string,
    googlePlaceId: db.google_place_id as string | null,
    source: db.source as 'swipe' | 'group_vote' | 'nomination',
    createdAt: db.created_at as Date,
  }
}

function mapDbToFavoriteWithRestaurant(db: Record<string, unknown>): FavoriteWithRestaurant {
  return {
    ...mapDbToFavorite(db),
    restaurantName: db.restaurant_name as string,
    restaurantAddress: db.restaurant_address as string | null,
    restaurantCity: db.restaurant_city as string | null,
    restaurantLat: db.restaurant_lat as number,
    restaurantLng: db.restaurant_lng as number,
    restaurantCategories: db.restaurant_categories as string[],
    likeCount: db.like_count as number,
  }
}
