# Security Audit Report - Group Nom

**Date:** 2026-02-22
**Scope:** Full repository security review

---

## Executive Summary

This audit reviewed the Group Nom codebase for security vulnerabilities across secrets management, dependency vulnerabilities, API endpoint security, authentication/authorization, session management, rate limiting, and client-side attack vectors. The application has solid foundational security practices but contains several issues that should be addressed before production deployment.

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 1 | Missing input validation on reconfigure endpoint |
| **HIGH** | 4 | SSRF in internal API calls, insecure invite codes, race conditions in voting, dependency vulnerabilities |
| **MEDIUM** | 10 | Rate limit bypass, missing security headers, error information disclosure, authorization gaps |
| **LOW** | 4 | Minor hardening opportunities |

---

## 1. Secrets & Credentials

**Status: PASS**

- No hardcoded secrets found in source code
- `.gitignore` properly excludes `.env*.local` and `/.clerk/`
- All credentials accessed via `process.env`
- `.env.local.example` contains only placeholder values
- No secrets detected in git history

---

## 2. Dependency Vulnerabilities

**Status: FAIL - 17 vulnerabilities (1 moderate, 16 high)**

Run `npm audit` for full details. Key issues:

| Package | Severity | Issue |
|---------|----------|-------|
| `next` 15.6.0-16.1.4 | **HIGH** | DoS via Image Optimizer, HTTP deserialization DoS, unbounded memory via PPR endpoint |
| `axios` 1.0.0-1.13.4 | **HIGH** | DoS via `__proto__` key in mergeConfig |
| `minimatch` <10.2.1 | **HIGH** | ReDoS via repeated wildcards (affects eslint chain) |
| `ajv` <6.14.0 | MODERATE | ReDoS when using `$data` option |

**Fix:** Run `npm audit fix` to resolve most issues. The eslint chain requires `npm audit fix --force` (breaking change to eslint@10).

---

## 3. API Endpoint Vulnerabilities

### 3.1 CRITICAL - Missing Zod Validation on Reconfigure Endpoint

**File:** `app/api/session/[code]/reconfigure/route.ts:10-17`

```typescript
const { userId, filters, location } = await request.json()
if (!userId || !filters || !location) { ... }
```

Raw destructuring without schema validation. A `reconfigureSessionSchema` exists in `lib/validation.ts` but is not used here. Malformed `filters` or `location` objects pass through unchecked.

**Fix:** Apply `reconfigureSessionSchema.parse()` to the request body.

### 3.2 HIGH - SSRF via `request.nextUrl.origin`

**Files:**
- `app/api/session/create/route.ts:63-76`
- `app/api/session/[code]/reconfigure/route.ts:37-50`

Both endpoints construct internal API URLs using `request.nextUrl.origin`:

```typescript
const response = await fetch(`${request.nextUrl.origin}/api/restaurants/nearby`, { ... })
```

If `Host` or `X-Forwarded-Host` headers are manipulated, this could redirect the server-side fetch to an attacker-controlled server, leaking the request body (including location data and filters).

**Fix:** Call the restaurant search logic directly instead of making an HTTP request to self, or use a hardcoded internal URL.

### 3.3 HIGH - Race Condition in Voting Completion

**File:** `app/api/session/[code]/vote/route.ts:41-47`

```typescript
const allFinished = await sessionStore.allUsersFinished(code)
if (allFinished) {
  await sessionStore.finishSession(code)
}
```

Classic check-then-act race: if two users finish voting simultaneously, both see `allFinished === true` and both call `finishSession()`. While the double-finish may be idempotent, it indicates a broader pattern where session state transitions aren't atomic.

**Fix:** Use a Redis transaction (MULTI/EXEC) or atomic compare-and-swap for state transitions.

### 3.4 MEDIUM - Race Condition in User Addition

**File:** `lib/sessionStore.ts:52-60`

```typescript
const session = await sessionStore.getSession(code)
if (!session.users.includes(userId)) {
  session.users.push(userId)
  await sessionStore.updateSession(code, session)
}
```

Two concurrent join requests could both read the session, both see the user missing, and both add the user - resulting in duplicate entries.

### 3.5 MEDIUM - Inconsistent Input Validation

Several endpoints use manual type checking instead of Zod schemas:

