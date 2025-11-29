import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

// Create rate limiters for different endpoints
const rateLimiters = {
  // Session creation: 5 per minute (prevents spam session creation)
  createSession: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    prefix: 'ratelimit:create',
  }),
  // Voting: 30 per minute (allows quick swiping but prevents abuse)
  vote: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(30, '60 s'),
    prefix: 'ratelimit:vote',
  }),
  // General API: 120 per minute (for status checks, fetching session, etc.)
  general: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(120, '60 s'),
    prefix: 'ratelimit:general',
  }),
  // Restaurant search: 10 per minute (expensive Google API calls)
  restaurants: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    prefix: 'ratelimit:restaurants',
  }),
}

function getClientIP(request: NextRequest): string {
  // Try various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }

  // Fallback to a default (shouldn't happen on Vercel)
  return '127.0.0.1'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only rate limit API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Skip rate limiting in development if KV is not configured
  if (process.env.NODE_ENV === 'development' && !process.env.KV_REST_API_URL) {
    return NextResponse.next()
  }

  const ip = getClientIP(request)

  try {
    let limiter: Ratelimit
    let identifier: string

    // Choose rate limiter based on endpoint
    if (pathname === '/api/session/create') {
      limiter = rateLimiters.createSession
      identifier = `create:${ip}`
    } else if (pathname.includes('/vote') || pathname.includes('/close-voting')) {
      limiter = rateLimiters.vote
      identifier = `vote:${ip}`
    } else if (pathname === '/api/restaurants/nearby' || pathname === '/api/geocode') {
      limiter = rateLimiters.restaurants
      identifier = `restaurants:${ip}`
    } else {
      limiter = rateLimiters.general
      identifier = `general:${ip}`
    }

    const { success, limit, reset, remaining } = await limiter.limit(identifier)

    // Add rate limit headers to response
    const response = success
      ? NextResponse.next()
      : NextResponse.json(
          { error: 'Too many requests. Please slow down.' },
          { status: 429 }
        )

    response.headers.set('X-RateLimit-Limit', limit.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', reset.toString())

    return response
  } catch (error) {
    // If rate limiting fails (e.g., KV not available), allow the request
    // This prevents the app from breaking if KV has issues
    console.error('Rate limiting error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: '/api/:path*',
}
