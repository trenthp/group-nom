/**
 * One nomination per member per local day (decided Aug 2026).
 *
 * "Local" means the IANA zone the member's browser reports at publish
 * (Intl.DateTimeFormat().resolvedOptions().timeZone). It's spoofable and
 * that's fine — this is a social limit, not a security boundary. The
 * partial unique index `nominations_one_per_local_day` (migration 009)
 * makes enforcement atomic; everything here is for the UX around it.
 */

import { sql } from './db'

export const DAILY_LIMIT_CONSTRAINT = 'nominations_one_per_local_day'
const DEFAULT_TZ = 'UTC'

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length === 0 || tz.length > 64) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function resolveTimeZone(candidate: unknown, fallback?: string | null): string {
  if (isValidTimeZone(candidate)) return candidate
  if (isValidTimeZone(fallback)) return fallback
  return DEFAULT_TZ
}

/** YYYY-MM-DD for `now` as seen on a wall clock in `tz`. */
export function localDateIn(tz: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}

/**
 * The UTC instant of the next local midnight in `tz`. Good to the minute
 * except across a DST switch inside the same night, which is fine for
 * "come back tomorrow" copy.
 */
export function nextLocalMidnight(tz: string, now = new Date()): Date {
  // Wall-clock fields in tz, reassembled as if UTC: the difference from
  // `now` is the zone's current offset (independent of the server's zone)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const f = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0)
  const wallAsUtc = Date.UTC(f('year'), f('month') - 1, f('day'), f('hour'), f('minute'), f('second'))
  const offsetMs = wallAsUtc - Math.floor(now.getTime() / 1000) * 1000
  return new Date(Date.UTC(f('year'), f('month') - 1, f('day') + 1) - offsetMs)
}

export interface DailyStatus {
  timezone: string
  localDate: string
  usedToday: boolean
  /** ISO instant when the next nomination opens (next local midnight) */
  resetsAt: string
}

export async function getDailyStatus(clerkUserId: string, tz: string, now = new Date()): Promise<DailyStatus> {
  const localDate = localDateIn(tz, now)
  const rows = await sql`
    SELECT 1 FROM nominations
    WHERE clerk_user_id = ${clerkUserId} AND local_date = ${localDate}::date
    LIMIT 1
  `
  return {
    timezone: tz,
    localDate,
    usedToday: rows.length > 0,
    resetsAt: nextLocalMidnight(tz, now).toISOString(),
  }
}

export function limitMessage(status: DailyStatus): string {
  const when = new Date(status.resetsAt).toLocaleTimeString('en-US', {
    timeZone: status.timezone,
    hour: 'numeric',
    minute: '2-digit',
  })
  return `You've nominated a place today — the next one opens at ${when}. Come back tomorrow.`
}