- `app/api/groups/route.ts:54-66` - Manual string checks for group name
- `app/api/groups/[id]/route.ts:71-84` - Manual validation on PUT
- `app/api/groups/join/route.ts:20-26` - Manual invite code validation
- `app/api/user/profile/route.ts:76-94` - No URL format validation on `avatarUrl`
- `app/api/places/photo/route.ts:6` - `maxwidth` param not validated as numeric

### 3.6 MEDIUM - Error Information Disclosure

**File:** `app/api/feedback/route.ts:54-60`

Debug code queries database schema info and logs it:

```typescript
const dbInfo = await sql`SELECT current_database(), current_schema()`
```

While logged server-side, this is unnecessary production code.

**File:** `app/api/restaurants/like/route.ts:76-85`

Returns raw `error.message` to clients, which may contain internal details.

**File:** `app/api/groups/route.ts:24-32`

Error response reveals database implementation ("relation does not exist").

---

## 4. Authentication & Authorization

### 4.1 HIGH - Insecure Group Invite Code Generation

**File:** `lib/groups.ts:249-251`

```typescript
export function generateInviteCode(groupId: string): string {
  return Buffer.from(groupId).toString('base64url')
}
```

Invite codes are just base64-encoded group IDs - trivially reversible. Anyone can decode an invite code to get the group ID, or encode a known group ID to get its invite code.

**Fix:** Generate cryptographically random invite codes and store the mapping in the database.

### 4.2 MEDIUM - No Authorization on Session Join

**File:** `app/api/session/[code]/route.ts:22-26`

Any user with a session code can join and vote. While this is by design (codes are shared), there's no mechanism to:
- Limit the number of participants
- Restrict joining to specific users or groups
- Prevent brute-force code guessing (6-char alphanumeric = ~1B combinations, but no per-attempt rate limiting on join)

### 4.3 LOW - Admin Route Protection

**File:** `middleware.ts:148-150`

Admin routes use `auth.protect()` which only requires authentication, not a specific role. Any authenticated user can access `/admin/*`.

---

## 5. Rate Limiting

### 5.1 MEDIUM - IP Spoofing Bypass

**File:** `middleware.ts:58-70`

```typescript
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  ...
}
```

`X-Forwarded-For` can be spoofed by clients unless stripped by a trusted proxy. Anonymous rate limits can be bypassed by rotating this header value.

**Fix:** If deployed behind Vercel's edge network, use Vercel's IP detection. Otherwise, validate against trusted proxy IPs.

### 5.2 LOW - Rate Limiting Disabled in Development

**File:** `middleware.ts:83-84`

Rate limiting is skipped entirely when `KV_REST_API_URL` is not set. Acceptable for local development but should be noted.

---

## 6. Missing Security Headers

**Status: FAIL**

**File:** `next.config.js`

The Next.js config has no security headers configured. The following headers should be added:

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Content-Security-Policy` | Appropriate policy | Prevent XSS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer info |
| `Permissions-Policy` | Appropriate policy | Control browser features |

**Fix:** Add a `headers()` function to `next.config.js`.

---

## 7. Client-Side Security

**Status: PASS (with notes)**

- No `dangerouslySetInnerHTML` usage found
- No `innerHTML` / `outerHTML` manipulation
- No `eval()` or `Function()` usage
- React's built-in XSS protection via JSX escaping is intact
- Clerk handles authentication tokens securely

---

## 8. Google Maps API Key Exposure

### 8.1 MEDIUM - API Key in URL

**File:** `app/api/places/photo/route.ts:23`

```typescript
const googleUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${ref}&key=${apiKey}`
```

The API key is included in URLs sent to Google. If request logs or intermediary proxies cache URLs, the key could leak.

**Fix:** Ensure the Google Maps API key is restricted to specific APIs and referrer domains in the Google Cloud Console.

---

## Priority Remediation Plan

### Immediate (before production)
1. Add Zod validation to reconfigure endpoint
2. Fix SSRF by calling restaurant search logic directly instead of via HTTP
3. Run `npm audit fix` to patch dependency vulnerabilities
4. Replace base64 invite codes with cryptographically random codes

### Short-term
5. Add security headers to `next.config.js`
6. Make session state transitions atomic (Redis transactions)
7. Standardize input validation across all API endpoints using Zod
8. Remove debug code from feedback endpoint
9. Return generic error messages instead of `error.message`

### Medium-term
10. Fix IP-based rate limiting to use trusted proxy headers
11. Add participant limits to sessions
12. Restrict Google Maps API key in Cloud Console
13. Add role-based access control for admin routes
