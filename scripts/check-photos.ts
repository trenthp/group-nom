import { config } from 'dotenv'
config({ path: '.env.local' })

import { sql } from '../lib/db'

async function checkPhotos() {
  const stats = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(ta_location_id) as linked,
      COUNT(CASE WHEN array_length(ta_photo_urls, 1) > 0 THEN 1 END) as with_photos,
      COUNT(ta_linked_at) as attempted
    FROM restaurants
  `
  console.log('Restaurant photo stats:')
  console.log(`  Total restaurants: ${stats[0].total}`)
  console.log(`  Linked to TripAdvisor: ${stats[0].linked}`)
  console.log(`  With photos: ${stats[0].with_photos}`)
  console.log(`  Link attempted: ${stats[0].attempted}`)

  // Sample some with photos
  const withPhotos = await sql`
    SELECT name, ta_photo_urls[1] as photo_url
    FROM restaurants
    WHERE array_length(ta_photo_urls, 1) > 0
    LIMIT 3
  `
  if (withPhotos.length > 0) {
    console.log('\nSample restaurants with photos:')
    withPhotos.forEach((r: any) => {
      const url = r.photo_url || ''
      console.log(`  ${r.name}: ${url.substring(0, 60)}...`)
    })
  }
}

checkPhotos().catch(console.error)
