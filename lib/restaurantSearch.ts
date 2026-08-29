/**
 * Name search over the seeded restaurant DB — the front door of the
 * nominate flow ("What place do you love?").
 *
 * Trigram similarity (pg_trgm, migration 008) scoped to a bounding box
 * around the member, ranked by how well the name matches, then by
 * distance, then by community love. Seeded-but-unnominated places are
 * included on purpose: this is how they enter the library.
 */

import { sql } from './db'
import { haversineDistance } from './h3'
import { formatCategory } from './restaurantDiscovery'

export interface SearchHit {
  id: string
  name: string
  address: string
  city?: string
  cuisines: string[]
  lat: number
  lng: number
  nominationCount: number
  distanceKm: number
}

const DEFAULT_RADIUS_KM = 40
const MAX_RADIUS_KM = 80

export async function searchRestaurantsByName(
  query: string,
  lat: number,
  lng: number,
  options: { radiusKm?: number; limit?: number } = {}
): Promise<SearchHit[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const radiusKm = Math.min(options.radiusKm ?? DEFAULT_RADIUS_KM, MAX_RADIUS_KM)
  const limit = Math.min(options.limit ?? 15, 30)

  // Degrees per km: ~111 for latitude, shrinking with cos(lat) for longitude
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2))

  const rows = await sql`
    SELECT
      gers_id, name, address, city, lat, lng, categories, nomination_count,
      GREATEST(similarity(name, ${q}), word_similarity(${q}, name)) AS score
    FROM restaurants
    WHERE lat BETWEEN ${lat - dLat} AND ${lat + dLat}
      AND lng BETWEEN ${lng - dLng} AND ${lng + dLng}
      AND hidden_at IS NULL
      AND (name ILIKE ${'%' + q + '%'} OR name % ${q})
    ORDER BY score DESC, ((lat - ${lat}) * (lat - ${lat}) + (lng - ${lng}) * (lng - ${lng})) ASC
    LIMIT ${limit * 4}
  `

  return (rows as Record<string, unknown>[])
    .map(row => {
      const categories = (row.categories as string[] | null) ?? []
      const cuisines = categories
        .map(formatCategory)
        .filter(c => c.toLowerCase() !== 'restaurant')
        .slice(0, 2)
      const rLat = row.lat as number
      const rLng = row.lng as number
      return {
        id: row.gers_id as string,
        name: row.name as string,
        address: (row.address as string | null) ?? '',
        city: (row.city as string | null) ?? undefined,
        cuisines,
        lat: rLat,
        lng: rLng,
        nominationCount: (row.nomination_count as number) ?? 0,
        distanceKm: Math.round(haversineDistance(lat, lng, rLat, rLng) * 10) / 10,
        score: row.score as number,
      }
    })
    // Re-rank: strong name matches first, then nearest. A mediocre match
    // across town should not beat a good one around the corner.
    .sort((a, b) => {
      const bandA = Math.round(a.score * 4)
      const bandB = Math.round(b.score * 4)
      if (bandA !== bandB) return bandB - bandA
      return a.distanceKm - b.distanceKm
    })
    .slice(0, limit)
    .map(({ score: _score, ...hit }) => hit)
}
