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

## Product direction (decided Aug 13, 2026)

The pivot's UX architecture is settled — see the "Library Loop" plan (Claude
artifact) and `memory/product-direction.md`. Short version: the library is
**members-only** (signed-out visitors get teased aggregates, never content);
anonymous sessions are being **killed** (which also retires the host-auth
security finding — host checks move server-side via Clerk `auth()`);
attribution is **first name + last initial** on all community surfaces;
"Saved" becomes the **try-list** in the core loop discover → try-list →
visit → nominate → library. Build order: Phase 0 structural (member gates ✅,
attribution ✅, sessions-require-auth ⏳) → search-first nominate + add-a-place
→ try-list + visit prompts → good-for/dish shelves → member shelves + OG
sharing. Marketing rewrite can run parallel any time after Phase 0.

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
2. **Deferred security items** (from `SECURITY_AUDIT.md`, all need design):
   - Host authorization trusts client-supplied `userId`; `hostId` is exposed
     to all session members via GET. Anonymous hosts have no Clerk identity,
     so the fix is treating hostId as a secret (return a per-requester
     `isHost` flag instead of the raw id).
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
