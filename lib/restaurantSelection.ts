/**
 * Restaurant Selection Algorithm for Group Nom
 *
 * This module handles the intelligent selection of restaurants for a voting session.
 * It balances multiple factors:
 * - Variety (mix of cuisines, price levels)
 * - Quality (pick rate from historical voting, Foursquare rating)
 * - Discovery (boost for less-shown restaurants)
 * - Relevance (matches user's filters)
 */

import { sql, DbRestaurant, serializeRestaurant } from './db'
import { distanceToH3Query, haversineDistance, DEFAULT_RESOLUTION, FINE_RESOLUTION } from './h3'
import { batchLinkToFoursquare, buildPhotoUrl } from './foursquare'
import type { Restaurant, Filters } from './types'

interface SelectionOptions {
  lat: number
  lng: number
  filters: Filters
  limit?: number
  excludeGersIds?: string[]
}

interface ScoredRestaurant extends DbRestaurant {
  score: number
  distance_km: number
}

/**
 * Main selection function - called when creating a session
 */
export async function selectRestaurantsForSession(
  options: SelectionOptions
): Promise<Restaurant[]> {
  const { lat, lng, filters, limit = 10, excludeGersIds = [] } = options

  // Step 1: Get H3 indexes for spatial filtering
  const { indexes, resolution } = distanceToH3Query(lat, lng, filters.distance)
  const h3Column = resolution === FINE_RESOLUTION ? 'h3_index_res9' : 'h3_index_res8'

  // Step 2: Build category filter
  const categoryFilter = filters.cuisines.length > 0
    ? filters.cuisines.map(c => c.toLowerCase().replace(/ /g, '_'))
    : null

  // Step 3: Query with filters
  const candidates = await queryCandidates(
    indexes,
    h3Column,
    categoryFilter,
    filters.priceLevel,
    excludeGersIds,
    limit * 10 // Get more candidates than needed for scoring
  )

  if (candidates.length === 0) {
    return []
  }

  // Step 4: Score and rank candidates
  const scored = scoreCandidates(candidates, lat, lng, filters)

  // Step 5: Select with stratification for variety
  const selected = stratifiedSelect(scored, categoryFilter, limit)

  // Step 6: Link to Foursquare if needed (lazy linking)
  const needsLinking = selected.filter(r => !r.fsq_place_id)
  if (needsLinking.length > 0) {
    await batchLinkToFoursquare(
      needsLinking.map(r => ({
        gersId: r.gers_id,
        name: r.name,
        lat: r.lat,
        lng: r.lng,
      }))
    )

    // Re-fetch to get updated photo data
    const updatedIds = needsLinking.map(r => r.gers_id)
    const updated = await sql`
      SELECT * FROM restaurants WHERE gers_id = ANY(${updatedIds})
    `
    const updatedMap = new Map(updated.map((r: any) => [r.gers_id, r]))

    for (let i = 0; i < selected.length; i++) {
      const update = updatedMap.get(selected[i].gers_id)
      if (update) {
        selected[i] = { ...selected[i], ...update }
      }
    }
  }

  // Step 7: Increment times_shown for selected restaurants
  const selectedIds = selected.map(r => r.gers_id)
  await sql`SELECT increment_times_shown(${selectedIds})`

  // Step 8: Transform to API response format
  return selected.map(transformToRestaurant)
}

/**
 * Query candidate restaurants from database
 */
async function queryCandidates(
  h3Indexes: string[],
  h3Column: string,
  categories: string[] | null,
  priceLevels: number[],
  excludeIds: string[],
  limit: number
): Promise<DbRestaurant[]> {
  // Convert H3 strings to BigInt for comparison
  const h3Values = h3Indexes.map(h => BigInt(`0x${h}`))

  // Build dynamic query based on filters
  let query

  if (categories && categories.length > 0) {
    query = sql`
      SELECT *
      FROM restaurants
      WHERE ${sql.identifier([h3Column])} = ANY(${h3Values}::bigint[])
        AND categories && ${categories}::text[]
        ${priceLevels.length > 0 ? sql`AND (fsq_price_level IS NULL OR fsq_price_level = ANY(${priceLevels}))` : sql``}
        ${excludeIds.length > 0 ? sql`AND gers_id != ALL(${excludeIds})` : sql``}
      LIMIT ${limit}
    `
  } else {
    query = sql`
      SELECT *
      FROM restaurants
      WHERE ${sql.identifier([h3Column])} = ANY(${h3Values}::bigint[])
        ${priceLevels.length > 0 ? sql`AND (fsq_price_level IS NULL OR fsq_price_level = ANY(${priceLevels}))` : sql``}
        ${excludeIds.length > 0 ? sql`AND gers_id != ALL(${excludeIds})` : sql``}
      LIMIT ${limit}
    `
  }

  const results = await query
  return results.map(serializeRestaurant)
}

