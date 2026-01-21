/**
 * Seed chain_names table with known chain keywords
 *
 * Usage: npx tsx scripts/run-seed-chains.ts
 *
 * This populates the chain_names table with common chain restaurant keywords
 * that are used for the "prefer local" filter feature.
 */

import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Chain keywords - same as CHAIN_KEYWORDS in api/restaurants/nearby/route.ts
// These are lowercased for substring matching
const CHAIN_KEYWORDS = [
  // Fast food
  'mcdonald', 'burger king', 'wendy', 'taco bell', 'kfc', 'popeyes',
  'chick-fil-a', 'sonic', 'jack in the box', "carl's jr", 'hardee',
  'whataburger', 'in-n-out', 'five guys', 'shake shack', 'white castle',
  "arby's", 'checkers', "rally's", 'del taco', 'wingstop',
  // Fast casual
  'chipotle', 'panera', 'qdoba', "moe's", 'firehouse subs', 'jersey mike',
  'jimmy john', 'subway', 'potbelly', 'panda express', 'noodles & company',
  'blaze pizza', 'mod pizza', 'sweetgreen', 'cava', "zoe's kitchen",
  // Casual dining
  'applebee', "chili's", 'olive garden', 'red lobster', 'outback',
  'texas roadhouse', 'longhorn', 'red robin', 'buffalo wild wings', 'bww',
  'cheesecake factory', 'p.f. chang', 'benihana', 'hooters', 'twin peaks',
  'ihop', "denny's", 'waffle house', 'cracker barrel', 'bob evans',
  'golden corral', 'hometown buffet', 'old country buffet',
  // Coffee & dessert
  'starbucks', 'dunkin', 'caribou coffee', "peet's coffee", 'tim hortons',
  'baskin-robbins', 'dairy queen', 'coldstone', 'krispy kreme',
  // Pizza chains
  "domino's", 'pizza hut', 'papa john', 'little caesars', "marco's pizza",
  'papa murphy', 'cicis', 'round table', 'mountain mike',
  // Other chains
  'yard house', "bj's restaurant", 'dave & buster',
  'topgolf', 'main event', "cheddar's", 'carrabba', 'maggiano',
  'bonefish grill', 'seasons 52', 'the capital grille', 'eddie v',
  "ruth's chris", "morton's", 'flemings', 'fogo de chao',
  "nando's", 'raising cane', 'zaxby', "culver's",
  "portillo's", "jason's deli", "mcalister's", 'corner bakery',
]

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set in .env.local')
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)

  console.log('Seeding chain_names table with', CHAIN_KEYWORDS.length, 'keywords...\n')

  let inserted = 0
  let updated = 0

  for (const keyword of CHAIN_KEYWORDS) {
    try {
      const result = await sql`
        INSERT INTO chain_names (name, location_count)
        VALUES (${keyword}, 100)
        ON CONFLICT (name) DO UPDATE SET location_count = 100
        RETURNING (xmax = 0) as is_insert
      `
      if (result[0]?.is_insert) {
        inserted++
      } else {
        updated++
      }
    } catch (err) {
      console.error(`Error inserting "${keyword}":`, err)
    }
  }

  console.log(`Inserted: ${inserted}, Updated: ${updated}`)

  // Verify
  const count = await sql`SELECT COUNT(*) as count FROM chain_names WHERE location_count >= 5`
  console.log(`\nTotal chain keywords: ${count[0].count}`)
}

main().catch(console.error)
