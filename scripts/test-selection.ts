import { config } from 'dotenv';
config({ path: '.env.local' });

import { selectRestaurantsForSession } from '../lib/restaurantSelection';

async function test() {
  console.log('=== Testing WITH chains (default) ===\n');

  try {
    const withChains = await selectRestaurantsForSession({
      lat: 25.7617,
      lng: -80.1918,
      filters: {
        distance: 5,
        cuisines: [],
        priceLevel: [],
        minRating: 0,
        openNow: false,
        maxReviews: 0,
        excludeChains: false,
      },
      limit: 10,
    });

    console.log(`Found ${withChains.length} restaurants (with chains):`);
    withChains.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name}`);
    });

    console.log('\n=== Testing WITHOUT chains ===\n');

    const noChains = await selectRestaurantsForSession({
      lat: 25.7617,
      lng: -80.1918,
      filters: {
        distance: 5,
        cuisines: [],
        priceLevel: [],
        minRating: 0,
        openNow: false,
        maxReviews: 0,
        excludeChains: true,
      },
      limit: 10,
    });

    console.log(`Found ${noChains.length} restaurants (no chains):`);
    noChains.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
