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
      COUNT(ta_location_id) as already_linked,
      COUNT(CASE WHEN array_length(ta_photo_urls, 1) > 0 THEN 1 END) as with_photos
    FROM restaurants
  `;
  console.log('Restaurants:', stats[0].total);
  console.log('Already TripAdvisor-linked:', stats[0].already_linked);
  console.log('With photos:', stats[0].with_photos);

  // DB size
  const size = await sql`
    SELECT pg_size_pretty(pg_database_size(current_database())) as size
  `;
  console.log('\nCurrent DB size:', size[0].size);

  // Estimate TripAdvisor data per restaurant
  // ta_location_id: ~15 bytes
  // ta_photo_urls: ~500 bytes (up to 5 full URLs)
  // ~520 bytes per restaurant

  const unlinked = Number(stats[0].total) - Number(stats[0].already_linked);
  const taEstimate = (unlinked * 520) / (1024 * 1024);

  console.log('\n=== Estimates ===');
  console.log(`Unlinked restaurants: ${unlinked.toLocaleString()}`);
  console.log(`TripAdvisor data (~520 bytes each): ~${taEstimate.toFixed(0)} MB`);

  // Analytics: voting_outcomes table
  // Assume 1000 sessions/month, 10 restaurants each = 10K records/month
  // Each record ~100 bytes = 1 MB/month
  console.log(`\nAnalytics (voting_outcomes):`);
  console.log(`  Per session (10 restaurants): ~1 KB`);
  console.log(`  1,000 sessions/month: ~1 MB/month`);
  console.log(`  10,000 sessions/month: ~10 MB/month`);

  console.log('\n=== Recommendation ===');
  const currentSize = 492; // Update this after migration
  const totalEstimate = currentSize + taEstimate + 10;
  console.log(`Current: ${currentSize} MB`);
  console.log(`+ TripAdvisor linking: ~${taEstimate.toFixed(0)} MB`);
  console.log(`+ Analytics buffer: ~10 MB`);
  console.log(`= Total estimate: ~${totalEstimate.toFixed(0)} MB`);
  console.log(`\nNeon free tier: 512 MB`);
  console.log(`Neon Launch plan: 10 GB ($19/mo) - plenty of room`);
}

estimate().catch(console.error);
