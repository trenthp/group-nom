/**
 * Session deck sources (Phase 5, decided Aug 2026). The host picks where
 * the deck comes from:
 *   mix      everything nearby, community love weighted (the default)
 *   library  only places someone has nominated, love-ordered
 *   group    only places nominated by the saved group's roster
 *            (saved-Group sessions only: decks are built at creation,
 *            before ad-hoc joiners exist)
 */

import { sql } from './db'
import { getDiscoveryDeck, getLibraryNearby, formatCategory } from './restaurantDiscovery'
import { haversineDistance } from './h3'
import type { Restaurant } from './types'

export type DeckSource = 'mix' | 'library' | 'group'
export const DECK_SOURCES: DeckSource[] = ['mix', 'library', 'group']

/** Below this, a nominated-only deck isn't a session — fall back to mix */
const MIN_DECK = 3

export interface DeckRequest {
  lat: number
  lng: number
  radiusKm: number
  limit: number
  cuisines: string[]
  preferLocal: boolean
  /** Roster clerk ids for source = 'group' */
  groupMemberIds?: string[]
}

export interface BuiltDeck {
  restaurants: Restaurant[]
  /** The source actually used (may differ from the request on fallback) */
  source: DeckSource
  fellBack: boolean
}

function libraryEntryToRestaurant(p: Awaited<ReturnType<typeof getLibraryNearby>>[number]): Restaurant {
  return {
    id: p.id,
    name: p.name,
    address: p.address,
    rating: 0,
    reviewCount: 0,
    cuisines: p.cuisines,
    imageUrl: p.photoUrl,
    lat: p.lat,
    lng: p.lng,
    localId: p.id,
    nominationCount: p.nominationCount,
  }
}

async function groupDeck(req: DeckRequest): Promise<Restaurant[]> {
  const ids = req.groupMemberIds ?? []
  if (ids.length === 0) return []
  const radius = Math.min(Math.max(req.radiusKm, 1), 40)
  const dLat = radius / 111
  const dLng = radius / (111 * Math.max(Math.cos((req.lat * Math.PI) / 180), 0.2))

  const rows = await sql`
    SELECT r.gers_id, r.name, r.address, r.city, r.lat, r.lng, r.categories,
           r.nomination_count, r.love_score,
           (SELECT n2.photo_url FROM nominations n2 WHERE n2.gers_id = r.gers_id ORDER BY n2.created_at DESC LIMIT 1) AS photo_url,
           COUNT(DISTINCT n.clerk_user_id) AS roster_votes
    FROM restaurants r
    JOIN nominations n ON n.gers_id = r.gers_id AND n.clerk_user_id = ANY(${ids}::text[])
    WHERE r.hidden_at IS NULL
      AND r.lat BETWEEN ${req.lat - dLat} AND ${req.lat + dLat}
      AND r.lng BETWEEN ${req.lng - dLng} AND ${req.lng + dLng}
    GROUP BY r.gers_id
    ORDER BY roster_votes DESC, r.love_score DESC
    LIMIT ${req.limit}
  `
  return (rows as Record<string, unknown>[]).map(row => {
    const cuisines = ((row.categories as string[] | null) ?? [])
      .map(formatCategory).filter(c => c.toLowerCase() !== 'restaurant').slice(0, 3)
    return {
      id: row.gers_id as string,
      name: row.name as string,
      address: [row.address, row.city].filter(Boolean).join(', ') || 'Address not available',
      rating: 0,
      reviewCount: 0,
      cuisines: cuisines.length > 0 ? cuisines : ['Restaurant'],
      imageUrl: (row.photo_url as string | null) ?? undefined,
      lat: row.lat as number,
      lng: row.lng as number,
      localId: row.gers_id as string,
      nominationCount: (row.nomination_count as number) ?? 0,
    }
  }).filter(r => haversineDistance(req.lat, req.lng, r.lat, r.lng) <= radius)
}

export async function buildDeck(source: DeckSource, req: DeckRequest): Promise<BuiltDeck> {
  const mix = () => getDiscoveryDeck(req.lat, req.lng, req.radiusKm, req.limit, {
    cuisines: req.cuisines,
    preferLocal: req.preferLocal,
  })

  if (source === 'group') {
    const restaurants = await groupDeck(req)
    if (restaurants.length >= MIN_DECK) return { restaurants, source, fellBack: false }
    return { restaurants: await mix(), source: 'mix', fellBack: true }
  }

  if (source === 'library') {
    const entries = await getLibraryNearby(req.lat, req.lng, req.radiusKm, req.limit)
    const restaurants = entries.map(libraryEntryToRestaurant)
    if (restaurants.length >= MIN_DECK) return { restaurants, source, fellBack: false }
    return { restaurants: await mix(), source: 'mix', fellBack: true }
  }

  return { restaurants: await mix(), source: 'mix', fellBack: false }
}
