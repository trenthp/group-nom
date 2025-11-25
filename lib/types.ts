export interface Restaurant {
  id: string
  name: string
  address: string
  rating: number
  reviewCount: number
  cuisines: string[]
  imageUrl?: string
  lat: number
  lng: number
  priceLevel?: string
  phone?: string
  website?: string
}

export interface Vote {
  userId: string
  restaurantId: string
  liked: boolean
}

export interface Filters {
  minRating: number
  openNow: boolean
  maxReviews: number
  distance: number
}

export interface Session {
  code: string
  createdAt: number
  status: 'pending' | 'active' | 'finished'
  users: string[]
  votes: Vote[]
  finished: boolean
  filters?: Filters
  restaurants: Restaurant[]
  location?: { lat: number; lng: number }
}

export interface AggregatedVote {
  restaurantId: string
  restaurant: Restaurant
  yesCount: number
  noCount: number
  totalVotes: number
  userIds: { [userId: string]: boolean } // userId -> liked
}
