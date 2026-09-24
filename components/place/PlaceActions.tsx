'use client'

import { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button, LinkButton, type ButtonProps, type LinkButtonProps } from '@/components/ui'

/**
 * The action row under a place. Every child gets an equal share of the
 * width, so two actions make two halves and three make thirds; a second
 * row holds the quieter follow-ups. Buttons come from the kit so a place's
 * actions look like every other button in the app.
 *
 * Vocabulary (keep it, so the same verb means the same thing everywhere):
 *   "Save to try" / "✓ On your list"   primary toggle
 *   "❤️ Nominate"                       secondary
 *   "See the page →"  "Open in maps ↗"  quiet
 */
export interface PlaceActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function PlaceActions({ className, children, ...props }: PlaceActionsProps) {
  return (
    <div className={cn('grid grid-flow-col auto-cols-fr gap-2 mt-4', className)} {...props}>
      {children}
    </div>
  )
}

const compact = 'py-2.5 px-3 text-sm'

export function ActionButton({ className, variant = 'secondary', ...props }: ButtonProps) {
  return <Button variant={variant} size="md" className={cn(compact, className)} {...props} />
}

export function ActionLink({ className, variant = 'secondary', ...props }: LinkButtonProps) {
  return <LinkButton variant={variant} size="md" className={cn(compact, className)} {...props} />
}

/** The quieter row: text-weight links on a faint surface. */
export function QuietLink({ className, ...props }: LinkButtonProps) {
  return (
    <LinkButton
      variant="ghost"
      size="md"
      className={cn(compact, 'bg-white/5 font-medium text-white/80 hover:bg-white/10', className)}
      {...props}
    />
  )
}

export function mapsUrl(lat: number, lng: number) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
}
