import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Group Nom',
  description: 'Find your next favorite restaurant with friends',
  icons: {
    icon: '/favicon_groupNom.png',
    apple: '/favicon_groupNom.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
        <link href="https://fonts.googleapis.com/css2?family=Alan+Sans:wght@500;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-gray-50">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
