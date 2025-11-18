import { Restaurant } from './types'

// Mock restaurants - replace with real Google Maps API calls
const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: '1',
    name: 'The Crispy Spoon',
    address: '123 Main St, Downtown',
    rating: 4.5,
    reviewCount: 342,
    cuisines: ['American', 'Comfort Food'],
    lat: 40.7128,
    lng: -74.006,
    priceLevel: '$$',
  },
  {
    id: '2',
    name: 'Sushi Paradise',
    address: '456 Oak Ave, Midtown',
    rating: 4.7,
    reviewCount: 521,
    cuisines: ['Japanese', 'Sushi'],
    lat: 40.7260,
    lng: -73.9897,
    priceLevel: '$$$',
  },
  {
    id: '3',
    name: 'La Dolce Vita',
    address: '789 Maple Rd, Uptown',
    rating: 4.3,
    reviewCount: 287,
    cuisines: ['Italian', 'Mediterranean'],
    lat: 40.7489,
    lng: -73.9680,
    priceLevel: '$$',
  },
  {
    id: '4',
    name: 'Spice Route',
    address: '321 Pine St, East Side',
    rating: 4.6,
    reviewCount: 413,
    cuisines: ['Indian', 'Curry'],
    lat: 40.7580,
    lng: -73.9855,
    priceLevel: '$$',
  },
  {
    id: '5',
    name: 'Burger Junction',
    address: '654 Elm St, West End',
    rating: 4.2,
    reviewCount: 198,
    cuisines: ['American', 'Burgers'],
    lat: 40.7245,
    lng: -74.0020,
    priceLevel: '$',
  },
  {
    id: '6',
    name: 'Garden Greens',
    address: '987 Birch Ave, Green District',
    rating: 4.4,
    reviewCount: 156,
    cuisines: ['Vegetarian', 'Healthy'],
    lat: 40.7505,
    lng: -73.9934,
    priceLevel: '$$',
  },
  {
    id: '7',
    name: 'Seoul Kitchen',
    address: '111 Cedar Ln, Koreatown',
    rating: 4.6,
    reviewCount: 389,
    cuisines: ['Korean', 'BBQ'],
    lat: 40.7614,
    lng: -73.9776,
    priceLevel: '$$',
  },
  {
    id: '8',
    name: 'Taco Fiesta',
    address: '222 Spruce Dr, Latin Quarter',
    rating: 4.3,
    reviewCount: 267,
    cuisines: ['Mexican', 'Tacos'],
    lat: 40.7489,
    lng: -73.9680,
    priceLevel: '$',
  },
]

export async function fetchNearbyRestaurants(
  lat: number,
  lng: number,
  radius: number = 5000, // 5km default
  limit: number = 8
): Promise<Restaurant[]> {
  // TODO: Replace with actual Google Maps API call
  // For now, return mock restaurants shuffled
  try {
    const response = await fetch('/api/restaurants/nearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, radius, limit }),
    })

    if (!response.ok) {
      console.error('Failed to fetch restaurants')
      return getRandomRestaurants(limit)
    }

    const data = await response.json()
    const restaurants = data.restaurants || getRandomRestaurants(limit)
    console.log(`Fetched ${restaurants.length} restaurants (using mock data: ${data.usingMockData})`)
    return restaurants
  } catch (error) {
    console.error('Error fetching restaurants:', error)
    return getRandomRestaurants(limit)
  }
}

export function getRandomRestaurants(count: number = 8): Restaurant[] {
  const shuffled = [...MOCK_RESTAURANTS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export async function getUserLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => {
        resolve(null)
      }
    )
  })
}
