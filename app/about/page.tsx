import Header from '@/components/Header'
import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import CallToAction from '@/components/landing/CallToAction'

export default function AboutPage() {
  return (
    <main className="flex flex-col">
      <div className="bg-gradient-to-br from-orange-500 to-red-600">
        <Header />
        <Hero />
      </div>
      <Features />
      <CallToAction />
    </main>
  )
}
