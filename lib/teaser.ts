/**
 * Public teaser data for a place — what a signed-out visitor (or a link
 * unfurl) may see: name, where, how many locals love it. Never a photo,
 * a quote, or a member. This is the "tease" rung of the ladder.
 */

import { sql } from './db'

export interface PlaceTeaser {
  id: string
  name: string
  city?: string
  state?: string
  nominationCount: number
}

export async function getPlaceTeaser(gersId: string): Promise<PlaceTeaser | null> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(gersId)) return null
  const rows = await sql`
    SELECT gers_id, name, city, state, nomination_count
    FROM restaurants
    WHERE gers_id = ${gersId} AND hidden_at IS NULL
  `
  if (rows.length === 0) return null
  const r = rows[0]
  return {
    id: r.gers_id as string,
    name: r.name as string,
    city: (r.city as string | null) ?? undefined,
    state: (r.state as string | null) ?? undefined,
    nominationCount: (r.nomination_count as number) ?? 0,
  }
}

export interface LocalTease {
  count: number
  scope: 'nearby' | 'everywhere'
}

/**
 * How many places are loved near a point (~25km box), or everywhere when
 * there is no point or nothing nearby. Counts only — this feeds the
 * signed-out landing page.
 */
export async function getLocalTease(near: { lat: number; lng: number } | null): Promise<LocalTease> {
  if (near) {
    const d = 0.23 // ~25km
    const rows = await sql`
      SELECT COUNT(*)::int AS count FROM restaurants
      WHERE nomination_count > 0 AND hidden_at IS NULL
        AND lat BETWEEN ${near.lat - d} AND ${near.lat + d}
        AND lng BETWEEN ${near.lng - d} AND ${near.lng + d}
    `
    const count = (rows[0]?.count as number) ?? 0
    return { count, scope: 'nearby' }
  }
  const rows = await sql`
    SELECT COUNT(*)::int AS count FROM restaurants WHERE nomination_count > 0 AND hidden_at IS NULL
  `
  return { count: (rows[0]?.count as number) ?? 0, scope: 'everywhere' }
}

export function lovedByLine(count: number): string {
  if (count === 0) return 'Not on the shelf yet'
  return `Loved by ${count} local${count === 1 ? '' : 's'}`
}
