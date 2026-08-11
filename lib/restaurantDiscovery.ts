/**
 * Restaurant Discovery
 *
 * Builds the voting deck from our own database (Overture-seeded,
 * community-nominated). No external APIs.
 *
 * Bootstrap behavior: while the community is young, the deck draws from
 * all seeded restaurants so sessions always work; nominated places are
 * weighted heavily so community love rises to the top as it accumulates.
 */

import { sql } from './db'
import { distanceToH3Query, FINE_RESOLUTION, haversineDistance } from './h3'
import type { Restaurant } from './types'

// Known chain keywords for the preferLocal filter (name-based heuristic)
const CHAIN_KEYWORDS = [
  'mcdonald', 'burger king', 'wendy', 'taco bell', 'kfc', 'popeyes',
  'chick-fil-a', 'sonic', 'jack in the box', "carl's jr", 'hardee',
  'whataburger', 'in-n-out', 'five guys', 'shake shack', 'white castle',
  "arby's", 'checkers', "rally's", 'del taco', 'wingstop',
  'chipotle', 'panera', 'qdoba', "moe's", 'firehouse subs', 'jersey mike',
  'jimmy john', 'subway', 'potbelly', 'panda express', 'noodles & company',
  'blaze pizza', 'mod pizza', 'sweetgreen', 'cava',
  'applebee', "chili's", 'olive garden', 'red lobster', 'outback',
  'texas roadhouse', 'longhorn', 'red robin', 'buffalo wild wings',
  'cheesecake factory', 'p.f. chang', 'benihana', 'hooters',
  'ihop', "denny's", 'waffle house', 'cracker barrel', 'bob evans',
  'golden corral', 'starbucks', 'dunkin', 'tim hortons',
  'baskin-robbins', 'dairy queen', 'coldstone', 'krispy kreme',
  "domino's", 'pizza hut', 'papa john', 'little caesars', "marco's pizza",
  'papa murphy', 'cicis', "raising cane", 'zaxby', "culver's",
  "portillo's", "jason's deli", "mcalister's", "nando's",
]

export function isChainRestaurant(name: string): boolean {
  const lowerName = name.toLowerCase()
  return CHAIN_KEYWORDS.some(chain => lowerName.includes(chain))
}

// UI cuisine names -> Overture category prefixes
const CUISINE_CATEGORY_PREFIXES: Record<string, string[]> = {
  american: ['american', 'burger', 'southern', 'breakfast'],
  italian: ['italian', 'pizza'],
  mexican: ['mexican', 'taco', 'texmex'],
  japanese: ['japanese', 'sushi', 'ramen'],
  chinese: ['chinese'],
  indian: ['indian'],
  thai: ['thai'],
  korean: ['korean'],
  vietnamese: ['vietnamese'],
  mediterranean: ['mediterranean', 'greek', 'middle_eastern', 'lebanese', 'turkish'],
  french: ['french'],
  greek: ['greek'],
  spanish: ['spanish', 'tapas'],
  caribbean: ['caribbean', 'cuban', 'jamaican'],
  bbq: ['bbq', 'barbecue', 'smokehouse'],
}

interface DeckOptions {
  cuisines?: string[]
  excludeIds?: string[]
  preferLocal?: boolean
}

interface DeckRow {
  gers_id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  lat: number
  lng: number
  categories: string[]
  like_count: number
  nomination_count: number
  photo_url: string | null
}

function formatCategory(category: string): string {
  return category
    .replace(/_restaurant$|_shop$/, '')
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function toRestaurant(row: DeckRow): Restaurant {
  const cuisines = (row.categories ?? [])
    .map(formatCategory)
    .filter(c => c.toLowerCase() !== 'restaurant')
    .slice(0, 3)

  return {
    id: row.gers_id,
    name: row.name,
    address: [row.address, row.city].filter(Boolean).join(', ') || 'Address not available',
    rating: 0,
    reviewCount: 0,
    cuisines: cuisines.length > 0 ? cuisines : ['Restaurant'],
    lat: row.lat,
    lng: row.lng,
    imageUrl: row.photo_url ?? undefined,
    localId: row.gers_id,
    likeCount: row.like_count,
    nominationCount: row.nomination_count,
  }
}

/**
 * Build a discovery deck near a location from our own database.
 */
export async function getDiscoveryDeck(
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number,
  options: DeckOptions = {}
): Promise<Restaurant[]> {
  const { cuisines = [], excludeIds = [], preferLocal = true } = options

  // H3 cells covering the search radius (capped to keep the cell list sane)
  const cappedRadius = Math.min(Math.max(radiusKm, 1), 25)
  const { indexes, resolution } = distanceToH3Query(lat, lng, cappedRadius)
  const h3Values = indexes.map(h => BigInt(`0x${h}`))

  // Category prefixes for the cuisine filter
  const prefixes = cuisines.flatMap(
    c => CUISINE_CATEGORY_PREFIXES[c.toLowerCase()] ?? [c.toLowerCase()]
  )

  // Pool is larger than the deck so weighting + shuffle have room to work.
  // Nominated restaurants always make the pool.
  const poolSize = Math.max(limit * 6, 60)

  const rows = (resolution === FINE_RESOLUTION
    ? await sql`
        SELECT
          r.gers_id, r.name, r.address, r.city, r.state, r.lat, r.lng,
          r.categories, r.like_count, r.nomination_count,
          (
            SELECT n.photo_url FROM nominations n
            WHERE n.gers_id = r.gers_id
            ORDER BY n.created_at DESC LIMIT 1
          ) AS photo_url
        FROM restaurants r
        WHERE r.h3_index_res9 = ANY(${h3Values}::bigint[])
          AND NOT (r.gers_id = ANY(${excludeIds}::text[]))
          AND (
            ${prefixes.length === 0} OR EXISTS (
              SELECT 1 FROM unnest(r.categories) cat
              WHERE cat LIKE ANY(${prefixes.map(p => `${p}%`)}::text[])
            )
          )
        ORDER BY (r.nomination_count > 0) DESC, random()
        LIMIT ${poolSize}
      `
    : await sql`
        SELECT
          r.gers_id, r.name, r.address, r.city, r.state, r.lat, r.lng,
          r.categories, r.like_count, r.nomination_count,
          (
            SELECT n.photo_url FROM nominations n
            WHERE n.gers_id = r.gers_id
            ORDER BY n.created_at DESC LIMIT 1
          ) AS photo_url
        FROM restaurants r
        WHERE r.h3_index_res8 = ANY(${h3Values}::bigint[])
          AND NOT (r.gers_id = ANY(${excludeIds}::text[]))
          AND (
            ${prefixes.length === 0} OR EXISTS (
              SELECT 1 FROM unnest(r.categories) cat
              WHERE cat LIKE ANY(${prefixes.map(p => `${p}%`)}::text[])
            )
          )
        ORDER BY (r.nomination_count > 0) DESC, random()
        LIMIT ${poolSize}
      `) as DeckRow[]

  // Score: community love dominates, local places beat chains, randomness
  // keeps decks fresh between sessions.
  const scored = rows.map(row => {
    let score = Math.random()
    if (row.nomination_count > 0) score += 10 + Math.min(row.nomination_count, 5)
    if (row.like_count > 0) score += Math.min(row.like_count * 0.5, 2)
    if (preferLocal && !isChainRestaurant(row.name)) score += 1.5
    // Slight nudge toward closer places
    const distKm = haversineDistance(lat, lng, row.lat, row.lng)
    score += Math.max(0, 1 - distKm / cappedRadius)
    return { row, score }
  })

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map(s => toRestaurant(s.row))
}
