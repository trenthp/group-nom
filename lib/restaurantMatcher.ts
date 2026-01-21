/**
 * Restaurant Matcher for Group Nom
 *
 * Handles matching Google Places restaurants to our local database.
 * When a user "likes" a restaurant, we:
 * 1. Check if we've seen this Google Place ID before
 * 2. If not, try to match to existing Overture data by name + location
 * 3. If no match, create a new record sourced from Google
 */

import { sql, LocalRestaurantData } from './db'

// ==============================================
// FEATURE FLAGS
// ==============================================

/**
 * When true, pickRate will influence restaurant selection scoring.
 * Disabled by default to prevent early data from self-reinforcing.
 * Enable once you have sufficient data across many restaurants.
 */
export const ENABLE_PICK_RATE_SCORING = false

export interface GooglePlace {
  place_id: string
  name: string
  address: string
  lat: number
  lng: number
  categories?: string[]
  city?: string
  state?: string
}

/**
 * Match a Google Place to our local database, creating a record if needed.
 * Returns the local_id (gers_id) for the restaurant.
 */
export async function matchOrCreateRestaurant(googlePlace: GooglePlace): Promise<string> {
  // 1. Check if already mapped
  const existing = await sql`
    SELECT local_id FROM restaurant_mappings
    WHERE google_place_id = ${googlePlace.place_id}
  `
  if (existing.length > 0) {
    return existing[0].local_id
  }

  // 2. Try to match to existing restaurant by name + location
  // Using a simple distance calculation (not PostGIS for simplicity)
  // Match if name is similar and within ~100 meters
  const match = await sql`
    SELECT gers_id FROM restaurants
    WHERE LOWER(name) = LOWER(${googlePlace.name})
    AND ABS(lat - ${googlePlace.lat}) < 0.001
    AND ABS(lng - ${googlePlace.lng}) < 0.001
    LIMIT 1
  `

  if (match.length > 0) {
    // Link Google ID to existing record
    await sql`
      INSERT INTO restaurant_mappings (google_place_id, local_id, source)
      VALUES (${googlePlace.place_id}, ${match[0].gers_id}, 'overture')
    `
    return match[0].gers_id
  }

  // 3. No match - create new record from Google data
  const newId = `gpl_${googlePlace.place_id}`

  await sql`
    INSERT INTO restaurants (gers_id, name, address, city, state, lat, lng, categories, source)
    VALUES (
      ${newId},
      ${googlePlace.name},
      ${googlePlace.address},
      ${googlePlace.city || null},
      ${googlePlace.state || null},
      ${googlePlace.lat},
      ${googlePlace.lng},
      ${googlePlace.categories || []},
      'google'
    )
  `

  await sql`
    INSERT INTO restaurant_mappings (google_place_id, local_id, source)
    VALUES (${googlePlace.place_id}, ${newId}, 'google')
  `

  // Update chain detection
  await sql`SELECT update_chain_detection(${googlePlace.name})`

  return newId
}

/**
 * Get local data for multiple Google Place IDs (for scoring)
 */
export async function getLocalDataForPlaces(
  placeIds: string[]
): Promise<Map<string, LocalRestaurantData>> {
  if (placeIds.length === 0) {
    return new Map()
  }

  const results = await sql`
    SELECT
      rm.google_place_id,
      rm.local_id,
      rm.times_shown,
      rm.times_picked,
      CASE WHEN rm.times_shown >= 5
        THEN rm.times_picked::real / rm.times_shown
        ELSE NULL
      END as pick_rate,
      r.like_count
    FROM restaurant_mappings rm
    JOIN restaurants r ON rm.local_id = r.gers_id
    WHERE rm.google_place_id = ANY(${placeIds})
  `

  const map = new Map<string, LocalRestaurantData>()
  for (const row of results) {
    map.set(row.google_place_id, {
      local_id: row.local_id,
      like_count: row.like_count,
      times_shown: row.times_shown,
      times_picked: row.times_picked,
      pick_rate: row.pick_rate,
    })
  }

  return map
}

