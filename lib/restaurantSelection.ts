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
import { distanceToH3Query, haversineDistance, FINE_RESOLUTION } from './h3'
import { batchLinkToTripAdvisor } from './tripadvisor'
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

  console.log('[Selection] Starting selection for:', { lat, lng, distance: filters.distance })

  // Step 1: Get H3 indexes for spatial filtering
  const { indexes, resolution } = distanceToH3Query(lat, lng, filters.distance)
  const useFineResolution = resolution === FINE_RESOLUTION

  console.log('[Selection] H3 indexes:', indexes.length, 'resolution:', resolution)

  // Step 2: Build category filter
  // Map UI cuisine names to database category format (e.g., "Italian" -> "italian_restaurant")
  const cuisineToCategory: Record<string, string> = {
    'bbq': 'barbecue_restaurant',
    'mediterranean': 'mediterranean_restaurant',
  }

  const categoryFilter = filters.cuisines.length > 0
    ? filters.cuisines.map(c => {
        const normalized = c.toLowerCase().replace(/ /g, '_')
        // Check for special mappings first, then default to {cuisine}_restaurant
        return cuisineToCategory[normalized] ||
          (normalized.endsWith('_restaurant') ? normalized : `${normalized}_restaurant`)
      })
    : null

  console.log('[Selection] Category filter:', categoryFilter, 'Price levels:', filters.priceLevel)

  // Step 3: Query with filters
  let candidates: DbRestaurant[] = []
  try {
    candidates = await queryCandidates(
      indexes,
      useFineResolution,
      categoryFilter,
      filters.priceLevel,
      excludeGersIds,
      filters.excludeChains ?? false,
      limit * 10 // Get more candidates than needed for scoring
    )
    console.log('[Selection] Candidates found:', candidates.length)
  } catch (error) {
    console.error('[Selection] Query error:', error)
    throw error
  }

  if (candidates.length === 0) {
    return []
  }

  // Step 4: Score and rank candidates
  const scored = scoreCandidates(candidates, lat, lng, filters)

  // Step 5: Select with stratification for variety
  const selected = stratifiedSelect(scored, categoryFilter, limit)

  // Step 6: Link to TripAdvisor if needed (lazy linking for photos)
  // Fetch price data only if user is filtering by price (saves API calls)
  const needsPriceData = filters.priceLevel.length > 0
  const needsLinking = selected.filter(r => !r.ta_location_id)
  if (needsLinking.length > 0) {
    try {
      await batchLinkToTripAdvisor(
        needsLinking.map(r => ({
          gersId: r.gers_id,
          name: r.name,
          lat: r.lat,
          lng: r.lng,
        })),
        needsPriceData // Only fetch price level if filter is active
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
    } catch (error) {
      console.warn('[Selection] TripAdvisor linking skipped (DB may be at capacity):', error)
    }
  }

  // Step 7: Increment times_shown for selected restaurants
  // Wrapped in try-catch to handle DB capacity limits gracefully
  try {
    const selectedIds = selected.map(r => r.gers_id)
    await sql`SELECT increment_times_shown(${selectedIds})`
  } catch (error) {
    console.warn('[Selection] times_shown increment skipped (DB may be at capacity):', error)
  }

  // Step 8: Transform to API response format
  return selected.map(transformToRestaurant)
}

// Threshold for considering a restaurant a "chain" (locations nationwide)
const CHAIN_THRESHOLD = 20

/**
 * Query candidate restaurants from database
 *
 * Uses conditional SQL to handle all filter combinations in just 2 queries
 * (one for each H3 resolution) instead of 16 separate query branches.
 */
