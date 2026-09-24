import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | Group Nom',
  description: 'What Group Nom collects, what is public, and what is never shown.',
}

export default function PrivacyPolicyPage() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-white/50 text-sm mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6">
          <Section title="Overview">
            <p>
              Group Nom (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is a community
              library of loved places. Members nominate the local restaurants they love,
              build each place&apos;s page together, and use group sessions to decide where
              to eat. There are no ads, no ratings, and no reviews. This policy explains
              what we collect, what other people can see, and what we never show.
            </p>
          </Section>

          <Section title="Information We Collect">
            <h4>Account information</h4>
            <p>
              Sign-in is handled by Clerk. When you create an account we receive your
              name, email address, and profile photo if you set one. Your email address
              stays with Clerk; we store your name and photo so they can appear next to
              your nominations.
            </p>

            <h4>What you publish</h4>
            <ul>
              <li>Nominations: a photo, why you love the place, and optionally your favorite dishes and what the place is good for</li>
              <li>Place facts you add or edit: hours notes, menu links, parking tips</li>
              <li>Places you add to the map that were not already in our data</li>
            </ul>

            <h4>Private activity</h4>
            <ul>
              <li>Your to-try list and nomination drafts</li>
              <li>Who you follow and who you have blocked</li>
              <li>Your votes in group sessions and the session codes you create or join</li>
              <li>Reports you file about content or places</li>
              <li>Your time zone, so your daily nomination resets at your local midnight</li>
            </ul>

            <h4>Location</h4>
            <p>
              We use your location only to show places near you. It comes from your browser
              when you allow it, or from a town or address you type. Typed locations are
              sent to LocationIQ to be turned into coordinates. We do not keep a history of
              where you have been.
            </p>

            <h4>Collected automatically</h4>
            <ul>
              <li>Device and browser type</li>
              <li>IP address, used for rate limiting and abuse prevention</li>
              <li>Which pages and features are used, through Vercel Analytics, which does not use cookies or track you across sites</li>
            </ul>
          </Section>

          <Section title="What Other People Can See">
            <h4>Members can see</h4>
            <ul>
              <li>Your nominations: the photo, your words, dishes, and tags</li>
              <li>Your first name and last initial, and your profile photo, next to them</li>
              <li>Your member page, which lists the places you have nominated</li>
              <li>Place facts you contributed, without your name attached</li>
            </ul>

            <h4>Anyone on the internet can see</h4>
            <p>
              Public share pages and link previews show a place&apos;s name, its town, and
              how many members love it. They never show a member&apos;s name, photo, or
              words.
            </p>

            <h4>Never shown to anyone</h4>
            <ul>
              <li>Who follows you, who you follow, or how many people do either</li>
              <li>Your to-try list, drafts, and individual session votes</li>
              <li>Who you have blocked or reported</li>
              <li>Any internal ranking of members or places</li>
            </ul>
          </Section>

          <Section title="How We Use Your Information">
            <ul>
              <li>To run the library: show nominations, build place pages, and surface places near you</li>
              <li>To order places by how loved they are. This weighting is internal and is never displayed as a score.</li>
              <li>To run group sessions and show the group its matches</li>
              <li>To moderate content, act on reports, and prevent abuse</li>
              <li>To send service messages about your account</li>
            </ul>
            <p>We do not sell your information and we do not show ads.</p>
          </Section>

          <Section title="Who We Share It With">
            <p>Only the services that run Group Nom:</p>
            <ul>
              <li><strong>Clerk</strong> — sign-in and account management. <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">Clerk&apos;s privacy policy</a></li>
              <li><strong>Vercel</strong> — hosting, photo storage, and analytics. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">Vercel&apos;s privacy policy</a></li>
              <li><strong>Neon</strong> — the database that holds places, nominations, and profiles</li>
              <li><strong>Upstash</strong> — short-lived storage for group sessions and rate limits</li>
              <li><strong>LocationIQ</strong> — turns a typed town or address into coordinates. Only the text you type is sent.</li>
            </ul>
            <p>
              Other session participants can see that you joined and whether you have
              finished voting. We may also disclose information when the law requires it.
            </p>
          </Section>

          <Section title="Where Place Data Comes From">
            <p>
              The base list of places comes from open data published by the Overture Maps
              Foundation, and map tiles come from OpenStreetMap contributors. Everything
              else about a place is added by members. We do not use Google or any other
              paid data provider.
            </p>
          </Section>

          <Section title="Deleting Things">
            <h4>A nomination</h4>
            <p>
              You can delete any nomination you published. The photo and your words are
              removed.
            </p>

            <h4>Your account</h4>
            <p>
              You can delete your account from your account settings or by emailing us.
              Your name, photo, to-try list, drafts, follows, and group memberships are
              deleted, and you are removed from any groups you created. Nominations and
              place facts you published stay in the library, shown as coming from
              &quot;a former member,&quot; so the places you loved stay lit. If you would
              rather they go too, delete them before deleting your account, or email us
              and we will remove them.
            </p>

            <h4>Group sessions</h4>
            <p>Sessions and everything in them are deleted 24 hours after they are created.</p>
          </Section>

          <Section title="Your Rights">
            <p>Wherever you live, you can:</p>
            <ul>
              <li>Ask what personal information we hold about you</li>
              <li>Correct it, through your account settings or by emailing us</li>
              <li>Delete it, as described above</li>
            </ul>
            <p>
              We do not sell personal information, so there is nothing to opt out of.
              California residents have these rights under the CCPA and will not be treated
              differently for exercising them. To make a request, email us at the address
              below.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              We use a sign-in cookie set by Clerk to keep you signed in, and we remember a
              few preferences, such as whether you dismissed the cookie notice, in your
              browser&apos;s local storage. These are essential to the service. Our analytics
              do not use cookies.
            </p>
          </Section>

          <Section title="Security">
            <p>
              All traffic is encrypted with HTTPS, sign-in is handled by Clerk, and our
              database and photo storage are encrypted at rest. No method of transmission
              over the Internet is completely secure, and we cannot guarantee absolute
              security.
            </p>
          </Section>

          <Section title="Children">
            <p>
              Group Nom is not intended for children under 13. We do not knowingly collect
              information from children under 13. If you believe we have, please contact us
              and we will delete it.
            </p>
          </Section>

          <Section title="Changes to This Policy">
            <p>
              We may update this policy from time to time. Significant changes will be
              announced in the app or by email.
            </p>
          </Section>

          <Section title="Contact">
            <p>Questions about this policy or your data:</p>
            <p className="text-brand">hello@groupnom.com</p>
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
