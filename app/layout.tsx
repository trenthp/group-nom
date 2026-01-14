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
      <body className="bg-gray-50 pb-16">
        <SessionProvider>
          {children}
          <BottomNav />
          <CookieConsent />
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  )
}
