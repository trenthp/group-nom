'use client'

import { UserButton } from '@clerk/nextjs'
import SupportPage from './SupportPage'

function SupportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export default function UserMenu() {
  return (
    <UserButton
      appearance={{
        variables: {
          colorPrimary: '#ea580c',
          colorText: '#1f2937',
          colorTextSecondary: '#6b7280',
          colorBackground: '#ffffff',
          fontFamily: "'Albert Sans', sans-serif",
          borderRadius: '0.5rem',
        },
        elements: {
          // Avatar - white ring to stand out on gradient background
          avatarBox: 'w-9 h-9 ring-2 ring-white/70 hover:ring-white transition-all rounded-lg',
          avatarImage: 'rounded-lg',

          // Popover card - match Group Nom card style
          userButtonPopoverCard: 'bg-white rounded-2xl shadow-2xl border-0 overflow-hidden min-w-[240px]',
          userButtonPopoverMain: 'p-3',

          // User info section at top
          userPreview: 'p-4 bg-gray-50 rounded-xl mb-2',
          userPreviewMainIdentifier: 'text-gray-800 font-semibold',
          userPreviewSecondaryIdentifier: 'text-gray-500 text-sm',
          userPreviewAvatarBox: 'rounded-lg',

          // Action buttons in menu
          userButtonPopoverActionButton: 'w-full rounded-lg hover:bg-orange-50 transition px-4 py-3 justify-start',
          userButtonPopoverActionButtonText: 'text-gray-700 font-medium',
          userButtonPopoverActionButtonIcon: 'text-orange-500 w-5 h-5',

          // Sign out button - subtle red styling
          userButtonPopoverActionButton__signOut: 'hover:bg-red-50',
          userButtonPopoverActionButtonText__signOut: 'text-red-600',
          userButtonPopoverActionButtonIcon__signOut: 'text-red-500',

          // Hide Clerk branding
          userButtonPopoverFooter: 'hidden',
        },
      }}
      afterSignOutUrl="/"
    >
      <UserButton.UserProfilePage
        label="Support"
        labelIcon={<SupportIcon />}
        url="support"
      >
        <SupportPage />
      </UserButton.UserProfilePage>
    </UserButton>
  )
}
