import { SignUp } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'
import Footer from '@/components/Footer'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-500 to-red-600">
      {/* Header */}
      <header className="w-full">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <Image
              src="/logo_groupNom.svg"
              alt="Group Nom"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-white font-bold text-lg">Group Nom</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/about"
              className="text-white text-sm font-medium hover:text-orange-100 transition"
            >
              About
            </Link>
            <Link
              href="/sign-in"
              className="bg-white text-orange-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-orange-50 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Join the crew!</h1>
          <p className="text-orange-100">Save your favorites & never forget a gem</p>
        </div>

        <SignUp
          appearance={{
            variables: {
              colorPrimary: '#c2410c',
              colorBackground: '#ffffff',
              colorText: '#1f2937',
              colorTextSecondary: '#6b7280',
              colorInputBackground: '#ffffff',
              colorInputText: '#1f2937',
              fontFamily: "'Albert Sans', sans-serif",
              borderRadius: '0.5rem',
            },
            layout: {
              socialButtonsPlacement: 'top',
              socialButtonsVariant: 'blockButton',
            },
            elements: {
              // Root container
              rootBox: 'w-full max-w-md',

              // Card - dark background
              card: 'bg-[#111111] rounded-3xl shadow-2xl border-0 p-6',
              cardBox: 'p-0',

              // Hide Clerk's header (we have our own)
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',

              // Social buttons - orange style matching "Join Group"
              socialButtonsBlockButton: `
                w-full bg-orange-700 text-white font-semibold
                h-14 min-h-[56px]
                rounded-lg shadow-lg
                hover:bg-orange-800 hover:shadow-xl hover:scale-105
                transform transition-all duration-200
                border-0 outline-none
              `,
              socialButtonsBlockButtonText: 'text-white font-semibold text-base',
              socialButtonsBlockButtonArrow: 'hidden',
              socialButtonsProviderIcon: 'brightness-0 invert w-5 h-5',
              socialButtons: 'gap-3',

              // Divider
              dividerLine: 'bg-gray-600 h-px',
              dividerText: 'text-gray-400 text-sm px-4 bg-[#111111]',
              dividerRow: 'my-6',

              // Form fields
              formFieldLabel: 'text-white font-semibold text-sm mb-2 block',
              formFieldHintText: 'text-gray-400',
              formFieldInput: `
                w-full px-4 h-12 min-h-[48px]
                rounded-lg border border-gray-300
                focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500
                text-gray-800 text-base bg-white
              `,
              formFieldInputShowPasswordButton: 'text-orange-600 hover:text-orange-700',
              formFieldRow: 'mb-4',
              formField: 'mb-4',

              // Primary button - solid orange, matches app buttons
              formButtonPrimary: `
                w-full bg-orange-600 text-white font-semibold
                h-14 min-h-[56px]
                rounded-lg shadow-lg
                hover:bg-orange-700 hover:shadow-xl hover:scale-105
                transform transition-all duration-200
                border-0 outline-none
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              `,

              // Links
              footerActionLink: 'text-orange-400 hover:text-orange-300 font-bold',
              formFieldAction: 'text-orange-400 hover:text-orange-300 font-semibold text-sm',
              identityPreviewEditButton: 'text-orange-400 hover:text-orange-300 font-semibold',

              // Identity preview
              identityPreview: 'bg-gray-800 rounded-lg p-4 border border-gray-700',
              identityPreviewText: 'text-white font-semibold',
              identityPreviewEditButtonIcon: 'text-orange-400',

              // OTP/verification
              otpCodeFieldInput: `
                w-12 h-14 min-h-[56px]
                text-center text-xl font-bold
                rounded-lg border border-gray-300
                focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500
                bg-white
              `,
              formResendCodeLink: 'text-orange-400 hover:text-orange-300 font-semibold',

              // Alerts
              alert: 'bg-red-900/50 border border-red-500 rounded-lg p-4',
              alertText: 'text-red-300 text-sm font-medium',
              formFieldErrorText: 'text-red-400 text-sm mt-1 font-medium',
              formFieldSuccessText: 'text-green-400 text-sm mt-1 font-medium',

              // Footer - hide Clerk branding
              footer: 'hidden',
              footerAction: 'hidden',

              // Loading
              spinner: 'text-orange-600',

              // Form spacing
              main: 'p-6',
              form: 'gap-0',
            },
          }}
        />

        <p className="text-orange-100 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-white font-bold hover:underline">
            Sign in
          </Link>
        </p>

        <Footer />
      </div>
    </div>
  )
}
