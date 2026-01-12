'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { QuickCaptureForm, EnrichmentForm, CoNominators } from '@/components/nomination'
import type { Restaurant, Nomination } from '@/lib/types'

type NominationStep = 'loading' | 'capture' | 'enrichment' | 'success'

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
    router.push('/')
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be signed in to nominate restaurants.
          </p>
          <button
            onClick={() => router.push('/sign-in')}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (step === 'loading' || !restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
        <div className="text-white text-lg">Loading restaurant...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Back button */}
        <button
          onClick={handleCancel}
          className="mb-4 text-white flex items-center gap-2 hover:opacity-80"
        >
          ← Back
        </button>

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
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-8 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {existingNomination ? 'Already Nominated!' : 'Nomination Complete!'}
              </h2>
              <p className="text-green-100">
                Thanks for sharing your local knowledge
              </p>
            </div>

            {/* Restaurant Info */}
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {restaurant.name}
              </h3>
              <p className="text-gray-600 text-sm mb-4">{restaurant.address}</p>

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
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-500 mb-2">Your nomination:</p>
                  <p className="text-gray-800 italic">"{nomination.whyILoveIt}"</p>
                  {nomination.myFavoriteDishes && nomination.myFavoriteDishes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {nomination.myFavoriteDishes.map((dish) => (
                        <span
                          key={dish}
                          className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs"
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
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600"
                >
                  Done
                </button>

                {!existingNomination && nomination && (
                  <button
                    onClick={() => setStep('enrichment')}
                    className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
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
