/**
 * Restaurant Repository
 *
 * Data access layer for restaurant operations.
 * Handles CRUD operations and common queries.
 */

import { sql, DbRestaurant, serializeRestaurant } from './db'
import { distanceToH3Query, FINE_RESOLUTION } from './h3'

/**
 * Helper to get H3 values and resolution for spatial queries
 */
function getH3QueryParams(lat: number, lng: number, radiusKm: number) {
  const { indexes, resolution } = distanceToH3Query(lat, lng, radiusKm)
  return {
    h3Values: indexes.map(h => BigInt(`0x${h}`)),
    useFineRes: resolution === FINE_RESOLUTION,
  }
}

/**
 * Get a restaurant by GERS ID
 */
export async function getRestaurantById(gersId: string): Promise<DbRestaurant | null> {
  const results = await sql`
    SELECT * FROM restaurants WHERE gers_id = ${gersId}
  `
  return results.length > 0 ? serializeRestaurant(results[0]) : null
}

/**
 * Get multiple restaurants by GERS IDs
 */
export async function getRestaurantsByIds(gersIds: string[]): Promise<DbRestaurant[]> {
  if (gersIds.length === 0) return []

  const results = await sql`
    SELECT * FROM restaurants WHERE gers_id = ANY(${gersIds})
  `
  return results.map(serializeRestaurant)
}

/**
 * Get restaurants near a location
 */
export async function getRestaurantsNearby(
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number = 50
): Promise<DbRestaurant[]> {
  const { h3Values, useFineRes } = getH3QueryParams(lat, lng, radiusKm)

  const results = useFineRes
    ? await sql`
        SELECT * FROM restaurants
        WHERE h3_index_res9 = ANY(${h3Values}::bigint[])
        LIMIT ${limit}
      `
    : await sql`
        SELECT * FROM restaurants
        WHERE h3_index_res8 = ANY(${h3Values}::bigint[])
        LIMIT ${limit}
      `
  return results.map(serializeRestaurant)
}

/**
 * Search restaurants by name
 */
export async function searchRestaurantsByName(
  query: string,
  lat?: number,
  lng?: number,
  limit: number = 20
): Promise<DbRestaurant[]> {
  // If location provided, prefer nearby results
  if (lat !== undefined && lng !== undefined) {
    const { h3Values, useFineRes } = getH3QueryParams(lat, lng, 10) // 10km radius

    const results = useFineRes
      ? await sql`
          SELECT *, similarity(name, ${query}) as sim
          FROM restaurants
          WHERE h3_index_res9 = ANY(${h3Values}::bigint[])
            AND name % ${query}
          ORDER BY sim DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT *, similarity(name, ${query}) as sim
          FROM restaurants
          WHERE h3_index_res8 = ANY(${h3Values}::bigint[])
            AND name % ${query}
          ORDER BY sim DESC
          LIMIT ${limit}
        `
    return results.map(serializeRestaurant)
  }

  // No location - just text search
  const results = await sql`
    SELECT *, similarity(name, ${query}) as sim
    FROM restaurants
    WHERE name % ${query}
    ORDER BY sim DESC
    LIMIT ${limit}
  `
  return results.map(serializeRestaurant)
}

/**
 * Get restaurants by category
 */
export async function getRestaurantsByCategory(
  category: string,
  city?: string,
  limit: number = 50
): Promise<DbRestaurant[]> {
  const normalizedCategory = category.toLowerCase().replace(/ /g, '_')

  if (city) {
    const results = await sql`
      SELECT * FROM restaurants
      WHERE ${normalizedCategory} = ANY(categories)
        AND LOWER(city) = LOWER(${city})
      LIMIT ${limit}
    `
    return results.map(serializeRestaurant)
  }

  const results = await sql`
    SELECT * FROM restaurants
    WHERE ${normalizedCategory} = ANY(categories)
    LIMIT ${limit}
  `
  return results.map(serializeRestaurant)
}

/**
 * Get top-rated restaurants (by pick rate)
 */
export async function getTopRestaurants(
  city?: string,
  limit: number = 20
): Promise<DbRestaurant[]> {
  if (city) {
    const results = await sql`
      SELECT * FROM restaurants
      WHERE LOWER(city) = LOWER(${city})
        AND times_shown >= 10
        AND pick_rate IS NOT NULL
      ORDER BY pick_rate DESC
      LIMIT ${limit}
    `
    return results.map(serializeRestaurant)
  }

  const results = await sql`
    SELECT * FROM restaurants
    WHERE times_shown >= 10
      AND pick_rate IS NOT NULL
    ORDER BY pick_rate DESC
    LIMIT ${limit}
  `
  return results.map(serializeRestaurant)
}

/**
 * Get restaurants that need Foursquare linking
 */
export async function getUnlinkedRestaurants(
  limit: number = 100
): Promise<DbRestaurant[]> {
  const results = await sql`
    SELECT * FROM restaurants
    WHERE fsq_place_id IS NULL
      AND fsq_linked_at IS NULL
    ORDER BY times_shown DESC
    LIMIT ${limit}
  `
  return results.map(serializeRestaurant)
}

/**
 * Get statistics about the restaurant database
 */
export async function getRestaurantStats(): Promise<{
  totalRestaurants: number
  linkedToFoursquare: number
  withPhotos: number
  withPickRate: number
  byState: Record<string, number>
}> {
  const stats = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(fsq_place_id) as linked,
      COUNT(CASE WHEN array_length(fsq_photo_ids, 1) > 0 THEN 1 END) as with_photos,
      COUNT(pick_rate) as with_pick_rate
    FROM restaurants
  `

  const byState = await sql`
    SELECT state, COUNT(*) as count
    FROM restaurants
    WHERE state IS NOT NULL
    GROUP BY state
    ORDER BY count DESC
  `

  return {
    totalRestaurants: parseInt(stats[0].total),
    linkedToFoursquare: parseInt(stats[0].linked),
    withPhotos: parseInt(stats[0].with_photos),
    withPickRate: parseInt(stats[0].with_pick_rate),
    byState: Object.fromEntries(byState.map((r: any) => [r.state, parseInt(r.count)])),
  }
}

/**
 * Get available categories in a location
 */
export async function getCategoriesInArea(
  lat: number,
  lng: number,
  radiusKm: number = 10
): Promise<Array<{ category: string; count: number }>> {
  const { h3Values, useFineRes } = getH3QueryParams(lat, lng, radiusKm)

  const results = useFineRes
    ? await sql`
        SELECT unnest(categories) as category, COUNT(*) as count
        FROM restaurants
        WHERE h3_index_res9 = ANY(${h3Values}::bigint[])
        GROUP BY category
        ORDER BY count DESC
        LIMIT 30
      `
    : await sql`
        SELECT unnest(categories) as category, COUNT(*) as count
        FROM restaurants
        WHERE h3_index_res8 = ANY(${h3Values}::bigint[])
        GROUP BY category
        ORDER BY count DESC
        LIMIT 30
      `

  return results.map((r: any) => ({
    category: r.category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    count: parseInt(r.count),
  }))
}
