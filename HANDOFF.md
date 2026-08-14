# Developer Handoff — Community Library Pivot

_Last updated: August 2026, on branch `community-library`_

This document is for the developer picking up the community-library pivot.
Read `CLAUDE.md` first for the product vision and tech stack; this file covers
**where the work actually stands, the traps, and what's left**.

---

## The pivot in one paragraph

Group Nom pivoted from "Google Places + group swiping" to a **positive-only
community library of loved places**. All restaurant data is now our own
(Overture Maps seed + community nominations in Neon Postgres). There are no
ratings and no reviews anywhere, by design — the only signals a place can
accumulate are nominations (photo + why-I-love-it), likes, and group-session
wins. Places that decline just quietly stop being surfaced. Group voting is
now a feature *within* the library, not the core product. Zero paid APIs
remain: Overture (free bulk), LocationIQ (free tier), Neon, Vercel KV/Blob.

## Branch state

- **`community-library`** is the active branch. Everything below happened here.
  Origin has it up to `1b876c1`; **commits after that are local-only** —
  the owner wanted to test before pushing. Check `git log origin/community-library..community-library`.
- **`main`** is pre-pivot (Google-based). Do not merge main forward without
  understanding the pivot removed Google entirely.
- **`map`** branch: a UI component library (`components/ui/`, 14 components),
  design tokens in `tailwind.config.ts`, Leaflet-style map views, and a
  location picker. Built pre-pivot against Google-era data. **Reconciling this
  is the biggest remaining task** (see below).
- **`architecture`** branch: the original pivot prototype. Everything valuable
  has been harvested (nomination layer, Overture importer, H3 utils,
  LocationIQ geocode). Treat as read-only history.
- `origin/claude/security-check-U4Z7A`: the Feb security audit
  (`SECURITY_AUDIT.md`). Its still-applicable findings were fixed in commit
  `2dfd8c4`; the deferred ones are listed below. Safe to delete the branch
  after skimming.

## Database (Neon Postgres)

The **live DB schema is the source of truth** — it matches the code on this
branch. Migrations under `scripts/db/` were applied manually via
`npx tsx scripts/run-sql-migration.ts scripts/db/00X-*.sql` (the Neon HTTP
driver runs one statement at a time; the runner handles `$$` bodies).

Applied to the live DB: 004 (nomination triggers, counts, views),
005 (Overture columns + H3 indexes), 006 (recreated
`restaurants_with_nominations` view — Postgres freezes `r.*` at CREATE VIEW,
so any future column additions to `restaurants` require re-running 006).

Data: **Florida is seeded** — ~96k restaurants from Overture release
`2026-07-22.0`, ~48MB. Strategy is **state-on-demand** (NOT nationwide — it
would blow the 512MB Neon free tier). To seed a state:

```bash
scripts/.venv/Scripts/python.exe scripts/import-overture.py \
  --release 2026-07-22.0 --states GA --bbox=-85.7,30.3,-80.7,35.1
```

~3 min/state. The `--bbox` matters — it enables parquet row-group pruning.
Check current release names at `s3://overturemaps-us-west-2/release/`.
The importer stamps `source='overture'` and is idempotent (upsert on gers_id).

Key invariant: **seeded-but-unnominated places feed voting decks but never
appear in the browsable library** (`/library` queries `nomination_count > 0`).
Everything a user sees in the library, someone loved.

## Environment traps (each of these burned us once)

1. **Redis env vars are `db1_`-prefixed** (`db1_KV_REST_API_URL`,
   `db1_KV_REST_API_TOKEN`) from the Upstash marketplace integration, host
   `saved-cat-153037.upstash.io`. They're marked *Sensitive* in Vercel, so
   `vercel env pull` returns `[SENSITIVE]` placeholders — copy real values
   from the Upstash console. `lib/kv.ts` accepts `db1_`/`DB1_`/legacy names;
   all KV access must go through it (never import `kv` from `@vercel/kv`
   directly). The `db1_` vars exist in Production+Preview only — Development
   scope was never added.
2. **Clerk keys are environment-scoped in Vercel**: `pk_live`/`sk_live` on
   Production+Preview (domain-locked to groupnom.com), `pk_test`/`sk_test` on
   Development. `vercel env pull .env.local` is now safe. If sign-in on
   localhost ever throws "Production Keys are only allowed for domain
   groupnom.com", someone put live keys back in Development.
3. **`vercel env rm <name> development` deletes the variable from ALL
   environments**, not just one. Copy values before touching env config.
4. `GOOGLE_MAPS_API_KEY`, `TRIPADVISOR_API_KEY`, `FOURSQUARE_API_KEY` in
   Vercel are dead — delete when convenient.
5. Session routes must **never fetch their own API over HTTP**
   (`request.nextUrl.origin` self-fetch fails on Windows dev with
   ECONNREFUSED and burns rate limits) — call `getDiscoveryDeck()` directly,
   as `session/create` and `reconfigure` now do.

## Code map (pivot-era files)

