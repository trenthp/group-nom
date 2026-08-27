import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { kv, isKvConfigured } from '@/lib/kv'

// Define route matchers
const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])
// Clerk → us. Authenticated by Svix signature inside the handler, not by a
// session, and never rate limited (a dropped webhook = a stale profile).
const isWebhookRoute = createRouteMatcher(['/api/webhooks(.*)'])

// The library is the product's core asset — members only (Aug 2026 decision).
// Signed-out visitors get teased aggregates on the marketing pages, never content.
const isMemberRoute = createRouteMatcher([
  '/library(.*)',
  '/restaurant(.*)',
  '/nominate(.*)',
  '/discover(.*)',
  '/saved(.*)',
  '/member(.*)',
  // Sessions require sign-in too (Aug 2026) — invite links redirect through
  // sign-in and land back on the session page.
  '/setup(.*)',
  '/session(.*)',
])
const isMemberApiRoute = createRouteMatcher([
  '/api/library(.*)',
  '/api/nominations(.*)',
  '/api/enrichment(.*)',
  '/api/restaurants(.*)',
  '/api/session(.*)',
  '/api/members(.*)',
])

// Create tiered rate limiters: stricter for anonymous, generous for authenticated
const anonRateLimiters = {
  createSession: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(3, '86400 s'), // 3 per day
    prefix: 'ratelimit:anon:create',
  }),
  vote: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(30, '60 s'),
    prefix: 'ratelimit:anon:vote',
  }),
  general: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(60, '60 s'),
    prefix: 'ratelimit:anon:general',
  }),
  restaurants: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    prefix: 'ratelimit:anon:restaurants',
  }),
  upload: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, '3600 s'), // uploads require auth; anon gets a token bucket anyway
    prefix: 'ratelimit:anon:upload',
  }),
  geocode: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(20, '60 s'), // location lookups are chattier than search
    prefix: 'ratelimit:anon:geocode',
  }),
}

const authRateLimiters = {
  createSession: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(10, '86400 s'), // 10 per day
    prefix: 'ratelimit:auth:create',
  }),
  vote: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(60, '60 s'),
    prefix: 'ratelimit:auth:vote',
  }),
  general: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(120, '60 s'),
    prefix: 'ratelimit:auth:general',
  }),
  restaurants: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(20, '60 s'),
    prefix: 'ratelimit:auth:restaurants',
  }),
  upload: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(30, '3600 s'), // 30 photo uploads per hour
    prefix: 'ratelimit:auth:upload',
  }),
  geocode: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(30, '60 s'),
    prefix: 'ratelimit:auth:geocode',
  }),
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }

  return '127.0.0.1'
}

async function handleRateLimit(
  request: NextRequest,
  userId: string | null
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/api/')) {
    return null
  }

  // Skip rate limiting in development if KV is not configured
  if (process.env.NODE_ENV === 'development' && !isKvConfigured()) {
    return null
  }

  // Use userId for authenticated users (more accurate), IP for anonymous
  const ip = getClientIP(request)
  const baseIdentifier = userId || ip
  const isAuthenticated = !!userId

  // Select appropriate tier of rate limiters
  const rateLimiters = isAuthenticated ? authRateLimiters : anonRateLimiters

  try {
    let limiter: Ratelimit
    let identifier: string

    if (pathname === '/api/session/create') {
      limiter = rateLimiters.createSession
      identifier = `create:${baseIdentifier}`
    } else if (pathname.includes('/vote') || pathname.includes('/close-voting')) {
      limiter = rateLimiters.vote
      identifier = `vote:${baseIdentifier}`
    } else if (pathname.startsWith('/api/upload/')) {
      limiter = rateLimiters.upload
      identifier = `upload:${baseIdentifier}`
    } else if (pathname === '/api/restaurants/nearby' || pathname === '/api/restaurants/search') {
      limiter = rateLimiters.restaurants
      identifier = `restaurants:${baseIdentifier}`
    } else if (pathname === '/api/geocode') {
      limiter = rateLimiters.geocode
      identifier = `geocode:${baseIdentifier}`
    } else {
      limiter = rateLimiters.general
      identifier = `general:${baseIdentifier}`
    }

    const { success, limit, reset, remaining } = await limiter.limit(identifier)

    if (!success) {
      const tierMessage = isAuthenticated
        ? 'Too many requests. Please slow down.'
        : 'Too many requests. Sign in for higher limits.'
      const response = NextResponse.json({ error: tierMessage }, { status: 429 })
      response.headers.set('X-RateLimit-Limit', limit.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', reset.toString())
      return response
    }
  } catch (error) {
    console.error('Rate limiting error:', error)
  }

  return null
}

export default clerkMiddleware(async (auth, request) => {
  if (isWebhookRoute(request)) {
    return NextResponse.next()
  }

  // Get auth status first for tiered rate limiting
  const { userId } = await auth()

  // Handle rate limiting for API routes (uses auth status for tier selection)
  const rateLimitResponse = await handleRateLimit(request, userId)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Redirect signed-in users away from auth pages to home
  if (userId && isAuthRoute(request)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Member-only APIs return JSON 401 (a redirect would confuse fetch callers)
  if (!userId && isMemberApiRoute(request)) {
    return NextResponse.json(
      { error: 'Sign in to browse the library' },
      { status: 401 }
    )
  }

  // Member-only pages redirect to sign-in and back
  if (isMemberRoute(request)) {
    await auth.protect()
  }

  // Protect /admin/* routes - require sign in
  if (isAdminRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
