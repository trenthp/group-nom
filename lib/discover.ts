/**
 * Discover — the whole map as we have it.
 *
 * The library is the output (places someone loves). Discover is the input:
 * every seeded place, lit or unlit, so members can find what's good and
 * light it up. Everything here is public Overture data plus a love count,
 * so it is open to every member, pre-unlock included. Photos and words
 * stay behind the gate — the only photo this module ever returns is for
 * an unlocked member.
 *
 * Density is handled with the H3 cells already indexed on every row:
 * zoomed out, hexes shaded by how many places they hold and tinted ember
 * by how many are loved. Zoomed in, individual points. The mode is chosen
 * from the bounding box size, never trusted from the client.
 */

import { cellToParent, cellToLatLng } from 'h3-js'
import { sql } from './db'
import { formatCategory } from './restaurantDiscovery'

export interface BBox {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

export interface DiscoverPlace {
  id: string
  name: string
  lat: number
  lng: number
  address: string
  city: string | null
  cuisines: string[]
  nominationCount: number
  /** Only present for unlocked members */
  photoUrl?: string
}

export interface DiscoverHex {
  h3: string
  lat: number
  lng: number
  total: number
  loved: number
}

export type DiscoverViewport =
  | {
      mode: 'hexes'
      resolution: number
      /** true when the view is so wide only loved places were counted */
      lovedOnly: boolean
      hexes: DiscoverHex[]
      totals: { total: number; loved: number }
    }
  | {
      mode: 'points'
      places: DiscoverPlace[]
      truncated: boolean
      totals: { total: number; loved: number }
    }

const POINT_LIMIT = 400
const CARD_LIMIT = 10

/** Widest span (degrees) we will query at all. */
const MAX_SPAN = 40

/**
 * Choose hex resolution from how wide the view is. The res 8 column is the
 * finest we aggregate on; coarser hexes are parents computed in Node.
 */
function pickMode(span: number): { mode: 'points' } | { mode: 'hexes'; resolution: number; lovedOnly: boolean } {
  // Tuned on Orlando: keeps a phone under ~500 polygons at any zoom
  if (span <= 0.12) return { mode: 'points' }
  if (span <= 0.3) return { mode: 'hexes', resolution: 8, lovedOnly: false }
  if (span <= 0.8) return { mode: 'hexes', resolution: 7, lovedOnly: false }
  if (span <= 2.5) return { mode: 'hexes', resolution: 6, lovedOnly: false }
  return { mode: 'hexes', resolution: 5, lovedOnly: true }
}

function normalize(bbox: BBox): BBox {
  return {
    minLng: Math.max(-180, Math.min(bbox.minLng, bbox.maxLng)),
    maxLng: Math.min(180, Math.max(bbox.minLng, bbox.maxLng)),
    minLat: Math.max(-90, Math.min(bbox.minLat, bbox.maxLat)),
    maxLat: Math.min(90, Math.max(bbox.minLat, bbox.maxLat)),
  }
}

/** BIGINT h3 from Postgres (string or number) → h3-js hex string */
function toH3(value: unknown): string {
  return BigInt(String(value)).toString(16)
}

function toPlace(row: Record<string, unknown>): DiscoverPlace {
  const categories = (row.categories as string[] | null) ?? []
  const cuisines = categories
    .map(formatCategory)
    .filter(c => c.toLowerCase() !== 'restaurant')
    .slice(0, 3)
  return {
    id: row.gers_id as string,
    name: row.name as string,
    lat: row.lat as number,
    lng: row.lng as number,
    address: [row.address, row.city].filter(Boolean).join(', '),
    city: (row.city as string | null) ?? null,
    cuisines: cuisines.length > 0 ? cuisines : ['Restaurant'],
    nominationCount: (row.nomination_count as number) ?? 0,
    ...(row.photo_url ? { photoUrl: row.photo_url as string } : {}),
  }
}

export async function getDiscoverViewport(
  input: BBox,
  options: { includePhotos?: boolean } = {}
): Promise<DiscoverViewport> {
  const bbox = normalize(input)
  const span = Math.max(bbox.maxLat - bbox.minLat, bbox.maxLng - bbox.minLng)
  if (span > MAX_SPAN) {
    throw new Error('Viewport too large')
  }

  const choice = pickMode(span)
  const params = [bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng]

  if (choice.mode === 'points') {
    const photoSelect = options.includePhotos
      ? `, (SELECT n.photo_url FROM nominations n WHERE n.gers_id = r.gers_id ORDER BY n.created_at DESC LIMIT 1) AS photo_url`
      : ''
    const rows = (await sql.query(
      `SELECT r.gers_id, r.name, r.lat, r.lng, r.address, r.city, r.categories, r.nomination_count${photoSelect}
       FROM restaurants r
       WHERE r.lat BETWEEN $1 AND $2 AND r.lng BETWEEN $3 AND $4
         AND r.hidden_at IS NULL
       ORDER BY r.nomination_count DESC, r.name
       LIMIT $5`,
      [...params, POINT_LIMIT + 1]
    )) as Record<string, unknown>[]

    const truncated = rows.length > POINT_LIMIT
    const places = rows.slice(0, POINT_LIMIT).map(toPlace)
    return {
      mode: 'points',
      places,
      truncated,
      totals: {
        total: places.length,
        loved: places.filter(p => p.nominationCount > 0).length,
      },
    }
  }

  const lovedFilter = choice.lovedOnly ? 'AND r.nomination_count > 0' : ''
  const rows = (await sql.query(
    `SELECT r.h3_index_res8 AS h3,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE r.nomination_count > 0)::int AS loved
     FROM restaurants r
     WHERE r.lat BETWEEN $1 AND $2 AND r.lng BETWEEN $3 AND $4
       AND r.hidden_at IS NULL
       AND r.h3_index_res8 IS NOT NULL
       ${lovedFilter}
     GROUP BY 1`,
    params
  )) as Array<{ h3: unknown; total: number; loved: number }>

  // Roll res 8 cells up to the display resolution
  const buckets = new Map<string, { total: number; loved: number }>()
  for (const row of rows) {
    const cell = toH3(row.h3)
    const parent = choice.resolution === 8 ? cell : cellToParent(cell, choice.resolution)
    const bucket = buckets.get(parent) ?? { total: 0, loved: 0 }
    bucket.total += Number(row.total)
    bucket.loved += Number(row.loved)
    buckets.set(parent, bucket)
  }

  let total = 0
  let loved = 0
  const hexes: DiscoverHex[] = []
  for (const [h3, counts] of buckets) {
    const [lat, lng] = cellToLatLng(h3)
    hexes.push({ h3, lat, lng, total: counts.total, loved: counts.loved })
    total += counts.total
    loved += counts.loved
  }

  return {
    mode: 'hexes',
    resolution: choice.resolution,
    lovedOnly: choice.lovedOnly,
    hexes,
    totals: { total, loved },
  }
}

/**
 * A small randomized hand of places from the current view — the optional
 * cards way through Discover. Skipping records nothing; the only outputs
 * are a save or a nomination.
 */
export async function getDiscoverCards(
  input: BBox,
  options: { exclude?: string[]; includePhotos?: boolean; limit?: number } = {}
): Promise<DiscoverPlace[]> {
  let bbox = normalize(input)
  // Keep random() cheap: never sample more than about a city at a time
  const span = Math.max(bbox.maxLat - bbox.minLat, bbox.maxLng - bbox.minLng)
  if (span > 0.6) {
    const cLat = (bbox.minLat + bbox.maxLat) / 2
    const cLng = (bbox.minLng + bbox.maxLng) / 2
    bbox = { minLat: cLat - 0.3, maxLat: cLat + 0.3, minLng: cLng - 0.3, maxLng: cLng + 0.3 }
  }

  const exclude = (options.exclude ?? []).slice(0, 500)
  const limit = Math.min(Math.max(options.limit ?? CARD_LIMIT, 1), 20)
  const photoSelect = options.includePhotos
    ? `, (SELECT n.photo_url FROM nominations n WHERE n.gers_id = r.gers_id ORDER BY n.created_at DESC LIMIT 1) AS photo_url`
    : ''

  const rows = (await sql.query(
    `SELECT r.gers_id, r.name, r.lat, r.lng, r.address, r.city, r.categories, r.nomination_count${photoSelect}
     FROM restaurants r
     WHERE r.lat BETWEEN $1 AND $2 AND r.lng BETWEEN $3 AND $4
       AND r.hidden_at IS NULL
       AND NOT (r.gers_id = ANY($5::text[]))
     ORDER BY random()
     LIMIT $6`,
    [bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng, exclude, limit]
  )) as Record<string, unknown>[]

  return rows.map(toPlace)
}

/** Parse `bbox=minLng,minLat,maxLng,maxLat`; null when malformed. */
export function parseBBox(raw: string | null): BBox | null {
  if (!raw) return null
  const parts = raw.split(',').map(Number)
  if (parts.length !== 4 || parts.some(n => !Number.isFinite(n))) return null
  const [minLng, minLat, maxLng, maxLat] = parts
  if (Math.abs(minLat) > 90 || Math.abs(maxLat) > 90 || Math.abs(minLng) > 180 || Math.abs(maxLng) > 180) return null
  return { minLng, minLat, maxLng, maxLat }
}
