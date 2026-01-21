import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Client } from '@googlemaps/google-maps-services-js'
import { getRandomRestaurants } from '@/lib/googleMaps'
import { getRestaurantLimit } from '@/lib/userTiers'
import { getChainNames } from '@/lib/restaurantMatcher'
import { Restaurant } from '@/lib/types'

const client = new Client({})

// Module-level cache for database-driven chain names
let cachedChainNames: Set<string> | null = null
let cacheExpiry = 0

// Common chain restaurant names/keywords for deprioritization
const CHAIN_KEYWORDS = [
  // Fast food
  'mcdonald', 'burger king', 'wendy', 'taco bell', 'kfc', 'popeyes',
  'chick-fil-a', 'sonic', 'jack in the box', 'carl\'s jr', 'hardee',
  'whataburger', 'in-n-out', 'five guys', 'shake shack', 'white castle',
  'arby\'s', 'checkers', 'rally\'s', 'del taco', 'wingstop',
  // Fast casual
  'chipotle', 'panera', 'qdoba', 'moe\'s', 'firehouse subs', 'jersey mike',
  'jimmy john', 'subway', 'potbelly', 'panda express', 'noodles & company',
  'blaze pizza', 'mod pizza', 'sweetgreen', 'cava', 'zoe\'s kitchen',
  // Casual dining
  'applebee', 'chili\'s', 'olive garden', 'red lobster', 'outback',
  'texas roadhouse', 'longhorn', 'red robin', 'buffalo wild wings', 'bww',
  'cheesecake factory', 'p.f. chang', 'benihana', 'hooters', 'twin peaks',
  'ihop', 'denny\'s', 'waffle house', 'cracker barrel', 'bob evans',
  'golden corral', 'hometown buffet', 'old country buffet',
  // Coffee & dessert
  'starbucks', 'dunkin', 'caribou coffee', 'peet\'s coffee', 'tim hortons',
  'baskin-robbins', 'dairy queen', 'coldstone', 'krispy kreme',
  // Pizza chains
  'domino\'s', 'pizza hut', 'papa john', 'little caesars', 'marco\'s pizza',
  'papa murphy', 'cicis', 'round table', 'mountain mike',
  // Other chains
  'yard house', 'bj\'s restaurant', 'dave & buster',
  'topgolf', 'main event', 'cheddar\'s', 'carrabba', 'maggiano',
  'bonefish grill', 'seasons 52', 'the capital grille', 'eddie v',
  'ruth\'s chris', 'morton\'s', 'flemings', 'fogo de chao',
  'nando\'s', 'raising cane', 'zaxby', 'culver\'s',
  'portillo\'s', 'jason\'s deli', 'mcalister\'s', 'corner bakery',
]

// Get chain keywords from database with fallback to hardcoded list
async function getChainKeywords(): Promise<Set<string>> {
  const now = Date.now()
  if (cachedChainNames && now < cacheExpiry) {
    return cachedChainNames
  }
  try {
    cachedChainNames = await getChainNames()
    cacheExpiry = now + 60 * 60 * 1000 // 1 hour cache
    // If DB returned empty set, merge with hardcoded fallback
    if (cachedChainNames.size === 0) {
      cachedChainNames = new Set(CHAIN_KEYWORDS)
    }
    return cachedChainNames
  } catch {
    // Fallback to hardcoded list if DB fails
    return new Set(CHAIN_KEYWORDS)
  }
}

// Check if a restaurant name matches known chains (sync version using cached data)
function isChainRestaurant(name: string, chainKeywords: Set<string>): boolean {
  const lowerName = name.toLowerCase()
  // Check if name contains any chain keyword
  for (const chain of chainKeywords) {
    if (lowerName.includes(chain)) {
      return true
    }
  }
  return false
}

