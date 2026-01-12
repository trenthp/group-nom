import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

// Define route matchers
const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])
const isProtectedRoute = createRouteMatcher([
  '/discover(.*)',
  '/nominate(.*)',
  '/favorites(.*)',
  '/profile(.*)',
])
const isProtectedApiRoute = createRouteMatcher([
  '/api/user(.*)',
  '/api/nominations(.*)',
  '/api/enrichment(.*)',
  '/api/favorites(.*)',
  '/api/swipes(.*)',
  '/api/upload(.*)',
])

// Create rate limiters for different endpoints
const rateLimiters = {
  createSession: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    prefix: 'ratelimit:create',
  }),
  vote: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(30, '60 s'),
    prefix: 'ratelimit:vote',
  }),
  general: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(120, '60 s'),
    prefix: 'ratelimit:general',
  }),
  restaurants: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    prefix: 'ratelimit:restaurants',
  }),
  upload: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    prefix: 'ratelimit:upload',
  }),
  nominations: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(20, '60 s'),
    prefix: 'ratelimit:nominations',
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

async function handleRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/api/')) {
    return null
  }

  // Skip rate limiting in development if KV is not configured
  if (process.env.NODE_ENV === 'development' && !process.env.KV_REST_API_URL) {
    return null
  }

  const ip = getClientIP(request)

  try {
    let limiter: Ratelimit
    let identifier: string

    if (pathname === '/api/session/create') {
      limiter = rateLimiters.createSession
      identifier = `create:${ip}`
    } else if (pathname.includes('/vote') || pathname.includes('/close-voting')) {
      limiter = rateLimiters.vote
      identifier = `vote:${ip}`
    } else if (pathname === '/api/geocode') {
      limiter = rateLimiters.restaurants
      identifier = `restaurants:${ip}`
    } else if (pathname.startsWith('/api/upload')) {
      limiter = rateLimiters.upload
      identifier = `upload:${ip}`
    } else if (pathname.startsWith('/api/nominations')) {
      limiter = rateLimiters.nominations
      identifier = `nominations:${ip}`
    } else {
      limiter = rateLimiters.general
      identifier = `general:${ip}`
    }

    const { success, limit, reset, remaining } = await limiter.limit(identifier)

    if (!success) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      )
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
  // Handle rate limiting for API routes
  const rateLimitResponse = await handleRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const { userId } = await auth()

  // Redirect signed-in users away from auth pages to home
  if (userId && isAuthRoute(request)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Protect /admin/* routes - require sign in
  if (isAdminRoute(request)) {
    await auth.protect()
  }

  // Protect user-specific routes and APIs
  if (isProtectedRoute(request) || isProtectedApiRoute(request)) {
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
