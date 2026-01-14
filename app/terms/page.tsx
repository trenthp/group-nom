import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service | Group Nom',
  description: 'Terms and conditions for using Group Nom.',
}

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-white/50 text-sm mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6">
          <Section title="Agreement to Terms">
            <p>
              By accessing or using Group Nom ("the Service"), you agree to be bound by these
              Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
            </p>
          </Section>

          <Section title="Description of Service">
            <p>
              Group Nom is a restaurant discovery platform that allows you to:
            </p>
            <ul>
              <li>Discover restaurants through a swipe-based interface</li>
              <li>Save favorite restaurants to your personal collection</li>
              <li>Create and participate in group voting sessions to decide where to eat</li>
              <li>View aggregate data about restaurant popularity</li>
            </ul>
          </Section>

          <Section title="Account Registration">
            <p>
              To access certain features, you must create an account. You agree to:
            </p>
            <ul>
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Accept responsibility for all activity under your account</li>
            </ul>
            <p>
              You must be at least 13 years old to create an account.
            </p>
          </Section>

          <Section title="Acceptable Use">
            <p>You agree NOT to:</p>
            <ul>
              <li>Use the Service for any illegal purpose</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to access other users' accounts</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use automated systems (bots, scrapers) to access the Service</li>
              <li>Circumvent rate limits or security measures</li>
              <li>Submit false, misleading, or spam content</li>
              <li>Impersonate another person or entity</li>
            </ul>
          </Section>

          <Section title="User Content">
            <p>
              By using Group Nom, you contribute data such as restaurant likes and votes.
              You grant us a non-exclusive, royalty-free license to use this data to:
            </p>
            <ul>
              <li>Operate and improve the Service</li>
              <li>Generate aggregate statistics and recommendations</li>
              <li>Display popularity metrics to other users</li>
            </ul>
            <p>
              You retain ownership of your personal data and can request its deletion
              at any time by deleting your account.
            </p>
          </Section>

          <Section title="Restaurant Information">
            <p>
              Restaurant data displayed in Group Nom is sourced from third-party providers,
              including Google Maps. We make no guarantees about the accuracy, completeness,
              or timeliness of this information, including but not limited to:
            </p>
            <ul>
              <li>Business hours and availability</li>
              <li>Menu items and prices</li>
              <li>Ratings and reviews</li>
              <li>Location and contact information</li>
            </ul>
            <p>
              Always verify important details directly with the restaurant before visiting.
            </p>
          </Section>

          <Section title="Group Sessions">
            <p>
              When you create or join a group voting session:
            </p>
            <ul>
              <li>Your votes are visible to other participants in that session</li>
              <li>Session codes should be shared only with intended participants</li>
              <li>Sessions expire after 24 hours</li>
              <li>We are not responsible for group decisions or dining experiences</li>
            </ul>
          </Section>

          <Section title="Intellectual Property">
            <p>
              The Group Nom service, including its design, features, and branding, is owned
              by us and protected by intellectual property laws. You may not copy, modify,
              distribute, or create derivative works without our permission.
            </p>
            <p>
              Restaurant data and images are property of their respective owners and are
              used under license from third-party providers.
            </p>
          </Section>

          <Section title="Third-Party Services">
            <p>
              Group Nom integrates with third-party services including:
            </p>
            <ul>
              <li>Clerk (authentication)</li>
              <li>Google Maps Platform (restaurant data and maps)</li>
              <li>Vercel (hosting)</li>
            </ul>
            <p>
              Your use of these services is subject to their respective terms and policies.
              In particular, by using Group Nom you also agree to be bound by the{' '}
              <a href="https://maps.google.com/help/terms_maps/" target="_blank" rel="noopener noreferrer" className="text-[#EA4D19] hover:underline">
                Google Maps/Google Earth Additional Terms of Service
              </a>{' '}
              and{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#EA4D19] hover:underline">
                Google Privacy Policy
              </a>.
            </p>
          </Section>

          <Section title="Disclaimer of Warranties">
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
              ERROR-FREE, OR SECURE.
            </p>
            <p>
              WE DISCLAIM ALL LIABILITY FOR:
            </p>
            <ul>
              <li>Accuracy of restaurant information</li>
              <li>Quality of dining experiences</li>
              <li>Actions of other users</li>
              <li>Data loss or service interruptions</li>
            </ul>
          </Section>

          <Section title="Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, GROUP NOM AND ITS OPERATORS SHALL NOT
              BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
              DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR
              INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
          </Section>

          <Section title="Indemnification">
            <p>
              You agree to indemnify and hold harmless Group Nom and its operators from any
              claims, damages, or expenses arising from your use of the Service or violation
              of these Terms.
            </p>
          </Section>

          <Section title="Account Termination">
            <p>
              We reserve the right to suspend or terminate your account at any time for
              violation of these Terms or for any other reason at our discretion. You may
              delete your account at any time through your account settings.
            </p>
          </Section>

          <Section title="Changes to Terms">
            <p>
              We may modify these Terms at any time. We will notify you of significant
              changes by posting a notice on the Service. Continued use after changes
              constitutes acceptance of the new Terms.
            </p>
          </Section>

          <Section title="Governing Law">
            <p>
              These Terms are governed by the laws of the United States. Any disputes
              shall be resolved in the courts of competent jurisdiction.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              For questions about these Terms, contact us at:
            </p>
            <p className="text-[#EA4D19]">hello@groupnom.com</p>
          </Section>
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-white/10 flex gap-6 text-sm">
          <Link href="/privacy" className="text-white/50 hover:text-white transition">
            Privacy Policy
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
