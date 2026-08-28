/**
 * Chain detection for the soft-discourage nudge (decided Aug 2026:
 * discouraged, never blocked). Three signals, any one is enough:
 *   1. the keyword heuristic decks already use (isChainRestaurant)
 *   2. the chain_names table (built up from earlier discovery data)
 *   3. how many seeded rows share the same normalized name — the truest
 *      signal we own, and it catches regional chains the list misses
 */

import { sql } from './db'
import { isChainRestaurant } from './restaurantDiscovery'

/** Same-name locations in the seed before we call it a chain */
const SEED_LOCATION_THRESHOLD = 6
/** chain_names entries below this are noise from single sightings */
const CHAIN_TABLE_THRESHOLD = 5

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\s*(#|no\.?)\s*\d+\s*$/i, '') // "Subway #1234"
    .replace(/\s*[-–|(].*$/, '')            // "Flippers Pizza | I-Drive"
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function isLikelyChain(name: string): Promise<boolean> {
  if (isChainRestaurant(name)) return true

  const norm = normalizeName(name)
  if (norm.length < 3) return false

  const rows = await sql`
    SELECT
      (
        SELECT COUNT(*)::int FROM restaurants
        WHERE lower(name) = lower(${name}) OR lower(name) LIKE ${norm + '%'}
      ) AS seed_count,
      (
        SELECT COALESCE(MAX(location_count), 0)::int FROM chain_names
        WHERE ${norm} LIKE '%' || name || '%'
      ) AS chain_table_count
  `
  const seedCount = (rows[0]?.seed_count as number) ?? 0
  const chainTableCount = (rows[0]?.chain_table_count as number) ?? 0

  return seedCount >= SEED_LOCATION_THRESHOLD || chainTableCount >= CHAIN_TABLE_THRESHOLD
}
