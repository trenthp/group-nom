/**
 * TripAdvisor Content API Client for Group Nom
 *
 * Handles lazy-linking of Overture restaurants to TripAdvisor locations.
 * Caches ta_location_id and photo URLs.
 *
 * API Docs: https://tripadvisor-content-api.readme.io/reference/overview
 */

import { sql } from './db'

const TA_API_BASE = 'https://api.content.tripadvisor.com/api/v1'

interface TripAdvisorPhoto {
  id: number
  is_blessed: boolean
  caption: string
  published_date: string
  images: {
    thumbnail: { url: string; width: number; height: number }
    small: { url: string; width: number; height: number }
    medium: { url: string; width: number; height: number }
    large: { url: string; width: number; height: number }
    original: { url: string; width: number; height: number }
  }
}

interface TripAdvisorLocation {
  location_id: string
  name: string
  address_obj?: {
    street1?: string
    city?: string
    state?: string
    country?: string
    postalcode?: string
    address_string?: string
  }
}

interface TripAdvisorSearchResponse {
  data: TripAdvisorLocation[]
}

interface TripAdvisorPhotosResponse {
  data: TripAdvisorPhoto[]
}

interface TripAdvisorLocationDetails {
  location_id: string
  name: string
  price_level?: string  // e.g., "$", "$$-$$$", "$$$-$$$$"
  rating?: string
  num_reviews?: string
}

/**
 * Search TripAdvisor for a location matching the given restaurant
 */
async function searchTripAdvisor(
  name: string,
  lat: number,
  lng: number
): Promise<TripAdvisorLocation | null> {
  const apiKey = process.env.TRIPADVISOR_API_KEY
  if (!apiKey) {
    console.warn('[TripAdvisor] API key not configured')
    return null
  }

  console.log(`[TripAdvisor] Searching for: "${name}" at ${lat},${lng}`)

  try {
    const params = new URLSearchParams({
      key: apiKey,
      searchQuery: name,
      latLong: `${lat},${lng}`,
      category: 'restaurants',
      language: 'en',
    })

    const response = await fetch(`${TA_API_BASE}/location/search?${params}`, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[TripAdvisor] API error ${response.status}: ${errorText}`)
      return null
    }

    const data: TripAdvisorSearchResponse = await response.json()
    console.log(`[TripAdvisor] Found ${data.data?.length || 0} results for "${name}"`)
    return data.data?.[0] || null
  } catch (error) {
    console.error('[TripAdvisor] Search failed:', error)
    return null
  }
}

/**
 * Get photos for a TripAdvisor location
 * Returns up to 5 high-quality recent photos
 */
async function getLocationPhotos(
  locationId: string
): Promise<TripAdvisorPhoto[]> {
  const apiKey = process.env.TRIPADVISOR_API_KEY
  if (!apiKey) {
    console.warn('[TripAdvisor] API key not configured for photos')
    return []
  }

  console.log(`[TripAdvisor] Fetching photos for location: ${locationId}`)

  try {
    const params = new URLSearchParams({
      key: apiKey,
      language: 'en',
    })

    const response = await fetch(
      `${TA_API_BASE}/location/${locationId}/photos?${params}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[TripAdvisor] Photos API error ${response.status}: ${errorText}`)
      return []
    }

    const data: TripAdvisorPhotosResponse = await response.json()
    console.log(`[TripAdvisor] Got ${data.data?.length || 0} photos for location ${locationId}`)
    return data.data || []
  } catch (error) {
    console.error('[TripAdvisor] Photos fetch failed:', error)
    return []
  }
}

/**
 * Get details for a TripAdvisor location (includes price level)
 * Only called when price filtering is enabled to save API calls
 */
async function getLocationDetails(
  locationId: string
): Promise<TripAdvisorLocationDetails | null> {
  const apiKey = process.env.TRIPADVISOR_API_KEY
  if (!apiKey) {
    console.warn('TRIPADVISOR_API_KEY not configured')
    return null
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      language: 'en',
    })

    const response = await fetch(
      `${TA_API_BASE}/location/${locationId}/details?${params}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error(`TripAdvisor details API error: ${response.status}`)
      return null
    }

    const data: TripAdvisorLocationDetails = await response.json()
    return data
  } catch (error) {
    console.error('TripAdvisor details fetch failed:', error)
    return null
  }
}

/**
 * Extract photo URL from TripAdvisor photo object
 * Uses 'large' size by default (max 550px on longest dimension)
 */
