// ==============================================
// GOOGLE PLACES TYPES (Discovery Layer)
// ==============================================

export interface Restaurant {
  id: string // Google place_id
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
  // Local database enrichment (added after matching)
  localId?: string // Our gers_id if matched
  likeCount?: number // Community likes
  pickRate?: number // Group vote win rate
  nominationCount?: number // Times nominated
}

// ==============================================
// LOCAL DATABASE TYPES (Data Ownership Layer)
// ==============================================

export interface LocalRestaurant {
  gersId: string // Primary key (Overture ID or 'gpl_' + place_id)
  name: string
  address: string | null
  city: string | null
  state: string | null
  lat: number
  lng: number
  categories: string[]
  source: 'overture' | 'google'
  // Community signals
  likeCount: number
  nominationCount: number
  groupWinCount: number
  createdAt: Date
  updatedAt: Date
}

export interface RestaurantMapping {
  googlePlaceId: string
  localId: string
  source: 'overture' | 'google'
  timesShown: number
  timesPicked: number
  pickRate: number | null // null if timesShown < 5
  createdAt: Date
}

// ==============================================
// SCORING TYPES (Selection Algorithm)
// ==============================================

export interface ScoredRestaurant extends Restaurant {
  score: number
  scores: {
    pickRate: number // 25% - historical group vote performance
    discovery: number // 20% - favor less-shown restaurants
    nominationBoost: number // 20% - boost from user likes
    random: number // 20% - variety
    distance: number // 15% - proximity
  }
}

export interface SelectionFilters extends Filters {
  chainSizeLimit?: number // 1-5, where 5 = allow all chains
}

// ==============================================
// CHAIN DETECTION
// ==============================================

export interface ChainInfo {
  name: string
  locationCount: number
  isChain: boolean // true if locationCount >= 5
  firstSeen: Date
  lastUpdated: Date
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
  preferLocal: boolean // true = prioritize local restaurants over chains
}

// Default filter values
export const DEFAULT_FILTERS: Filters = {
  minRating: 0,
  openNow: false,
  maxReviews: 0,
  distance: 5,
  priceLevel: [],
  cuisines: [],
  preferLocal: true, // Default to preferring local restaurants
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
  metadata?: SessionMetadata
}

export interface AggregatedVote {
  restaurantId: string
  restaurant: Restaurant
  yesCount: number
  noCount: number
  totalVotes: number
  userIds: { [userId: string]: boolean } // userId -> liked
}

// ==============================================
// USER TIER TYPES
// ==============================================

export type UserTier = 'anonymous' | 'authenticated'

export interface SessionMetadata {
  creatorTier: UserTier
  creatorClerkId: string | null
  restaurantLimit: number
  createdAt: number
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
