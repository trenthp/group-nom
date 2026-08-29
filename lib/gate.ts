/**
 * The membership gate (decided Aug 2026).
 *
 * A member who hasn't nominated yet sees "Today's Five": the same five
 * nearby loved places across list, map and Discover, chosen
 * deterministically from their id + local date, new at local midnight.
 * Their first nomination opens everything, for life.
 *
 * The five are memoized in KV for the day so the restaurant-page check is
 * one read and the set doesn't wobble as their location jitters.
 */

import { kv, isKvConfigured } from './kv'
import { sql } from './db'
import { getLibraryNearby, type LibraryEntry } from './restaurantDiscovery'
import { localDateIn } from './dailyLimit'
import { sessionStore } from './sessionStore'
import type { UserProfile } from './userProfile'
import { isUnlocked } from './userProfile'

export const TODAYS_FIVE_SIZE = 5
const FIVE_TTL_SECONDS = 36 * 60 * 60
const CANDIDATE_RADIUS_KM = 25

function fiveKey(userId: string, localDate: string): string {
  return `five:${userId}:${localDate}`
}

/** Small, fast, deterministic: FNV-1a over the seed string. */
function seedFrom(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h || 1
}

/** mulberry32 — enough randomness for a daily shuffle, fully reproducible. */
function rng(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pickDeterministic<T extends { id: string }>(
  items: T[],
  seedText: string,
  count: number
): T[] {
  // Sort by id first so the input order (distance, love) can't leak in
  const pool = [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const next = rng(seedFrom(seedText))
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

export interface TodaysFive {
  places: LibraryEntry[]
  /** How many loved places are nearby in total — the tease */
  totalNearby: number
  localDate: string
}

export async function getTodaysFive(
  userId: string,
  tz: string,
  lat: number,
  lng: number
): Promise<TodaysFive> {
  const localDate = localDateIn(tz)
  const candidates = await getLibraryNearby(lat, lng, CANDIDATE_RADIUS_KM, 200)
  const places = pickDeterministic(candidates, `${userId}|${localDate}`, TODAYS_FIVE_SIZE)

  if (isKvConfigured() && places.length > 0) {
    // Remember the set for the day; failures are non-fatal
    kv.set(fiveKey(userId, localDate), places.map(p => p.id), { ex: FIVE_TTL_SECONDS }).catch(() => {})
  }

  return { places, totalNearby: candidates.length, localDate }
}

async function todaysFiveIds(userId: string, tz: string): Promise<string[]> {
  if (!isKvConfigured()) return []
  try {
    return (await kv.get<string[]>(fiveKey(userId, localDateIn(tz)))) ?? []
  } catch {
    return []
  }
}

export interface GateContext {
  timezone: string
  /** A session the member is in whose deck contains the place */
  sessionCode?: string | null
}

/**
 * Can this member open a restaurant page? Unlocked members: always.
 * Pre-unlock: Today's Five, their saved places, their drafts, their own
 * nominations, a place loved by someone they follow, or a place from a
 * session they're in.
 */
export async function canOpenRestaurant(
  userId: string,
  profile: Pick<UserProfile, 'nominationCount'>,
  gersId: string,
  ctx: GateContext
): Promise<boolean> {
  if (isUnlocked(profile)) return true

  const [five, own] = await Promise.all([
    todaysFiveIds(userId, ctx.timezone),
    sql`
      SELECT 1 FROM user_favorites WHERE clerk_user_id = ${userId} AND local_id = ${gersId}
      UNION ALL
      SELECT 1 FROM nomination_drafts WHERE clerk_user_id = ${userId} AND gers_id = ${gersId}
      UNION ALL
      SELECT 1 FROM nominations WHERE clerk_user_id = ${userId} AND gers_id = ${gersId}
      UNION ALL
      SELECT 1 FROM nominations n
      JOIN follows f ON f.followee_id = n.clerk_user_id AND f.follower_id = ${userId}
      WHERE n.gers_id = ${gersId}
      LIMIT 1
    `,
  ])
  if (five.includes(gersId) || own.length > 0) return true

  if (ctx.sessionCode) {
    const code = ctx.sessionCode.toUpperCase()
    if (/^[A-Z0-9]{6}$/.test(code)) {
      const session = await sessionStore.getSession(code).catch(() => null)
      if (session && session.users.includes(userId) && session.restaurants.some(r => r.id === gersId)) {
        return true
      }
    }
  }

  return false
}

/** What a gated member gets instead of the page: enough to want in. */
export const GATE_MESSAGE =
  'Nominate a place you love and every page in the library opens — this one included.'
