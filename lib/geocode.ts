/**
 * Server-side forward geocoding via LocationIQ (free tier).
 * The /api/geocode route keeps its own inline copy for the client flow;
 * this is for server code that needs coordinates (add-a-place).
 */

const LOCATIONIQ_BASE = 'https://us1.locationiq.com/v1'

export interface GeocodeResult {
  lat: number
  lng: number
  formattedAddress: string
  city?: string
  state?: string
  postalCode?: string
}

export async function forwardGeocode(address: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.LOCATIONIQ_API_KEY
  if (!apiKey) {
    console.warn('[geocode] LOCATIONIQ_API_KEY not configured')
    return null
  }

  const url =
    `${LOCATIONIQ_BASE}/search?key=${apiKey}&q=${encodeURIComponent(address)}` +
    `&format=json&countrycodes=us&limit=1&addressdetails=1`
  const response = await fetch(url)
  if (!response.ok) return null

  const data = await response.json()
  const hit = Array.isArray(data) ? data[0] : null
  if (!hit) return null

  const a = hit.address ?? {}
  return {
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    formattedAddress: hit.display_name,
    city: a.city || a.town || a.village || a.county || undefined,
    state: a.state || undefined,
    postalCode: a.postcode || undefined,
  }
}