- `lib/restaurantDiscovery.ts` — the heart. `getDiscoveryDeck()` builds voting
  decks (H3 k-ring query, nominated places weighted ~10x, chain
  deprioritization, distance nudge). `getLibraryNearby()` powers `/library`
  (nominated-only). NOTE: tagged-template `sql` calls handle BigInt; the
  parameterized `sql.query()` path does NOT — pass H3 cells as strings with
  a `::bigint[]` cast.
- `lib/nominations.ts`, `lib/restaurantEnrichment.ts`, `lib/social.ts`,
  `lib/completeness.ts` — nomination CRUD, wiki-style facts, backers,
  completeness scoring. DB triggers maintain `nomination_count`.
- `app/library`, `app/restaurant/[id]`, `app/nominate/[restaurantId]` — the
  library surfaces. All dark-themed (`#222222` page / `#333333` cards /
  `#EA4D19` accent) to match the app's evolved style.
- `app/api/session/[code]/close-voting` — also records `group_win_count`
  for the winning restaurant(s) (ties share the win).
- `scripts/import-overture.py` + `scripts/requirements.txt` — seeder
  (venv at `scripts/.venv`, gitignored).

## What has NOT been human-tested

~~The full nomination loop~~ — done: the first real nomination (Voodoo Bayou,
Orlando, Aug 2026) exists in the DB and renders on the wall, the library list,
the library map popup, and the restaurant page.

## Product direction (decided Aug 13–14, 2026)

Full plan in the "Library Loop" Claude artifact and
`memory/product-direction.md`. The product is an **ad-free, community-built
list of the best local places**; joining means contributing. The experience
is a **membership ladder**:

**tease → join → contribute → belong**

1. **Tease** (signed out): marketing pages only, with teased aggregates
   ("23 places loved near Orlando" — counts, never names/photos/content).
2. **Join** (member, not yet nominated): a limited taste of their local
   area — **"Today's Five"**, a deterministic daily sample (seed = user +
   local date, same five across list, map, and Discover all day; random
   per-request would be scrapeable and make the map look broken). They CAN
   save to the try-list (saving is intent, not access) and CAN join group
   sessions with full decks (deliberate leak — sessions are the growth
   engine).
3. **Contribute**: the first published nomination unlocks the full library,
   forever. Derive "unlocked" from `nomination_count > 0` — no separate flag.
4. **Belong**: daily rhythm — drafts, follows, sessions.

### Nomination mechanics
- **One nomination per day**, resetting at the **user's local midnight**
  (capture tz from the browser at publish time). Server-enforced.
- **Drafts**: private nomination drafts, unlimited, one per user+restaurant.
  Publishing a draft counts as the day's nomination. IMPORTANT: don't upload
  draft photos to Blob at draft time — Vercel Blob URLs are public-if-known;
  defer photo upload to publish.
- **"Visit again first" is framing, not enforcement** (no geofencing/receipt
  verification — privacy). The nominate flow asks "when were you last
  there?": recent → proceed; been a while → "go support them again first"
  and save as a draft. Drafts double as the revisit queue. The daily limit
  pushes overflow into drafts → drafts + limit = the daily return loop
  ("your next nomination unlocks tomorrow"). Say it out loud in the UX.
