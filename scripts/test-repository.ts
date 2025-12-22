/**
 * Test script for restaurant repository
 * Run with: npx tsx scripts/test-repository.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import {
  getRestaurantById,
  getRestaurantsByIds,
  getRestaurantsNearby,
  searchRestaurantsByName,
  getRestaurantsByCategory,
  getTopRestaurants,
  getUnlinkedRestaurants,
  getRestaurantStats,
  getCategoriesInArea,
} from '../lib/restaurantRepository'

// Miami coordinates for testing
const MIAMI_LAT = 25.7617
const MIAMI_LNG = -80.1918

async function runTests() {
  console.log('=== Testing Restaurant Repository ===\n')

  // 1. Get stats
  console.log('1. getRestaurantStats()')
  try {
    const stats = await getRestaurantStats()
    console.log('   Total restaurants:', stats.totalRestaurants)
    console.log('   Linked to Foursquare:', stats.linkedToFoursquare)
    console.log('   With photos:', stats.withPhotos)
    console.log('   States:', Object.keys(stats.byState).join(', '))
    console.log('   ✓ PASS\n')
  } catch (e) {
    console.log('   ✗ FAIL:', e)
  }

  // 2. Get restaurants nearby
  console.log('2. getRestaurantsNearby(Miami, 5km)')
  let sampleIds: string[] = []
  try {
    const nearby = await getRestaurantsNearby(MIAMI_LAT, MIAMI_LNG, 5, 10)
    console.log('   Found:', nearby.length, 'restaurants')
    if (nearby.length > 0) {
      console.log('   Sample:', nearby[0].name, '-', nearby[0].address)
      sampleIds = nearby.slice(0, 3).map(r => r.gers_id)
    }
    console.log('   ✓ PASS\n')
  } catch (e) {
    console.log('   ✗ FAIL:', e)
  }

  // 3. Get by ID
  if (sampleIds.length > 0) {
    console.log('3. getRestaurantById()')
    try {
      const restaurant = await getRestaurantById(sampleIds[0])
      if (restaurant) {
        console.log('   Found:', restaurant.name)
        console.log('   Categories:', restaurant.categories?.join(', ') || 'none')
        console.log('   H3 Res8:', restaurant.h3_index_res8)
        console.log('   ✓ PASS\n')
      } else {
        console.log('   ✗ FAIL: Restaurant not found')
      }
    } catch (e) {
      console.log('   ✗ FAIL:', e)
    }

    // 4. Get multiple by IDs
    console.log('4. getRestaurantsByIds()')
    try {
      const restaurants = await getRestaurantsByIds(sampleIds)
      console.log('   Requested:', sampleIds.length, 'Found:', restaurants.length)
      console.log('   ✓ PASS\n')
    } catch (e) {
      console.log('   ✗ FAIL:', e)
    }
  }

  // 5. Search by name
  console.log('5. searchRestaurantsByName("pizza", Miami)')
  try {
    const results = await searchRestaurantsByName('pizza', MIAMI_LAT, MIAMI_LNG, 5)
    console.log('   Found:', results.length, 'results')
    results.slice(0, 3).forEach(r => console.log('   -', r.name))
    console.log('   ✓ PASS\n')
  } catch (e) {
    console.log('   ✗ FAIL:', e)
  }

  // 6. Get by category
  console.log('6. getRestaurantsByCategory("mexican_restaurant", "Miami")')
  try {
    const results = await getRestaurantsByCategory('mexican_restaurant', 'Miami', 5)
    console.log('   Found:', results.length, 'results')
    results.slice(0, 3).forEach(r => console.log('   -', r.name))
    console.log('   ✓ PASS\n')
  } catch (e) {
    console.log('   ✗ FAIL:', e)
  }

  // 7. Get categories in area
  console.log('7. getCategoriesInArea(Miami, 10km)')
  try {
    const categories = await getCategoriesInArea(MIAMI_LAT, MIAMI_LNG, 10)
    console.log('   Found:', categories.length, 'categories')
    categories.slice(0, 5).forEach(c => console.log('   -', c.category, `(${c.count})`))
    console.log('   ✓ PASS\n')
  } catch (e) {
    console.log('   ✗ FAIL:', e)
  }

  // 8. Get unlinked restaurants
  console.log('8. getUnlinkedRestaurants()')
  try {
    const unlinked = await getUnlinkedRestaurants(5)
    console.log('   Found:', unlinked.length, 'unlinked restaurants')
    console.log('   ✓ PASS\n')
  } catch (e) {
    console.log('   ✗ FAIL:', e)
  }

  // 9. Get top restaurants (will be empty since no votes yet)
  console.log('9. getTopRestaurants()')
  try {
    const top = await getTopRestaurants('Miami', 5)
    console.log('   Found:', top.length, 'top-rated restaurants')
    console.log('   (Expected 0 - no voting data yet)')
    console.log('   ✓ PASS\n')
  } catch (e) {
    console.log('   ✗ FAIL:', e)
  }

  console.log('=== Tests Complete ===')
}

runTests().catch(console.error)
