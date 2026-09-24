import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import SessionProvider from '@/components/auth/SessionProvider'
import BottomNav from '@/components/BottomNav'
import CookieConsent from '@/components/CookieConsent'
import './globals.css'

export const metadata: Metadata = {
  title: 'Group Nom',
  description: 'Find your next favorite restaurant with friends',
  icons: {
    icon: [
      { url: '/favicon_groupNom.svg', type: 'image/svg+xml' },
      { url: '/favicon_groupNom.png', type: 'image/png' },
    ],
    apple: '/favicon_groupNom.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Let the page extend under the iPhone home indicator; BottomNav pads
  // itself with env(safe-area-inset-bottom) (see .pb-safe in globals.css)
  viewportFit: 'cover',
  themeColor: '#222222',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@500&family=Alan+Sans:wght@800&display=swap" rel="stylesheet" />
      </head>
      {/* Dark Ember ground everywhere: short pages and iOS overscroll must
          never flash light gray behind the dark surfaces */}
      <body className="bg-surface-page pb-16 md:pb-0">
        <SessionProvider>
          {/* Before the page: on md+ it's a sticky top bar in normal flow;
              on phones it's fixed to the bottom and body pb-16 reserves it */}
          <BottomNav />
          {children}
          <CookieConsent />
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  )
}
