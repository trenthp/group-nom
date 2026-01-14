import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | Group Nom',
  description: 'How Group Nom collects, uses, and protects your data.',
}

export default function PrivacyPolicyPage() {
  const lastUpdated = 'January 2025'

  return (
    <div className="min-h-screen bg-[#222222]">
      {/* Header */}
      <header className="px-4 py-6 border-b border-white/10">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="text-[#EA4D19] text-sm hover:text-orange-400 transition">
            ← Back to Group Nom
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 pb-16">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-white/50 text-sm mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6">
          <Section title="Overview">
            <p>
              Group Nom ("we," "our," or "us") is a restaurant discovery platform that helps
              you find places to eat, save your favorites, and make group dining decisions.
              This Privacy Policy explains how we collect, use, and protect your information.
            </p>
          </Section>

          <Section title="Information We Collect">
            <h4>Account Information</h4>
            <p>
              When you create an account, we collect information through our authentication
              provider (Clerk), which may include:
            </p>
            <ul>
              <li>Name and email address</li>
              <li>Profile photo (if provided)</li>
              <li>Authentication credentials</li>
            </ul>

            <h4>Usage Information</h4>
            <p>As you use Group Nom, we collect:</p>
            <ul>
              <li>Restaurants you like or save</li>
              <li>Voting history in group sessions</li>
              <li>Location data (only when you choose to share it for restaurant search)</li>
              <li>Session codes you create or join</li>
            </ul>

            <h4>Automatically Collected Information</h4>
            <ul>
              <li>Device type and browser information</li>
              <li>IP address</li>
              <li>Pages visited and features used</li>
              <li>Cookies for authentication and preferences</li>
            </ul>
          </Section>

          <Section title="How We Use Your Information">
            <p>We use your information to:</p>
            <ul>
              <li>Provide and improve the Group Nom service</li>
              <li>Save your favorite restaurants</li>
              <li>Enable group voting sessions</li>
              <li>Show you relevant restaurant suggestions</li>
              <li>Display aggregate statistics (e.g., "liked by X locals")</li>
              <li>Communicate service updates (if you opt in)</li>
              <li>Prevent fraud and abuse</li>
            </ul>
          </Section>

          <Section title="Information Sharing">
            <p>We do not sell your personal information. We share data only with:</p>
            <ul>
              <li>
                <strong>Service Providers:</strong> Companies that help us operate
                (Clerk for authentication, Vercel for hosting, Neon for database,
                Google for maps and restaurant data)
              </li>
              <li>
                <strong>Group Session Participants:</strong> When you join a voting session,
                other participants can see your votes for that session only
              </li>
              <li>
                <strong>Aggregate Data:</strong> We may share anonymized, aggregate statistics
                (like total likes for a restaurant) publicly
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or to protect rights
              </li>
            </ul>
          </Section>

          <Section title="Third-Party Services">
            <p>Group Nom uses the following third-party services:</p>
            <ul>
              <li>
                <strong>Clerk</strong> — Authentication and user management.
                See <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#EA4D19] hover:underline">Clerk's Privacy Policy</a>
              </li>
              <li>
                <strong>Google Maps Platform</strong> — Restaurant data and maps.
                See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#EA4D19] hover:underline">Google's Privacy Policy</a> and{' '}
                <a href="https://maps.google.com/help/terms_maps/" target="_blank" rel="noopener noreferrer" className="text-[#EA4D19] hover:underline">Google Maps Terms</a>
              </li>
              <li>
                <strong>Vercel</strong> — Hosting and analytics.
                See <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#EA4D19] hover:underline">Vercel's Privacy Policy</a>
              </li>
            </ul>
          </Section>

          <Section title="Data Retention">
            <p>
              We retain your account data as long as your account is active. You can
              delete your account at any time, which will remove your personal data
              from our systems. Anonymized aggregate data (like restaurant like counts)
              may be retained.
            </p>
          </Section>

          <Section title="Your Rights (California Residents)">
            <p>If you are a California resident, you have the right to:</p>
            <ul>
              <li>Know what personal information we collect</li>
              <li>Request deletion of your personal information</li>
              <li>Opt out of the sale of personal information (we do not sell data)</li>
              <li>Non-discrimination for exercising your rights</li>
            </ul>
            <p>
              To exercise these rights, contact us at the email below.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              We use cookies for authentication (keeping you signed in) and to remember
              your preferences. These are essential cookies required for the service to
              function. We also use analytics cookies to understand how people use Group Nom.
            </p>
          </Section>

          <Section title="Security">
            <p>
              We implement industry-standard security measures including HTTPS encryption,
              secure authentication through Clerk, and encrypted database storage. However,
              no method of transmission over the Internet is 100% secure.
            </p>
          </Section>

          <Section title="Children's Privacy">
            <p>
              Group Nom is not intended for children under 13. We do not knowingly collect
              information from children under 13. If you believe we have collected such
              information, please contact us.
            </p>
          </Section>

          <Section title="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of
              significant changes by posting a notice on the app or sending you an email.
            </p>
          </Section>

          <Section title="Contact Us">
            <p>
              If you have questions about this Privacy Policy or your data, contact us at:
            </p>
            <p className="text-[#EA4D19]">hello@groupnom.com</p>
          </Section>
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-white/10 flex gap-6 text-sm">
          <Link href="/terms" className="text-white/50 hover:text-white transition">
            Terms of Service
          </Link>
          <Link href="/" className="text-white/50 hover:text-white transition">
            Home
          </Link>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
      <div className="text-white/70 space-y-3 [&_h4]:text-white [&_h4]:font-medium [&_h4]:mt-4 [&_h4]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-white/60">
        {children}
      </div>
    </section>
  )
}
