/**
 * Neon Database Client for Group Nom
 *
 * Serverless Postgres connection using Neon's HTTP driver
 * for optimal performance with Vercel Edge/Serverless functions.
 */

import { neon, neonConfig } from '@neondatabase/serverless'

// Configure for Vercel Edge compatibility
neonConfig.fetchConnectionCache = true

// Create SQL client
const sql = neon(process.env.DATABASE_URL!)

export { sql }

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