async function queryCandidates(
  h3Indexes: string[],
  useFineResolution: boolean,
  categories: string[] | null,
  priceLevels: number[],
  excludeIds: string[],
  excludeChains: boolean,
  limit: number
): Promise<DbRestaurant[]> {
  // Convert H3 strings to BigInt for comparison
  const h3Values = h3Indexes.map(h => BigInt(`0x${h}`))

  // Normalize filter arrays - use null for "no filter" cases
  const categoryFilter = categories && categories.length > 0 ? categories : null
  const excludeFilter = excludeIds.length > 0 ? excludeIds : null

  // Convert numeric price levels to TripAdvisor format for matching
  // TripAdvisor uses "$", "$$", "$$$", "$$$$" or ranges like "$$-$$$"
  // We match if the restaurant's price contains any of the requested levels
  const pricePatterns = priceLevels.length > 0
    ? priceLevels.map(p => '$'.repeat(p))
    : null

  // Query with conditional filters
  // - Categories: only filter if categoryFilter is not null
  // - Price: match if ta_price_level contains any requested level (or is null/not yet fetched)
  // - Exclude: only filter if excludeFilter is not null
  // - Chains: use CTE to identify and exclude chain restaurants
  // - ORDER BY RANDOM() ensures we sample from the full pool, not just first N rows
  const results = useFineResolution
    ? await sql`
        WITH chain_names AS (
          SELECT name FROM restaurants
          GROUP BY name
          HAVING COUNT(*) > ${CHAIN_THRESHOLD}
        )
        SELECT r.* FROM restaurants r
        WHERE r.h3_index_res9 = ANY(${h3Values}::bigint[])
          AND (${categoryFilter}::text[] IS NULL OR r.categories && ${categoryFilter}::text[])
          AND (${pricePatterns}::text[] IS NULL OR r.ta_price_level IS NULL OR r.ta_price_level = ANY(${pricePatterns}::text[]))
          AND (${excludeFilter}::text[] IS NULL OR r.gers_id != ALL(${excludeFilter}::text[]))
          AND (NOT ${excludeChains} OR r.name NOT IN (SELECT name FROM chain_names))
        ORDER BY RANDOM()
        LIMIT ${limit}
      `
    : await sql`
        WITH chain_names AS (
          SELECT name FROM restaurants
          GROUP BY name
          HAVING COUNT(*) > ${CHAIN_THRESHOLD}
        )
        SELECT r.* FROM restaurants r
        WHERE r.h3_index_res8 = ANY(${h3Values}::bigint[])
          AND (${categoryFilter}::text[] IS NULL OR r.categories && ${categoryFilter}::text[])
          AND (${pricePatterns}::text[] IS NULL OR r.ta_price_level IS NULL OR r.ta_price_level = ANY(${pricePatterns}::text[]))
          AND (${excludeFilter}::text[] IS NULL OR r.gers_id != ALL(${excludeFilter}::text[]))
          AND (NOT ${excludeChains} OR r.name NOT IN (SELECT name FROM chain_names))
        ORDER BY RANDOM()
        LIMIT ${limit}
      `

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

      // Discovery: boost for less-shown restaurants
      discovery: 1 / Math.log(restaurant.times_shown + 2),

      // Freshness: random factor to prevent staleness
      random: Math.random(),

      // Distance penalty: prefer closer restaurants
      distance: 1 - (distance_km / filters.distance),
    }

    // Weighted final score
    const score =
      0.30 * scores.pickRate +
      0.30 * scores.discovery +
      0.25 * scores.random +
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
  // Use TripAdvisor photo URL if available
  let imageUrl: string | undefined
  if (db.ta_photo_urls && db.ta_photo_urls.length > 0) {
    imageUrl = db.ta_photo_urls[0]
  }

  // Map categories to display names
  const cuisines = db.categories
    .map(c => c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
    .slice(0, 3)

  return {
    id: db.gers_id,
    name: db.name,
    address: [db.address, db.city, db.state].filter(Boolean).join(', '),
    rating: 0, // TODO: Add rating source
    reviewCount: 0,
    cuisines,
    imageUrl,
    lat: db.lat,
    lng: db.lng,
    priceLevel: db.ta_price_level || undefined,
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
