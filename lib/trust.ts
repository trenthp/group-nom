/**
 * Trust-weighted ranking (Phase 4). The math lives in Postgres
 * (migration 013: compute_trust_score / recompute_love_score); this is
 * the app-side hook that asks for a recompute after the events that move
 * the inputs. Fire-and-forget: ranking freshness is not worth failing a
 * request over.
 *
 * NEVER return a trust score to a client.
 */

import { sql } from './db'

export function recomputeTrust(clerkUserId: string): void {
  sql`SELECT recompute_trust_score(${clerkUserId})`.catch(err =>
    console.error('[trust] recompute failed:', err)
  )
}
