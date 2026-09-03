// Content-Security-Policy (security audit item). Allowances, and why:
//   script/connect  Clerk (dev *.clerk.accounts.dev, prod clerk.groupnom.com)
//                   + Cloudflare Turnstile (Clerk bot protection)
//   img             Vercel Blob (nomination photos), Clerk avatars,
//                   CARTO dark map tiles
//   style/font      Google Fonts (Alan Sans / Albert Sans in layout.tsx)
//   worker blob:    Clerk runs a web worker from a blob URL
// 'unsafe-inline'/'unsafe-eval' in script-src are required by Next.js dev
// and Clerk today; tightening to nonces is a later pass.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.groupnom.com https://challenges.cloudflare.com",
  "connect-src 'self' https://*.clerk.accounts.dev https://clerk.groupnom.com https://clerk-telemetry.com",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://img.clerk.com https://tile.openstreetmap.org",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "worker-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(self)',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
