import { config } from 'dotenv';
config({ path: '.env.local' });

import { selectRestaurantsForSession } from '../lib/restaurantSelection';

async function test() {
  const cuisines = ['Italian', 'Mexican', 'BBQ', 'Japanese', 'Indian'];

  for (const cuisine of cuisines) {
    console.log(`\n=== Testing ${cuisine} filter ===`);

    try {
      const results = await selectRestaurantsForSession({
        lat: 25.7617,
        lng: -80.1918,
        filters: {
          distance: 10,
          cuisines: [cuisine],
          priceLevel: [],
          minRating: 0,
          openNow: false,
          maxReviews: 0,
          excludeChains: true,
        },
        limit: 5,
      });

      console.log(`Found ${results.length} ${cuisine} restaurants:`);
      results.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.name}`);
      });
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
    }
  }
}

test();
