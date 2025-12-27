import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function testTripAdvisor() {
  console.log('=== TripAdvisor Integration Test ===\n');

  // Check if API key is configured
  if (!process.env.TRIPADVISOR_API_KEY) {
    console.log('❌ TRIPADVISOR_API_KEY not set in .env.local');
    console.log('   Add your key and re-run this test.\n');
    return;
  }
  console.log('✓ TRIPADVISOR_API_KEY is configured\n');

  // Get a sample restaurant to test with
  const restaurants = await sql`
    SELECT gers_id, name, lat, lng, city
    FROM restaurants
    WHERE ta_location_id IS NULL
    LIMIT 1
  `;

  if (restaurants.length === 0) {
    console.log('No unlinked restaurants found to test with.');
    return;
  }

  const testRestaurant = restaurants[0];
  console.log('Test restaurant:', testRestaurant.name);
  console.log('Location:', testRestaurant.city, `(${testRestaurant.lat}, ${testRestaurant.lng})\n`);

  // Import the TripAdvisor module
  const { linkToTripAdvisor } = await import('../lib/tripadvisor');

  // Test 1: Link without price (2 API calls)
  console.log('Test 1: Linking without price data (2 API calls)...');
  const startTime1 = Date.now();
  const result1 = await linkToTripAdvisor(
    testRestaurant.gers_id,
    testRestaurant.name,
    testRestaurant.lat,
    testRestaurant.lng,
    false // Don't fetch price
  );
  const time1 = Date.now() - startTime1;

  console.log('  Location ID:', result1.taLocationId || 'Not found');
  console.log('  Photos:', result1.photoUrls.length);
  console.log('  Price Level:', result1.priceLevel || 'Not fetched');
  console.log('  Time:', time1, 'ms\n');

  // Verify in database
  const dbCheck1 = await sql`
    SELECT ta_location_id, array_length(ta_photo_urls, 1) as photo_count, ta_price_level
    FROM restaurants WHERE gers_id = ${testRestaurant.gers_id}
  `;
  console.log('  DB Check - Location ID:', dbCheck1[0].ta_location_id);
  console.log('  DB Check - Photos:', dbCheck1[0].photo_count || 0);
  console.log('  DB Check - Price:', dbCheck1[0].ta_price_level || 'null');

  if (result1.taLocationId) {
    console.log('\n✓ Test 1 passed!\n');
  } else {
    console.log('\n⚠ Restaurant not found on TripAdvisor (this is OK, not all restaurants are listed)\n');
  }

  // Test 2: Get another restaurant and test with price
  const restaurants2 = await sql`
    SELECT gers_id, name, lat, lng, city
    FROM restaurants
    WHERE ta_location_id IS NULL
    LIMIT 1
  `;

  if (restaurants2.length > 0) {
    const testRestaurant2 = restaurants2[0];
    console.log('Test 2: Linking WITH price data (3 API calls)...');
    console.log('Restaurant:', testRestaurant2.name);

    const startTime2 = Date.now();
    const result2 = await linkToTripAdvisor(
      testRestaurant2.gers_id,
      testRestaurant2.name,
      testRestaurant2.lat,
      testRestaurant2.lng,
      true // Fetch price
    );
    const time2 = Date.now() - startTime2;

    console.log('  Location ID:', result2.taLocationId || 'Not found');
    console.log('  Photos:', result2.photoUrls.length);
    console.log('  Price Level:', result2.priceLevel || 'Not available');
    console.log('  Time:', time2, 'ms');

    if (result2.priceLevel) {
      console.log('\n✓ Test 2 passed - Price level fetched!\n');
    } else if (result2.taLocationId) {
      console.log('\n⚠ Restaurant found but no price level available\n');
    }
  }

  // Summary
  console.log('=== Summary ===');
  const stats = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(ta_location_id) as linked,
      COUNT(CASE WHEN array_length(ta_photo_urls, 1) > 0 THEN 1 END) as with_photos,
      COUNT(ta_price_level) as with_price
    FROM restaurants
  `;
  console.log('Total restaurants:', stats[0].total);
  console.log('Linked to TripAdvisor:', stats[0].linked);
  console.log('With photos:', stats[0].with_photos);
  console.log('With price level:', stats[0].with_price);
}

testTripAdvisor().catch(console.error);