/**
 * Score candidates based on multiple factors
 */
function scoreCandidates(
  candidates: DbRestaurant[],
  userLat: number,
  userLng: number,
  filters: Filters
): ScoredRestaurant[] {
  return candidates.map(restaurant => {
    // Calculate actual distance
    const distance_km = haversineDistance(userLat, userLng, restaurant.lat, restaurant.lng)

    // Skip if beyond distance filter (H3 is approximate)
    if (distance_km > filters.distance) {
      return null
    }

    // Score components (0-1 scale)
    const scores = {
      // Quality: pick rate from historical data
      pickRate: restaurant.pick_rate !== null
        ? restaurant.pick_rate
        : 0.5, // Default for new restaurants

      // Quality: Foursquare rating (if available)
      fsqRating: restaurant.fsq_rating !== null
        ? restaurant.fsq_rating / 10
        : 0.5,

      // Discovery: boost for less-shown restaurants
      discovery: 1 / Math.log(restaurant.times_shown + 2),

      // Freshness: random factor to prevent staleness
      random: Math.random(),

      // Distance penalty: prefer closer restaurants
      distance: 1 - (distance_km / filters.distance),
    }

    // Weighted final score
    const score =
      0.25 * scores.pickRate +
      0.15 * scores.fsqRating +
      0.25 * scores.discovery +
      0.20 * scores.random +
      0.15 * scores.distance

    return {
      ...restaurant,
      score,
      distance_km,
    }
  }).filter((r): r is ScoredRestaurant => r !== null)
}

/**
 * Stratified selection to ensure variety
 *
 * Instead of just taking top N by score, we ensure representation
 * across different cuisine categories.
 */
function stratifiedSelect(
  scored: ScoredRestaurant[],
  requestedCategories: string[] | null,
  limit: number
): ScoredRestaurant[] {
  // If no specific categories requested, just take top by score
  if (!requestedCategories || requestedCategories.length <= 1) {
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  // Group by primary category
  const byCategory = new Map<string, ScoredRestaurant[]>()
  for (const r of scored) {
    const cat = r.primary_category || 'other'
    if (!byCategory.has(cat)) {
      byCategory.set(cat, [])
    }
    byCategory.get(cat)!.push(r)
  }

  // Sort within each category by score
  for (const restaurants of byCategory.values()) {
    restaurants.sort((a, b) => b.score - a.score)
  }

  // Round-robin selection from categories
  const selected: ScoredRestaurant[] = []
  const categories = Array.from(byCategory.keys())
  let categoryIndex = 0

  while (selected.length < limit) {
    const cat = categories[categoryIndex % categories.length]
    const catRestaurants = byCategory.get(cat)!

    if (catRestaurants.length > 0) {
      selected.push(catRestaurants.shift()!)
    }

    categoryIndex++

    // If we've gone through all categories and none have restaurants left, break
    if (categoryIndex >= categories.length * limit) {
      break
    }
  }

  // Shuffle to avoid predictable ordering
  return shuffleArray(selected)
}

/**
 * Transform database record to API response format
 */
function transformToRestaurant(db: ScoredRestaurant): Restaurant {
  // Build photo URL from cached Foursquare data
  let imageUrl: string | undefined
  if (db.fsq_photo_ids && db.fsq_photo_ids.length > 0) {
    const [prefix, suffix] = db.fsq_photo_ids[0].split('|')
    if (prefix && suffix) {
      imageUrl = buildPhotoUrl(prefix, suffix)
    }
  }

  // Map price level to display format
  const priceLevel = db.fsq_price_level
    ? '$'.repeat(db.fsq_price_level)
    : undefined

  // Map categories to display names
  const cuisines = db.categories
    .map(c => c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
    .slice(0, 3)

  return {
    id: db.gers_id,
    name: db.name,
    address: [db.address, db.city, db.state].filter(Boolean).join(', '),
    rating: db.fsq_rating || 0,
    reviewCount: 0, // We don't store this
    cuisines,
    imageUrl,
    lat: db.lat,
    lng: db.lng,
    priceLevel,
  }
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Record voting outcomes when a session finishes
 */
export async function recordVotingOutcomes(
  restaurants: Restaurant[],
  votes: Map<string, { yesCount: number; noCount: number }>,
  winnerGersId: string | null,
  participantCount: number,
  city?: string
): Promise<void> {
  for (const restaurant of restaurants) {
    const voteData = votes.get(restaurant.id)
    if (!voteData) continue

    await sql`
      SELECT record_voting_outcome(
        ${restaurant.id},
        ${restaurant.id === winnerGersId},
        ${voteData.yesCount},
        ${voteData.noCount},
        ${participantCount},
        ${city || null}
      )
    `
  }
}
