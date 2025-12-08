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
  priceLevel: number[] // [1, 2, 3, 4] for $, $$, $$$, $$$$
  cuisines: string[]
}

export interface Session {
  code: string
  createdAt: number
  status: 'pending' | 'active' | 'finished' | 'reconfiguring'
  hostId: string
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

// Auth types
export interface User {
  id: string
  email: string
  name?: string
  role: 'user' | 'admin'
  status: 'pending' | 'approved' | 'rejected'
  createdAt: number
  approvedAt?: number
  approvedBy?: string
  lastLoginAt?: number
}

export interface WaitlistEntry {
  id: string
  email: string
  createdAt: number
  status: 'pending' | 'invited' | 'converted'
  invitedAt?: number
  convertedAt?: number
}