export async function POST(request: NextRequest) {
  try {
    // Get auth status to enforce tier-appropriate limits
    const { userId } = await auth()
    const isAuthenticated = !!userId
    const maxAllowedLimit = getRestaurantLimit(isAuthenticated)

    const { lat, lng, radius = 5000, limit = 8, filters, excludeIds = [] } = await request.json()

    // Enforce tier-based maximum limit
    const effectiveLimit = Math.min(limit, maxAllowedLimit)
    // Convert excludeIds to a Set for fast lookup
    const excludeSet = new Set<string>(excludeIds)
    const minRating = filters?.minRating || 0
    const openNow = filters?.openNow || false
    const maxReviews = filters?.maxReviews || 0
    const priceLevel = filters?.priceLevel || [] // [1, 2, 3, 4] for $, $$, $$$, $$$$
    const cuisines = filters?.cuisines || [] // ['Italian', 'Mexican', etc.]
    const preferLocal = filters?.preferLocal !== false // Default to true if not specified

    // Check if API key is configured
    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    if (!apiKey || apiKey === 'your_api_key_here') {
      console.warn('Google Maps API key not configured, using mock data')
      const restaurants = getRandomRestaurants(effectiveLimit)
      return NextResponse.json({
        success: true,
        restaurants,
        usingMockData: true,
        meta: {
          limit: effectiveLimit,
          maxAllowed: maxAllowedLimit,
          isLimited: limit > effectiveLimit,
        },
      })
    }

    // Fisher-Yates shuffle algorithm for true randomization
    const fisherYatesShuffle = <T,>(array: T[]): T[] => {
      const shuffled = [...array]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    }

    // Variety: randomly decide search strategy for this request
    // This helps show different restaurants across sessions
    const useDistanceRanking = Math.random() < 0.4 // 40% chance to rank by distance
    const skipFirstPage = Math.random() < 0.3 // 30% chance to skip first page results

    // Fetch restaurants - if cuisines selected, make separate calls per cuisine for better results
    let allResults: any[] = []
    const seenPlaceIds = new Set<string>()

    // Helper to fetch results for a keyword with variety mechanisms
    const fetchForKeyword = async (keyword?: string) => {
      let pageToken: string | undefined = undefined
      // Fetch more pages to have a larger pool to sample from
      const maxPages = cuisines.length > 1 ? 2 : 4
      const results: any[] = []
      let pagesSkipped = 0

      for (let page = 0; page < maxPages; page++) {
        // Build params - use rankby:distance sometimes for variety
        // Note: rankby and radius are mutually exclusive in Google API
        const params: Record<string, unknown> = {
          location: { lat, lng },
          type: 'restaurant',
          key: apiKey,
          ...(openNow && { opennow: true }),
          ...(pageToken && { pagetoken: pageToken }),
          ...(keyword && { keyword }),
        }

        // Use distance ranking for variety (only on first page, can't combine with pagetoken)
        if (useDistanceRanking && !pageToken && !keyword) {
          params.rankby = 'distance'
        } else {
          params.radius = radius
        }

        const response = await client.placesNearby({
          params: params as any,
        })

        if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
          break
        }

        // Skip first page sometimes for variety (more unique results)
        if (skipFirstPage && page === 0 && pagesSkipped === 0 && response.data.next_page_token) {
          pagesSkipped++
          pageToken = response.data.next_page_token
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }

        results.push(...(response.data.results || []))
        pageToken = response.data.next_page_token

        if (!pageToken) break

        if (page < maxPages - 1 && pageToken) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      return results
    }

    if (cuisines.length > 0) {
      // Make separate API calls for each cuisine to ensure we get results for each
      for (const cuisine of cuisines) {
        const results = await fetchForKeyword(cuisine)
        // Deduplicate by place_id and exclude already-seen IDs
        for (const place of results) {
          if (place.place_id && !seenPlaceIds.has(place.place_id) && !excludeSet.has(place.place_id)) {
            seenPlaceIds.add(place.place_id)
            allResults.push(place)
          }
        }
      }
    } else {
      // No cuisine filter - fetch normally with pagination
      const results = await fetchForKeyword(undefined)
      // Filter out excluded IDs
      allResults = results.filter((place: any) => !excludeSet.has(place.place_id))
    }

    // Handle case where first call fails completely
    if (allResults.length === 0 && cuisines.length === 0) {
      const restaurants = getRandomRestaurants(effectiveLimit)
      return NextResponse.json({
        success: true,
        restaurants,
        usingMockData: true,
        meta: {
          limit: effectiveLimit,
          maxAllowed: maxAllowedLimit,
          isLimited: limit > effectiveLimit,
        },
      })
    }

    // Transform Google Places results to our Restaurant type
    let results = allResults

    // Apply filters
    if (minRating > 0) {
      results = results.filter((place) => (place.rating || 0) >= minRating)
    }

    if (maxReviews > 0) {
      results = results.filter((place) => {
        const reviewCount = place.user_ratings_total || 0
        // If maxReviews is 100, we want <= 100 (hidden gems)
        // If maxReviews is 300, we want <= 300 (lesser-known)
        // etc.
        if (maxReviews === 100) return reviewCount <= 100
        if (maxReviews === 300) return reviewCount <= 300
        if (maxReviews === 500) return reviewCount <= 500
        if (maxReviews === 1000) return reviewCount >= 1000
        if (maxReviews === 5000) return reviewCount >= 5000
        return true
      })
    }

    // Filter by price level
    if (priceLevel.length > 0) {
      results = results.filter((place) => {
        // Google's price_level: 0=free, 1=$, 2=$$, 3=$$$, 4=$$$$
        // Our priceLevel: [1, 2, 3, 4] maps to $, $$, $$$, $$$$
        const placePriceLevel = place.price_level || 1 // Default to $ if not specified
        return priceLevel.includes(placePriceLevel)
      })
    }

    // Note: Cuisine filtering is now done at the API level (separate calls per cuisine)
    // so we don't need to filter locally anymore

    // Filter out non-restaurant place types (gas stations, convenience stores, etc.)
    // These get included because they technically serve food, but aren't real restaurants
    const EXCLUDED_PLACE_TYPES = [
      'gas_station',
      'convenience_store',
      'grocery_or_supermarket',
      'supermarket',
      'liquor_store',
      'drugstore',
      'pharmacy',
      'department_store',
      'shopping_mall',
    ]

    results = results.filter((place) => {
      const types: string[] = place.types || []
      // Exclude if place has any of the excluded types
      return !types.some((type: string) => EXCLUDED_PLACE_TYPES.includes(type))
    })

    // Apply chain prioritization based on preferLocal filter
    let prioritized: typeof results
    if (preferLocal) {
      // Fetch chain keywords from database (with fallback to hardcoded list)
      const chainKeywords = await getChainKeywords()

      // Separate local restaurants from chains - prioritize local/independent places
      const localRestaurants = results.filter(place => !isChainRestaurant(place.name || '', chainKeywords))
      const chainRestaurants = results.filter(place => isChainRestaurant(place.name || '', chainKeywords))

      // Shuffle both groups separately
      const shuffledLocal = fisherYatesShuffle(localRestaurants)
      const shuffledChains = fisherYatesShuffle(chainRestaurants)

      // Combine: locals first, then chains as fallback
      prioritized = [...shuffledLocal, ...shuffledChains]
    } else {
      // No chain preference - just shuffle everything together
      prioritized = fisherYatesShuffle(results)
    }

    // Take a larger sample than needed for final random selection
    // This adds another layer of variety
    const sampleSize = Math.min(prioritized.length, effectiveLimit * 3)
    const sample = prioritized.slice(0, sampleSize)

    // Final shuffle of the sample for good measure
    const shuffled = fisherYatesShuffle(sample)

    const restaurants: Restaurant[] = shuffled
      .slice(0, effectiveLimit)
      .map((place, index) => {
        // Map price_level (0-4) to our display format
        let priceLevel = '$'
        if (place.price_level === 2) priceLevel = '$$'
        else if (place.price_level === 3) priceLevel = '$$$'
        else if (place.price_level === 4) priceLevel = '$$$$'

        return {
          id: place.place_id || `place-${index}`,
          name: place.name || 'Unknown Restaurant',
          address: place.vicinity || 'Address not available',
          rating: place.rating || 0,
          reviewCount: place.user_ratings_total || 0,
          cuisines: place.types?.filter((t: string) =>
            !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(t)
          ).map((t: string) =>
            t.split('_').map((word: string) =>
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')
          ) || ['Restaurant'],
          lat: place.geometry?.location.lat || 0,
          lng: place.geometry?.location.lng || 0,
          priceLevel,
          imageUrl: place.photos?.[0]?.photo_reference
            ? `/api/places/photo?ref=${place.photos[0].photo_reference}&maxwidth=400`
            : undefined,
        }
      })

    return NextResponse.json({
      success: true,
      restaurants,
      usingMockData: false,
      meta: {
        limit: effectiveLimit,
        maxAllowed: maxAllowedLimit,
        isLimited: limit > effectiveLimit,
      },
    })
  } catch (error) {
    console.error('Error fetching restaurants:', error)
    // Fallback to mock data on error (use default limit of 5 for safety)
    const restaurants = getRandomRestaurants(5)
    return NextResponse.json({
      success: true,
      restaurants,
      usingMockData: true,
      meta: {
        limit: 5,
        maxAllowed: 5,
        isLimited: false,
      },
    })
  }
}
