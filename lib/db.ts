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
const sqlProxy = function() {} as unknown as NeonQueryFunction<false, false>
export const sql = new Proxy(sqlProxy, {
  apply(_target, _thisArg, args) {
    return getSql()(args[0] as TemplateStringsArray, ...args.slice(1))
  },
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return (getSql() as unknown as Record<string, unknown>)[prop]
    }
    return undefined
  }
})

// Types for database records
export interface DbRestaurant {
  gers_id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  lat: number
  lng: number
  categories: string[]
  source: 'overture' | 'google'
  like_count: number
  nomination_count: number
  group_win_count: number
  created_at: Date
  updated_at: Date
}

export interface DbRestaurantMapping {
  google_place_id: string
  local_id: string
  source: 'overture' | 'google'
  times_shown: number
  times_picked: number
  created_at: Date
}

export interface DbUserProfile {
  id: string
  clerk_user_id: string
  display_name: string | null
  avatar_url: string | null
  like_count: number
  nomination_count: number
  created_at: Date
}

export interface DbUserFavorite {
  id: string
  clerk_user_id: string
  local_id: string
  google_place_id: string | null
  source: 'swipe' | 'group_vote' | 'nomination'
  created_at: Date
}

export interface DbVotingOutcome {
  id: string
  google_place_id: string
  local_id: string | null
  session_date: Date
  participant_count: number
  was_picked: boolean
  yes_votes: number
  no_votes: number
  city: string | null
  created_at: Date
}

// Local data returned for scoring
export interface LocalRestaurantData {
  local_id: string
  like_count: number
  times_shown: number
  times_picked: number
  pick_rate: number | null
}