- **Chains are soft-discouraged**, not blocked: the nominate search flags
  known chains ("Group Nom is for local spots — this one has ~500
  locations") using the existing chain-detection data, but lets a determined
  member proceed.
- Photo + why-I-love-it stay required. No ratings, no reviews, ever.

### Follows (anti-clout by design)
- Members can follow and be followed. Following delivers a home-feed section
  ("Alex T. nominated Voodoo Bayou yesterday") and access to shelves.
- **No follower/following counts or lists are ever displayed** — ranking
  people by influence is the same disease as star ratings. Blocking must
  exist (block = they can't follow you).

### Trust-weighted ranking (internal only)
- Wherever nominated places are ranked (library order, discovery decks,
  Today's Five sampling, shelves), weight = nomination count **and the
  quality of the nominating users**.
- User quality is an **internal score, never displayed**, mixing:
  **interaction** (engagement with the app), **nominations** (their
  nomination history/completeness), and **followers**. The follower input
  activates once follows ship; v1 of the score can run on the first two.

### Session deck sources
Host picks the deck source at setup:
- **Group favorites** — only available when starting from a saved Group
  (`/groups` roster): deck draws from that roster's nominations. (Decks are
  built at creation, before ad-hoc joiners exist — that's why this mode is
  roster-gated.)
- **Library only** — nominated places from anyone.
- **Mix** — current behavior: library + Overture seed, nominations weighted.

### Also decided
- Cold-start copy inversion: in an empty area the gate unlocks nothing, so
  onboarding pitches mission instead ("be the first — put your town on the
  map"). Choose the script by local library count; the teased-aggregate
  number tells you which. The empty-but-joined screen is the highest-stakes
  screen in the app — design it with care.
- Moderation floor before growth features: report action on nominations,
  admin remove (the `/admin` route exists, is empty), "report as closed"
  that quietly hides a place (positive-only compatible). Count triggers
  already handle deletes.
- Ladder metrics from day one: join → first-nomination conversion, draft
  publish rate, Today's Five open rate, follows per member, invites.

### Schema implications (new tables/columns)
`nomination_drafts` (user, gers_id, partial fields, no photo until publish),
`follows` (+ blocks), per-user tz or tz-at-publish for the daily limit,
internal trust-score storage (column or materialized), session metadata
`deckSource`.

### Build order
**Phase 0 structural ✅ complete** (member gates; First L. attribution;
sessions require sign-in — session identity is the Clerk userId end to end,
host checks via `auth()`, GET returns per-requester `isHost`). NOTE: the
signed-in session flow was verified by build + signed-out gate checks only —
needs one human run-through (create → invite/join → vote → close → results).

1. **The nomination system**: search-first nominate ("Nominate a spot" →
   name search over seeded DB → confirm → photo/why) + add-a-place fallback;
   recency question; drafts; one-per-day at local midnight; chain
   soft-discourage; unlock-by-first-nomination.
2. **The gate + Today's Five**: limited list/map/discover for
   non-nominators; deterministic daily sample; onboarding both variants
   (nominate-or-plan-a-visit, mission copy for empty areas); moderation
   floor lands here too.
3. **Follows + member shelves + home feed** (profiles with First L., shelf,
   follow button; no counts anywhere).
4. **Trust-weighted ranking** (all three score inputs now available; apply
   to all surfacing).
5. **Session deck sources** (group favorites / library only / mix).
6. **Situational shelves** (good-for tags, dish shelves; seeded backfill
   clearly separated) **+ OG-image sharing**.

Parallel any time: marketing rewrite (hero = ad-free community library of
loved local places; group voting is the second act; stale rating/price copy
dies).

## Remaining work, in rough priority order

1. **`map` branch reconciliation** — mostly done (Aug 2026). Decision: dark
   library everywhere; sunset gradient survives only as the voting-session
   "game mode". Landed: design tokens in `tailwind.config.ts` (never hard-code
   `#222222`/`#333333`/`#EA4D19` again — use `surface-page`/`surface-card`/
   `brand`), dark-first UI kit in `components/ui/` (see its README for a11y
   rules), permission-aware location flow (`lib/useLocation.ts` +
   `components/location/`), and the Leaflet map view (`components/map/`,
   CARTO dark tiles) with a list/map toggle on `/library`. Import map pieces
   via the `components/map` barrel only — it exports just the SSR-safe
   entries; importing `RestaurantMap`/`RestaurantMarker` directly outside a
   `ssr:false` dynamic breaks prerendering. Also landed: results decomposed
   into `components/results/` (sunset skin, positive-only, focus rings) and
   the dedicated geocode rate limiter in middleware. Still unharvested from
   the `map` branch: `RestaurantDetailSheet` (pairs with BottomSheet for
   map-browse previews), and the rest of the session-flow restyle onto kit
   variants (setup/voting screens still use raw sunset classes;
   `RestaurantFilters` carries the components-defined-during-render lint
   debt).
2. **Deferred security items** (from `SECURITY_AUDIT.md`):
   - ~~Host authorization / hostId exposure~~ — fixed Aug 2026: sessions
     require sign-in, host actions verify `auth()` server-side, and the
     session GET returns `isHost` instead of the raw hostId.
   - Group invite codes are reversible base64 of the group id
     (`lib/groups.ts`) — replace with random codes stored in the DB.
   - Session state transitions aren't atomic (check-then-act races on KV).
   - No CSP header yet (needs Clerk + blob domain allowances).
3. **Tech debt visible in lint** (33 warnings, `npm run lint`): components
   defined during render in `RestaurantFilters`/`ResultsPage` (identity
   changes every render), setState-in-effect patterns, `<img>` vs
   `next/image`. Fix when touching those files.
4. **Session flow styling** (setup/voting/results) still uses the orange
   gradient + white cards — internally consistent, but decide its fate with
   the design system.
5. **Product/copy pass**: the owner has ideas about how the community change
   is *communicated* (landing copy, about page, framing) — deliberately
   deferred until the build settles. `components/landing/Features.tsx` still
   mentions rating/price filters that no longer exist.
6. Types still carry dead Google-era fields (`Restaurant.rating`,
   `reviewCount`, `priceLevel`, `Filters.minRating` etc.) kept for KV-stored
   session compatibility — safe to strip once old sessions expire (24h TTL).

## Development

```bash
npm run dev      # dev server (needs .env.local — see traps above)
npm run build    # includes typecheck; scripts/ is excluded from tsconfig
npm run lint     # eslint 9 flat config (eslint.config.mjs)
```

`.env.local` needs: Clerk test keys, `DATABASE_URL`, `db1_KV_REST_API_URL` +
`db1_KV_REST_API_TOKEN`, `LOCATIONIQ_API_KEY`, `BLOB_READ_WRITE_TOKEN`.
