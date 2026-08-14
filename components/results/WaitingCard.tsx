'use client'

import { ReactNode } from 'react'
import { LoadingDots } from '@/components/ui'

export interface WaitingCardProps {
  icon: ReactNode
  title: string
  message: string
}

/**
 * Glass waiting card for the session flow (Sunset Glass skin) —
 * covers "waiting on friends" and "host is reconfiguring" states.
 */
export function WaitingCard({ icon, title, message }: WaitingCardProps) {
  return (
    <div className="bg-surface-glass backdrop-blur-glass border border-surface-glass-border rounded-2xl p-8">
      <div className="mb-6 motion-safe:animate-bounce flex justify-center" aria-hidden="true">
        {icon}
      </div>
      <h2 className="text-3xl font-bold text-white mb-4">{title}</h2>
      <p className="text-orange-100 text-lg">{message}</p>
      <div className="mt-6">
        <LoadingDots variant="white" />
      </div>
    </div>
  )
}
