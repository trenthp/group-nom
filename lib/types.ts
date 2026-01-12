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
  excludeChains?: boolean // Filter out chain restaurants (50+ locations nationwide)
}

export type FoodMethod = 'dine_in' | 'pickup' | 'delivery'

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
  // Food method voting (after restaurant match)
  foodMethodVotes?: Record<string, FoodMethod>
  foodMethodResult?: FoodMethod  // Host's final choice
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

// ============================================================================
// NOMINATION LAYER TYPES
// ============================================================================

export interface UserProfile {
  clerkUserId: string
  email: string
  displayName?: string
  avatarUrl?: string
  defaultLat: number
  defaultLng: number
  defaultCity: string
  nominationCount: number
  enrichmentCount: number
  createdAt: Date
  updatedAt: Date
}

export interface Nomination {
  id: string
  gersId: string
  clerkUserId: string
  photoUrl: string
  whyILoveIt: string
  myFavoriteDishes: string[]
  goodFor: GoodForTag[]
  createdAt: Date
  // Joined data (optional, populated when fetching)
  user?: {
    displayName?: string
    avatarUrl?: string
  }
}

export type GoodForTag = 'date_night' | 'family' | 'groups' | 'solo' | 'quick_bite' | 'late_night' | 'brunch'

export interface RestaurantEnrichment {
  gersId: string
  hoursNotes?: string
  hoursUpdatedAt?: Date
  menuUrl?: string
  menuUpdatedAt?: Date
  parkingNotes?: string
  parkingUpdatedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface NominationCompleteness {
  hasNominations: boolean
  nominationCount: number
  hasHours: boolean
  hasMenu: boolean
  hasParking: boolean
  hasFavoriteDishes: boolean
  completenessScore: number  // 0-100
  missingFields: string[]
}

export type FavoriteSource = 'discover' | 'group_vote' | 'nomination'

export interface UserFavorite {
  id: string
  clerkUserId: string
  gersId: string
  source: FavoriteSource
  createdAt: Date
  // Joined data (optional)
  restaurant?: Restaurant
}

export type SwipeAction = 'like' | 'dislike' | 'skip'

export interface SwipeHistoryEntry {
  id: string
  clerkUserId: string
  gersId: string
  action: SwipeAction
  swipedAt: Date
}

export interface UserStats {
  nominations: number
  enrichments: number
  favorites: number
  backers: number  // Others who also nominated your spots
}

// Extended restaurant type with nomination data
export interface RestaurantWithNominations extends Restaurant {
  nominationCount: number
  firstNominatedAt?: Date
  completenessScore: number
  enrichment?: RestaurantEnrichment
  nominations?: Nomination[]
}
