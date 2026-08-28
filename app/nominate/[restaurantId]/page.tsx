'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { QuickCaptureForm, EnrichmentForm, CoNominators } from '@/components/nomination'
import type { Restaurant, Nomination } from '@/lib/types'

type NominationStep = 'loading' | 'capture' | 'enrichment' | 'success' | 'limit'

export default function NominatePage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const restaurantId = params.restaurantId as string

  const [step, setStep] = useState<NominationStep>('loading')
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [nomination, setNomination] = useState<Nomination | null>(null)
  const [existingNomination, setExistingNomination] = useState<Nomination | null>(null)
  const [coNominators, setCoNominators] = useState<Array<{
    clerkUserId: string
    displayName?: string
    avatarUrl?: string
  }>>([])
  const [nominationCount, setNominationCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  // Where "Done" lands: your member page, with the welcome moment if this
  // was the nomination that unlocked the library.
  const [doneHref, setDoneHref] = useState('/library')
  const [resetsAt, setResetsAt] = useState<string | null>(null)

  // Fetch restaurant and nomination data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch restaurant details
        const restaurantRes = await fetch(`/api/restaurants/${restaurantId}/details`)
        if (!restaurantRes.ok) {
          setError('Restaurant not found')
          return
        }
        const { restaurant: restaurantData } = await restaurantRes.json()
        setRestaurant(restaurantData)

        // Fetch existing nominations
        const nominationsRes = await fetch(`/api/nominations/restaurant/${restaurantId}`)
        if (nominationsRes.ok) {
          const data = await nominationsRes.json()
          setNominationCount(data.nominationCount)
          setCoNominators(data.coNominators || [])

          if (data.userNomination) {
            setExistingNomination(data.userNomination)
            setNomination(data.userNomination)
            setStep('success')
            return
          }
        }

        // One per local day — check before showing the form so a blocked
        // publish never gets as far as uploading a photo
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const todayRes = await fetch(`/api/nominations/today?tz=${encodeURIComponent(tz)}`)
        if (todayRes.ok) {
          const today = await todayRes.json()
          if (today.usedToday) {
            setResetsAt(today.resetsAt)
            setStep('limit')
            return
          }
        }

        setStep('capture')
      } catch {
        setError('Failed to load restaurant data')
      }
    }

    if (isLoaded && restaurantId) {
      fetchData()
    }
  }, [restaurantId, isLoaded])

  const handleCaptureSuccess = (data: { id: string; photoUrl: string; whyILoveIt: string }) => {
    // Create a partial nomination from the quick capture response
    const newNomination: Nomination = {
      id: data.id,
      clerkUserId: user?.id ?? '',
      gersId: restaurantId,
      photoUrl: data.photoUrl,
      whyILoveIt: data.whyILoveIt,
      myFavoriteDishes: [],
      goodFor: [],
      createdAt: new Date(),
    }
    setNomination(newNomination)
    setNominationCount(prev => prev + 1)
    setStep('enrichment')

    // Ladder state is decided server-side; the profile now reflects this publish
    fetch('/api/user/profile')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data?.profile?.id) return
        const firstEver = data.profile.nominationCount === 1
        setDoneHref(`/member/${data.profile.id}${firstEver ? '?welcome=1' : ''}`)
      })
      .catch(() => { /* keep the library fallback */ })
  }

  const handleEnrichmentSuccess = (updatedNomination: Nomination) => {
    setNomination(updatedNomination)
    setStep('success')
  }

  const handleSkipEnrichment = () => {
    setStep('success')
  }

  const handleCancel = () => {
    router.back()
  }

  const handleDone = () => {
    router.push(doneHref)
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center p-4">
        <div className="bg-surface-card rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
          <p className="text-white/60 mb-6">
            You need to be signed in to nominate restaurants.
          </p>
          <button
            onClick={() => router.push('/sign-in')}
            className="px-6 py-3 bg-brand text-white rounded-lg font-semibold hover:bg-brand-hover transition"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center p-4">
        <div className="bg-surface-card rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
          <p className="text-white/60 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (step === 'loading' || !restaurant) {
    return (
      <div className="min-h-screen bg-surface-page flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-page py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Back button */}
        <button
          onClick={handleCancel}
          className="mb-4 text-white/60 flex items-center gap-2 hover:text-white transition"
        >
          ← Back
        </button>

        {step === 'limit' && (
          <div className="bg-surface-card rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-white/50 mb-2">One a day</p>
            <h2 className="text-xl font-bold text-white mb-2">
              You&apos;ve already put a place on the shelf today
            </h2>
            <p className="text-white/70 mb-1">
              <span className="font-semibold text-white">{restaurant.name}</span> can be tomorrow&apos;s.
              {resetsAt && (
                <> The next nomination opens at{' '}
                  {new Date(resetsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}.
                </>
              )}
            </p>
            <p className="text-white/50 text-sm mb-6">
              One place a day keeps the list honest — every nomination is something you meant.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push(`/restaurant/${restaurantId}`)}
                className="w-full px-6 py-3 bg-brand text-white rounded-lg font-semibold hover:bg-brand-hover transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
              >
                See its page
              </button>
              <button
                onClick={handleCancel}
                className="w-full px-6 py-3 border border-white/20 text-white/70 rounded-lg font-medium hover:bg-white/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {step === 'capture' && (
          <QuickCaptureForm
            restaurant={restaurant}
            onSuccess={handleCaptureSuccess}
            onCancel={handleCancel}
          />
        )}

        {step === 'enrichment' && nomination && (
          <EnrichmentForm
            nomination={nomination}
            onSuccess={handleEnrichmentSuccess}
            onSkip={handleSkipEnrichment}
          />
        )}

        {step === 'success' && (
          <div className="bg-surface-card rounded-2xl overflow-hidden">
            {/* Success Header */}
            <div className="bg-green-500/15 border-b border-green-500/20 px-6 py-8 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {existingNomination ? 'Already on your shelf' : 'It’s on the shelf'}
              </h2>
              <p className="text-green-300">
                {existingNomination
                  ? 'You nominated this place before'
                  : 'One more place the community can trust'}
              </p>
            </div>

            {/* Restaurant Info */}
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">
                {restaurant.name}
              </h3>
              <p className="text-white/60 text-sm mb-4">{restaurant.address}</p>

              {/* Co-nominators */}
              {nominationCount > 0 && (
                <CoNominators
                  nominationCount={nominationCount}
                  coNominators={coNominators}
                  userHasNominated={true}
                  className="mb-6"
                />
              )}

              {/* Your nomination */}
              {nomination && (
                <div className="bg-white/5 rounded-lg p-4 mb-6">
                  <p className="text-sm text-white/50 mb-2">Your nomination:</p>
                  <p className="text-white/90 italic">"{nomination.whyILoveIt}"</p>
                  {nomination.myFavoriteDishes && nomination.myFavoriteDishes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {nomination.myFavoriteDishes.map((dish) => (
                        <span
                          key={dish}
                          className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs"
                        >
                          {dish}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleDone}
                  className="w-full px-6 py-3 bg-brand text-white rounded-lg font-semibold hover:bg-brand-hover transition"
                >
                  {doneHref.startsWith('/member') ? 'See your page' : 'Done'}
                </button>

                {!existingNomination && nomination && (
                  <button
                    onClick={() => setStep('enrichment')}
                    className="w-full px-6 py-3 border border-white/20 text-white/70 rounded-lg font-medium hover:bg-white/5 transition"
                  >
                    Add More Details
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