export function getPhotoUrl(
  photo: TripAdvisorPhoto,
  size: 'thumbnail' | 'small' | 'medium' | 'large' | 'original' = 'large'
): string {
  return photo.images[size]?.url || photo.images.large?.url || photo.images.original?.url
}

/**
 * Link a restaurant to TripAdvisor and cache the mapping
 *
 * This is the "lazy linking" - called on first access, then cached.
 * Requires 2-3 API calls: search + photos (+ details if fetchPrice=true)
 *
 * @param fetchPrice - If true, also fetches location details to get price level (adds 1 API call)
 */
export async function linkToTripAdvisor(
  gersId: string,
  name: string,
  lat: number,
  lng: number,
  fetchPrice: boolean = false
): Promise<{
  taLocationId: string | null
  photoUrls: string[]
  priceLevel: string | null
}> {
  console.log(`[TripAdvisor] Linking restaurant: ${name} (${gersId})`)

  // Search for matching location
  const location = await searchTripAdvisor(name, lat, lng)

  if (!location) {
    console.log(`[TripAdvisor] No match found for: ${name}`)
    // Mark as attempted but not found (avoid repeated lookups)
    await sql`
      UPDATE restaurants
      SET ta_linked_at = NOW()
      WHERE gers_id = ${gersId}
    `
    return { taLocationId: null, photoUrls: [], priceLevel: null }
  }

  console.log(`[TripAdvisor] Matched "${name}" to TA location: ${location.location_id}`)

  // Fetch photos for the location
  const photos = await getLocationPhotos(location.location_id)

  // Extract large photo URLs for caching
  const photoUrls = photos.map(p => getPhotoUrl(p, 'large')).filter(Boolean)
  console.log(`[TripAdvisor] Extracted ${photoUrls.length} photo URLs for ${name}`)

  // Optionally fetch details for price level
  let priceLevel: string | null = null
  if (fetchPrice) {
    const details = await getLocationDetails(location.location_id)
    priceLevel = details?.price_level || null
  }

  // Update database with cached TripAdvisor data
  await sql`
    UPDATE restaurants SET
      ta_location_id = ${location.location_id},
      ta_photo_urls = ${photoUrls},
      ta_price_level = ${priceLevel},
      ta_linked_at = NOW()
    WHERE gers_id = ${gersId}
  `

  console.log(`[TripAdvisor] Successfully linked ${name} with ${photoUrls.length} photos`)

  return {
    taLocationId: location.location_id,
    photoUrls,
    priceLevel,
  }
}

/**
 * Batch link multiple restaurants to TripAdvisor
 *
 * Used when a session includes restaurants that haven't been linked yet.
 * Processes concurrently with rate limiting.
 *
 * Note: TripAdvisor allows up to 50 calls/second, but we're conservative
 * to avoid hitting limits during peak usage.
 *
 * @param fetchPrice - If true, also fetches location details to get price level (adds 1 API call per restaurant)
 */
export async function batchLinkToTripAdvisor(
  restaurants: Array<{ gersId: string; name: string; lat: number; lng: number }>,
  fetchPrice: boolean = false
): Promise<Map<string, { photoUrls: string[]; priceLevel: string | null }>> {
  const results = new Map()

  // Process in batches of 5 to be conservative with rate limits
  // Each restaurant requires 2-3 API calls (search + photos + optional details)
  const batchSize = 5
  for (let i = 0; i < restaurants.length; i += batchSize) {
    const batch = restaurants.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(async (r) => {
        const result = await linkToTripAdvisor(r.gersId, r.name, r.lat, r.lng, fetchPrice)
        return { gersId: r.gersId, ...result }
      })
    )

    for (const result of batchResults) {
      results.set(result.gersId, {
        photoUrls: result.photoUrls,
        priceLevel: result.priceLevel,
      })
    }

    // Small delay between batches
    if (i + batchSize < restaurants.length) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  return results
}

/**
 * Get a photo URL for a restaurant
 *
 * Uses cached TripAdvisor photo data, links if not yet linked.
 */
export async function getRestaurantPhotoUrl(
  gersId: string,
  name: string,
  lat: number,
  lng: number,
  cachedPhotoUrls?: string[]
): Promise<string | null> {
  // Use cached photo if available
  if (cachedPhotoUrls && cachedPhotoUrls.length > 0) {
    return cachedPhotoUrls[0]
  }

  // Otherwise, try to link and get photo
  const result = await linkToTripAdvisor(gersId, name, lat, lng)
  if (result.photoUrls.length > 0) {
    return result.photoUrls[0]
  }

  return null
}