/**
 * Increment times_shown for restaurants shown in a session
 */
export async function incrementTimesShown(placeIds: string[]): Promise<void> {
  if (placeIds.length === 0) return

  await sql`
    UPDATE restaurant_mappings
    SET times_shown = times_shown + 1
    WHERE google_place_id = ANY(${placeIds})
  `
}

/**
 * Ensure mappings exist for all given Google Places.
 * Creates minimal mappings for any places not yet tracked.
 * This enables analytics tracking for ALL restaurants shown, not just liked ones.
 */
export async function ensureMappingsExist(
  places: GooglePlace[]
): Promise<void> {
  if (places.length === 0) return

  // Get existing mappings
  const placeIds = places.map(p => p.place_id)
  const existing = await sql`
    SELECT google_place_id FROM restaurant_mappings
    WHERE google_place_id = ANY(${placeIds})
  `
  const existingIds = new Set(existing.map(r => r.google_place_id))

  // Filter to only new places
  const newPlaces = places.filter(p => !existingIds.has(p.place_id))
  if (newPlaces.length === 0) return

  // Create mappings for new places (batch insert)
  for (const place of newPlaces) {
    try {
      // Try to match to existing Overture data first
      const match = await sql`
        SELECT gers_id FROM restaurants
        WHERE LOWER(name) = LOWER(${place.name})
        AND ABS(lat - ${place.lat}) < 0.001
        AND ABS(lng - ${place.lng}) < 0.001
        LIMIT 1
      `

      if (match.length > 0) {
        // Link to existing restaurant
        await sql`
          INSERT INTO restaurant_mappings (google_place_id, local_id, source)
          VALUES (${place.place_id}, ${match[0].gers_id}, 'overture')
          ON CONFLICT (google_place_id) DO NOTHING
        `
      } else {
        // Create new restaurant record from Google data
        const newId = `gpl_${place.place_id}`
        await sql`
          INSERT INTO restaurants (gers_id, name, address, city, state, lat, lng, categories, source)
          VALUES (
            ${newId},
            ${place.name},
            ${place.address},
            ${place.city || null},
            ${place.state || null},
            ${place.lat},
            ${place.lng},
            ${place.categories || []},
            'google'
          )
          ON CONFLICT (gers_id) DO NOTHING
        `
        await sql`
          INSERT INTO restaurant_mappings (google_place_id, local_id, source)
          VALUES (${place.place_id}, ${newId}, 'google')
          ON CONFLICT (google_place_id) DO NOTHING
        `
        // Update chain detection
        await sql`SELECT update_chain_detection(${place.name})`
      }
    } catch (err) {
      // Log but don't fail - mapping creation is non-critical
      console.warn(`[ensureMappingsExist] Failed to create mapping for ${place.place_id}:`, err)
    }
  }
}

/**
 * Record a voting outcome when a session finishes
 */
export async function recordVotingOutcome(
  googlePlaceId: string,
  localId: string | null,
  wasPicked: boolean,
  yesVotes: number,
  noVotes: number,
  participantCount: number,
  city?: string
): Promise<void> {
  await sql`
    SELECT record_voting_outcome(
      ${googlePlaceId},
      ${localId},
      ${wasPicked},
      ${yesVotes},
      ${noVotes},
      ${participantCount},
      ${city || null}
    )
  `
}

/**
 * Check if a restaurant is a known chain
 */
export async function isKnownChain(name: string): Promise<boolean> {
  const result = await sql`
    SELECT location_count >= 5 as is_chain
    FROM chain_names
    WHERE name = ${name}
  `
  return result.length > 0 && result[0].is_chain
}

/**
 * Get chain names for filtering
 */
export async function getChainNames(): Promise<Set<string>> {
  const results = await sql`
    SELECT name FROM chain_names
    WHERE location_count >= 5
  `
  return new Set(results.map(r => r.name.toLowerCase()))
}
