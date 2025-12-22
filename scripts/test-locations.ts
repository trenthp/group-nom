/**
 * Test location-based queries across Florida
 * Run with: npx tsx scripts/test-locations.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { getRestaurantsNearby, getCategoriesInArea } from '../lib/restaurantRepository'
import { haversineDistance } from '../lib/h3'

// Florida test locations
const LOCATIONS = [
  { name: 'Miami', lat: 25.7617, lng: -80.1918 },
  { name: 'Orlando', lat: 28.5383, lng: -81.3792 },
  { name: 'Tampa', lat: 27.9506, lng: -82.4572 },
  { name: 'Jacksonville', lat: 30.3322, lng: -81.6557 },
  { name: 'Fort Lauderdale', lat: 26.1224, lng: -80.1373 },
  { name: 'Key West', lat: 24.5551, lng: -81.7800 },
]

async function testLocations() {
  console.log('=== Testing Location-Based Queries ===\n')

  for (const loc of LOCATIONS) {
    console.log(`📍 ${loc.name} (${loc.lat}, ${loc.lng})`)

    try {
      // Test nearby search with different radii
      const nearby1km = await getRestaurantsNearby(loc.lat, loc.lng, 1, 100)
      const nearby5km = await getRestaurantsNearby(loc.lat, loc.lng, 5, 100)
      const nearby10km = await getRestaurantsNearby(loc.lat, loc.lng, 10, 100)

      console.log(`   1km radius: ${nearby1km.length} restaurants`)
      console.log(`   5km radius: ${nearby5km.length} restaurants`)
      console.log(`   10km radius: ${nearby10km.length} restaurants`)

      // Verify distances are correct for 5km results
      if (nearby5km.length > 0) {
        const distances = nearby5km.map(r => ({
          name: r.name,
          distance: haversineDistance(loc.lat, loc.lng, r.lat, r.lng)
        }))

        const maxDist = Math.max(...distances.map(d => d.distance))
        const avgDist = distances.reduce((sum, d) => sum + d.distance, 0) / distances.length

        console.log(`   Avg distance: ${avgDist.toFixed(2)}km, Max: ${maxDist.toFixed(2)}km`)

        // Show closest restaurant
        const closest = distances.sort((a, b) => a.distance - b.distance)[0]
        console.log(`   Closest: "${closest.name}" (${closest.distance.toFixed(2)}km)`)
      }

      // Get categories in area
      const categories = await getCategoriesInArea(loc.lat, loc.lng, 5)
      const topCats = categories.slice(0, 3).map(c => `${c.category} (${c.count})`).join(', ')
      console.log(`   Top categories: ${topCats}`)

    } catch (e: any) {
      console.log(`   ✗ Error: ${e.message}`)
    }

    console.log()
  }

  console.log('=== Location Tests Complete ===')
}

testLocations().catch(console.error)
