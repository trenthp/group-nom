/**
 * User tier configuration for Group Nom
 * Defines limits and features for anonymous vs authenticated users
 */

export const USER_TIERS = {
  anonymous: {
    maxRestaurantsPerSession: 5,
    maxSessionsPerDay: 3,
    features: {
      discovery: false,
      saveFavorites: false,
      pickFromFavorites: false,
    },
    rateLimits: {
      createSession: { requests: 3, windowSeconds: 86400 }, // 3 per day
      vote: { requests: 30, windowSeconds: 60 },
      restaurants: { requests: 5, windowSeconds: 60 },
      geocode: { requests: 10, windowSeconds: 60 },
      general: { requests: 60, windowSeconds: 60 },
    },
  },
  authenticated: {
    maxRestaurantsPerSession: 10,
    maxSessionsPerDay: 10,
    features: {
      discovery: true,
      saveFavorites: true,
      pickFromFavorites: true,
    },
    rateLimits: {
      createSession: { requests: 10, windowSeconds: 86400 }, // 10 per day
      vote: { requests: 60, windowSeconds: 60 },
      restaurants: { requests: 20, windowSeconds: 60 },
      geocode: { requests: 20, windowSeconds: 60 },
      general: { requests: 120, windowSeconds: 60 },
    },
  },
} as const

export type UserTier = keyof typeof USER_TIERS
export type TierConfig = (typeof USER_TIERS)[UserTier]

/**
 * Get the user tier based on authentication status
 */
export function getUserTier(isAuthenticated: boolean): UserTier {
  return isAuthenticated ? 'authenticated' : 'anonymous'
}

/**
 * Get the restaurant limit for a user based on authentication status
 */
export function getRestaurantLimit(isAuthenticated: boolean): number {
  return USER_TIERS[getUserTier(isAuthenticated)].maxRestaurantsPerSession
}

/**
 * Get the session creation limit for a user based on authentication status
 */
export function getSessionLimit(isAuthenticated: boolean): number {
  return USER_TIERS[getUserTier(isAuthenticated)].maxSessionsPerDay
}

/**
 * Check if a feature is available for a user tier
 */
export function hasFeature(
  isAuthenticated: boolean,
  feature: keyof TierConfig['features']
): boolean {
  return USER_TIERS[getUserTier(isAuthenticated)].features[feature]
}

/**
 * Get rate limit config for a specific endpoint and tier
 */
export function getRateLimitConfig(
  isAuthenticated: boolean,
  endpoint: keyof TierConfig['rateLimits']
) {
  return USER_TIERS[getUserTier(isAuthenticated)].rateLimits[endpoint]
}
