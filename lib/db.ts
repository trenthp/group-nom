/**
 * Neon Database Client for Group Nom
 *
 * Serverless Postgres connection using Neon's HTTP driver
 * for optimal performance with Vercel Edge/Serverless functions.
 */

import { neon, NeonQueryFunction } from '@neondatabase/serverless'

// Lazy initialization to avoid build-time errors when DATABASE_URL is not set
let _sql: NeonQueryFunction<false, false> | null = null

function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}

// Export a proxy that lazily initializes the SQL client
// The target must be a function for the apply trap to work
const sqlProxy = function() {} as unknown as NeonQueryFunction<false, false>
export const sql = new Proxy(sqlProxy, {
  apply(_target, _thisArg, args) {
    return getSql()(args[0] as TemplateStringsArray, ...args.slice(1))
  },
  get(_target, prop) {
    return (getSql() as any)[prop]
  }
})

// Types for database records
export interface DbRestaurant {
  gers_id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  lat: number
  lng: number
  h3_index_res8: string | null
  h3_index_res9: string | null
  categories: string[]
  primary_category: string | null
  fsq_place_id: string | null
  fsq_photo_ids: string[]
  fsq_rating: number | null
  fsq_price_level: number | null
  times_shown: number
  times_picked: number
  pick_rate: number | null
}

export interface DbVotingOutcome {
  id: string
  gers_id: string
  session_date: Date
  participant_count: number
  was_picked: boolean
  yes_votes: number
  no_votes: number
  city: string | null
}

// Helper to convert BigInt H3 index to string for JSON serialization
export function serializeRestaurant(row: any): DbRestaurant {
  return {
    ...row,
    h3_index_res8: row.h3_index_res8?.toString() ?? null,
    h3_index_res9: row.h3_index_res9?.toString() ?? null,
  }
}
