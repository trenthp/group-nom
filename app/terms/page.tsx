import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service | Group Nom',
  description: 'The rules of the library.',
}

export default function TermsOfServicePage() {
  const lastUpdated = 'September 2026'

  return (
    <div className="min-h-screen bg-surface-page">
      {/* Header */}
      <header className="px-4 py-6 border-b border-white/10">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="text-brand text-sm hover:text-orange-400 transition">
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
              By using Group Nom (&quot;the Service&quot;) you agree to these Terms. If you
              do not agree, do not use the Service.
            </p>
          </Section>

          <Section title="What Group Nom Is">
            <p>
              Group Nom is a community library of loved places, built by its members. On
              Group Nom you can:
            </p>
            <ul>
              <li>Nominate a local restaurant you love, with a photo and why you love it</li>
              <li>Add shared facts to a place&apos;s page, such as hours notes, menu links, and parking tips</li>
              <li>Browse the map of your area, keep a to-try list, and follow other members</li>
              <li>Run a group session to decide where to eat together</li>
            </ul>
            <p>
              The library is positive-only by design. There are no ratings and no reviews.
              The only thing a place can accumulate on Group Nom is love.
            </p>
          </Section>

          <Section title="Your Account">
            <p>You need an account to use the library. You agree to:</p>
            <ul>
              <li>Be at least 13 years old</li>
              <li>Provide accurate information and keep one account</li>
              <li>Keep your sign-in credentials secure and tell us about any unauthorized use</li>
              <li>Take responsibility for what happens under your account</li>
            </ul>
          </Section>

          <Section title="Community Rules">
            <p>Group Nom works because members are honest about what they love. You agree to:</p>
            <ul>
              <li>Nominate only places you have actually been to and genuinely love</li>
              <li>Not nominate a place you own, work for, or are paid to promote</li>
              <li>Upload only photos you took or have the right to share, and not photos of other people without their consent</li>
              <li>Keep it positive: ratings, reviews, complaints, and criticism of a place or its staff are not allowed and will be removed</li>
              <li>Keep place facts accurate and free of promotion</li>
            </ul>
            <p>You also agree not to:</p>
            <ul>
              <li>Use the Service for anything illegal</li>
              <li>Harass, threaten, or harm other members</li>
              <li>Impersonate anyone or misrepresent your connection to a place</li>
              <li>Post spam, false, or misleading content, or file reports in bad faith</li>
              <li>Use bots or scrapers, or try to circumvent rate limits, the library gate, or other security measures</li>
              <li>Try to access other members&apos; accounts or private information</li>
            </ul>
          </Section>

          <Section title="Your Content">
            <p>
              You own the photos and words you publish. By publishing them you give us a
              worldwide, non-exclusive, royalty-free license to store, display, and
              distribute them as part of the Service, including on place pages, in
              members&apos; feeds, and in aggregate counts on public share pages. This license
              ends when you delete the content, except where it has already been
              shared in ways we cannot recall, such as cached link previews.
            </p>
            <p>
              Your nominations are shown with your first name and last initial. If you
              delete your account, nominations and place facts you published stay in the
              library attributed to &quot;a former member,&quot; unless you delete them
              first or ask us to remove them.
            </p>
            <p>
              Place facts are shared, wiki-style. Other members can edit them, and no
              member&apos;s name is attached to them.
            </p>
          </Section>

          <Section title="Moderation">
            <p>
              Members can report nominations and places. We may remove content, hide a
              place, or suspend or terminate an account if we believe these Terms have
              been broken, and we may do so without notice. We never edit a member&apos;s
              words; we remove them or leave them. A place that closes or turns out not to
              be a restaurant is quietly hidden, not marked down.
            </p>
          </Section>

          <Section title="Place Information">
            <p>
              The base list of places comes from open data published by the Overture Maps
              Foundation. Everything else about a place is contributed by members. We make
              no guarantee that any of it is accurate, complete, or current, including
              hours, menus, prices, location, and whether a place is still open. Check with
              the restaurant before you go.
            </p>
          </Section>

          <Section title="Group Sessions">
            <p>When you create or join a group session:</p>
            <ul>
              <li>Other participants can see that you joined and whether you have finished voting</li>
              <li>The group sees which places matched; individual votes are not shown</li>
              <li>Share the session code only with the people you want in the session</li>
              <li>Sessions are deleted 24 hours after they are created</li>
              <li>The group&apos;s decision and the meal that follows are the group&apos;s own</li>
            </ul>
          </Section>

          <Section title="Intellectual Property">
            <p>
              The Group Nom name, design, and software are ours. You may not copy, modify,
              or redistribute them without permission.
            </p>
            <p>
              Map tiles are © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">OpenStreetMap contributors</a>,
              used under the Open Database License. Base place data is from the{' '}
              <a href="https://overturemaps.org" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">Overture Maps Foundation</a>.
              Photos and words belong to the members who published them.
            </p>
          </Section>

          <Section title="Third-Party Services">
            <p>Group Nom runs on these services, each under its own terms:</p>
            <ul>
              <li>Clerk (sign-in)</li>
              <li>Vercel (hosting, photo storage, analytics)</li>
              <li>Neon (database)</li>
              <li>Upstash (sessions and rate limits)</li>
              <li>LocationIQ (geocoding)</li>
            </ul>
          </Section>

          <Section title="Disclaimer of Warranties">
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
              WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE
              WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT ANY INFORMATION ABOUT A
              PLACE IS ACCURATE. WE ARE NOT RESPONSIBLE FOR THE QUALITY OF ANY DINING
              EXPERIENCE, FOR THE ACTIONS OF OTHER MEMBERS, OR FOR LOSS OF DATA.
            </p>
          </Section>

          <Section title="Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, GROUP NOM AND ITS OPERATORS SHALL NOT
              BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
              DAMAGES, OR ANY LOSS OF PROFITS, REVENUES, DATA, USE, OR GOODWILL, ARISING
              FROM YOUR USE OF THE SERVICE.
            </p>
          </Section>

          <Section title="Indemnification">
            <p>
              You agree to indemnify and hold harmless Group Nom and its operators from any
              claims, damages, or expenses arising from content you publish, your use of
              the Service, or your violation of these Terms.
            </p>
          </Section>

          <Section title="Ending Your Account">
            <p>
              You can delete your account at any time from your account settings or by
              emailing us. What happens to your content is described above and in our{' '}
              <Link href="/privacy" className="text-brand hover:underline">Privacy Policy</Link>.
              We may suspend or terminate accounts that break these Terms.
            </p>
          </Section>

          <Section title="Changes to These Terms">
            <p>
              We may change these Terms. Significant changes will be announced in the app.
              Continued use after a change means you accept the new Terms.
            </p>
          </Section>

          <Section title="Governing Law">
            <p>
              These Terms are governed by the laws of the United States. Any disputes
              shall be resolved in the courts of competent jurisdiction.
            </p>
          </Section>

          <Section title="Contact">
            <p>Questions about these Terms:</p>
            <p className="text-brand">hello@groupnom.com</p>
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
