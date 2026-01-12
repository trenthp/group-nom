# Group Nom - Project Context

## What This Is
A local restaurant discovery platform where **locals nominate and vouch for their favorite spots**, building community-curated data on top of Overture base restaurant data. Like Waze for restaurants - users contribute to help others find great local places.

## Core Product Philosophy
- **Local-first**: Not chains, not tourists - real locals sharing real spots
- **Groups are made of individuals**: Someone discovers Group Nom via a friend using it for group decisions → they create account → swipe for their own local finds → their favorites feed into future group sessions
- **Contributing = Belonging**: Being a Group Nom user means you're adding to the local nom locations; you're part of a larger group helping others

## Current State (January 2026)

### Implemented Features
- **Group Voting Flow**: Create session → Share code → Swipe restaurants → Find matches
- **Nomination Layer**: Users can nominate restaurants with photo + "why I love it"
- **Progressive Enrichment**: Add favorite dishes, "good for" tags after initial nomination
- **Factual Data Layer**: Wiki-style hours notes, menu URLs, parking tips
- **Completeness Indicators**: Visual progress showing what data still needs to be filled in
- **Food Method Voting**: After match, host decides dine-in/pickup/delivery with group input
- **User Profiles**: Clerk auth integrated with user stats tracking
- **Favorites System**: Save restaurants from discovery or group voting

### Architecture
- **Neon Postgres** database with H3 spatial indexing
- **Overture Maps** data (local restaurant database, no Google Maps API costs)
- **TripAdvisor** integration for photos/price (lazy-linked)
- **Vercel Blob** for nomination photo uploads
- **Restaurant selection algorithm** with pick_rate + nomination boost scoring
- Chain detection and filtering
- Greater Orlando area focus

### Key Files
**Database & Data Layer:**
- `lib/db.ts` - Neon serverless Postgres client
- `lib/restaurantRepository.ts` - Restaurant data access
- `lib/restaurantSelection.ts` - Selection algorithm with nomination boost
- `lib/tripadvisor.ts` - Photo/price enrichment
- `lib/h3.ts` - Geospatial indexing
- `scripts/db/schema.sql` - Base database schema
- `scripts/db/001-nomination-layer.sql` - Nomination layer migration

**Nomination System:**
- `lib/nominations.ts` - Nomination CRUD operations
- `lib/restaurantEnrichment.ts` - Factual data (hours, menu, parking)
- `lib/completeness.ts` - Completeness scoring
- `lib/userProfile.ts` - User profile management
- `lib/favorites.ts` - Favorites system
- `lib/social.ts` - Co-nominators, backers

**API Routes:**
- `/api/nominations/*` - Create, update, delete nominations
- `/api/enrichment/*` - Restaurant factual data
- `/api/favorites/*` - User favorites
- `/api/user/*` - Profile, stats, backers
- `/api/upload/nomination-photo` - Photo uploads
- `/api/session/[code]/food-method` - Food method voting

**UI Components:**
- `components/nomination/` - QuickCaptureForm, EnrichmentForm, NominationBadge, CoNominators
- `components/restaurant/` - CompletenessBar, FactualDataForm
- `components/results/` - FoodMethodVote, HostFoodMethodPanel
- `app/nominate/[restaurantId]/page.tsx` - Nomination flow page

## User Flows

1. **Group Voting** (Anonymous OK): Join via code → Swipe restaurants → Match found → Host picks food method
2. **Individual Discovery** (Auth Required): Sign in → Swipe restaurants → Like adds to favorites → Prompt to nominate
3. **Nomination** (Auth Required): Photo upload → "Why I love it" → Optional: favorite dishes, good-for tags
4. **Enrichment** (Auth Required): Add hours notes, menu URL, parking tips to any restaurant

## Data Model

### Personal Data (per-user nominations)
- Photo URL, "why I love it", favorite dishes, good-for tags
- Tied to user's identity, shown with attribution

### Factual Data (wiki-style, shared)
- Hours notes, menu URL, parking notes
- Anyone can update, most recent wins
- No complex conflict resolution yet

## Environment Variables Required
```
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Vercel KV (sessions/rate limiting)
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Neon Database
DATABASE_URL=

# TripAdvisor (photos)
TRIPADVISOR_API_KEY=

# Vercel Blob (photo uploads)
BLOB_READ_WRITE_TOKEN=
```

## Target Market
- **Geographic**: Greater Orlando area (Orlando, Winter Park, Lake Mary, Kissimmee)
- **Users**: Locals who want to discover and share neighborhood gems

## Tech Stack
- Next.js 16 + React 19 + TypeScript
- Neon Postgres (serverless)
- Vercel KV (sessions/rate limiting)
- Vercel Blob (photo storage)
- Clerk (authentication)
- TripAdvisor API (photos/enrichment)
- H3 (geospatial indexing)
- Tailwind CSS (styling)

## Next Steps / TODO
- [ ] Test full nomination flow end-to-end
- [ ] Add client-side image compression before upload
- [ ] Content moderation for photos/text
- [ ] Individual discovery swipe interface
- [ ] Seed initial nominations for cold start
- [ ] ToS, Privacy Policy, FTC disclosure for affiliate links
