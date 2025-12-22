import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

async function estimate() {
  console.log('=== Storage Estimate ===\n');

  // Current stats
  const stats = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(fsq_place_id) as already_linked,
      COUNT(CASE WHEN array_length(fsq_photo_ids, 1) > 0 THEN 1 END) as with_photos
    FROM restaurants
  `;
  console.log('Restaurants:', stats[0].total);
  console.log('Already Foursquare-linked:', stats[0].already_linked);
  console.log('With photos:', stats[0].with_photos);

  // DB size
  const size = await sql`
    SELECT pg_size_pretty(pg_database_size(current_database())) as size
  `;
  console.log('\nCurrent DB size:', size[0].size);

  // Estimate Foursquare data per restaurant
  // fsq_place_id: ~25 bytes
  // fsq_photo_ids: ~100 bytes (2-3 photo refs)
  // fsq_rating: 8 bytes
  // fsq_price_level: 4 bytes
  // ~150 bytes per restaurant

  const unlinked = Number(stats[0].total) - Number(stats[0].already_linked);
  const fsqEstimate = (unlinked * 150) / (1024 * 1024);

  console.log('\n=== Estimates ===');
  console.log(`Unlinked restaurants: ${unlinked.toLocaleString()}`);
  console.log(`Foursquare data (~150 bytes each): ~${fsqEstimate.toFixed(0)} MB`);

  // Analytics: voting_outcomes table
  // Assume 1000 sessions/month, 10 restaurants each = 10K records/month
  // Each record ~100 bytes = 1 MB/month
  console.log(`\nAnalytics (voting_outcomes):`);
  console.log(`  Per session (10 restaurants): ~1 KB`);
  console.log(`  1,000 sessions/month: ~1 MB/month`);
  console.log(`  10,000 sessions/month: ~10 MB/month`);

  console.log('\n=== Recommendation ===');
  const totalEstimate = 492 + fsqEstimate + 10; // current + fsq + buffer
  console.log(`Current: 492 MB`);
  console.log(`+ Foursquare linking: ~${fsqEstimate.toFixed(0)} MB`);
  console.log(`+ Analytics buffer: ~10 MB`);
  console.log(`= Total estimate: ~${totalEstimate.toFixed(0)} MB`);
  console.log(`\nNeon free tier: 512 MB (you're at the limit)`);
  console.log(`Neon Launch plan: 10 GB ($19/mo) - plenty of room`);
}

estimate().catch(console.error);
