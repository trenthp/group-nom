import Link from 'next/link'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Why Group Nom',
  description: 'A community library of loved local places. No ads, no ratings, no reviews.',
}

/**
 * The mission page. Linked from the landing page and the footer. Dark
 * like every library surface; the sunset gradient is for sessions only.
 */
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-surface-page">
      <header className="px-4 py-6 border-b border-white/10">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="text-brand text-sm hover:text-orange-400 transition">
            ← Back to Group Nom
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-16">
        <h1 className="text-3xl font-bold text-white mb-3">Why Group Nom</h1>
        <p className="text-white/70 text-lg mb-10">
          Every city has places people quietly love. The apps we had were built to rate,
          rank, and sell ads against them. We wanted a library instead.
        </p>

        <div className="space-y-10">
          <Section title="The idea">
            <p>
              Group Nom is a community library of loved places. A member nominates a
              restaurant they love with a photo and a sentence about why. That&apos;s the
              whole contribution. Enough of those and you have something no algorithm
              produces: a map of a town drawn by the people who eat there.
            </p>
            <p>
              Your first nomination opens the whole library, and from then on you can
              browse every place your neighbors have lit up, keep a list of the ones
              you want to try, and start a session with friends to decide where to go
              tonight.
            </p>
          </Section>

          <Section title="What we refuse to build">
            <ul>
              <li><strong>Ratings.</strong> No stars, no scores, no averages. A place is loved by some number of people, and that is the only number.</li>
              <li><strong>Reviews.</strong> No complaints, no rants. If somewhere isn&apos;t good anymore, it quietly stops being surfaced. Nobody piles on.</li>
              <li><strong>Follower counts.</strong> You can follow members whose taste you trust. Nobody sees who follows whom or how many. Ranking people by influence is the same disease as star ratings.</li>
              <li><strong>Ads.</strong> Nothing here is sponsored and nothing is sold. There is no way to pay to be seen.</li>
            </ul>
          </Section>

          <Section title="Where the map comes from">
            <p>
              The base map of places is open data from the Overture Maps Foundation, and
              the tiles are OpenStreetMap. Everything that makes a place worth visiting,
              the photos, the reasons, the favorite dishes, the parking tips, comes from
              members. We don&apos;t buy data and we don&apos;t scrape anyone.
            </p>
            <p>
              Members also curate the raw map: flagging places that have closed,
              duplicates, and things that aren&apos;t restaurants. Discover is where that
              happens.
            </p>
          </Section>

          <Section title="Sessions">
            <p>
              Deciding where to eat with a group is the oldest argument there is. A
              session gives everyone the same ten places, everyone swipes, and the
              matches win. The deck draws from the library, so the argument is at least
              between places somebody loves.
            </p>
          </Section>

          <Section title="Where it started">
            <p>
              Orlando, among friends who kept asking each other where to eat. It is
              built to work anywhere, and every town starts the same way: with one
              person nominating one place.
            </p>
          </Section>
        </div>

        <div className="mt-12">
          <Link
            href="/sign-up"
            className="block w-full bg-brand text-white font-bold text-lg py-4 rounded-2xl text-center hover:bg-brand-hover transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
          >
            Join the library
          </Link>
        </div>

        <Footer />
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
      <div className="text-white/70 space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_li]:text-white/60 [&_strong]:text-white">
        {children}
      </div>
    </section>
  )
}
