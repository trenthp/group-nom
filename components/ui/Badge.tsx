'use client'

import { forwardRef, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Dark-first tints. `nomination` is the community-love signal (the only
   * count a place accumulates — no ratings anywhere).
   */
  variant?: 'default' | 'nomination' | 'cuisine' | 'dish' | 'status' | 'local' | 'warning'
  size?: 'sm' | 'md'
  children: ReactNode
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-1
      font-semibold rounded-pill
      whitespace-nowrap
    `

    const variantStyles = {
      default: 'bg-white/10 text-white/70',
      nomination: 'bg-green-500/20 text-green-300',
      cuisine: 'bg-brand-soft text-orange-300',
      // A member's favorite dish: the same green as the nomination heart, softer
      dish: 'bg-green-500/15 text-green-300',
      status: 'bg-blue-500/20 text-blue-300',
      local: 'bg-gradient-to-r from-sunset-from to-sunset-to text-white',
      warning: 'bg-amber-500/20 text-amber-300',
    }

    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-xs',
    }

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }

// NominationBadge - the standard "❤️ N nominations" pill from the library
export interface NominationBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  count: number
  size?: 'sm' | 'md'
}

const NominationBadge = forwardRef<HTMLSpanElement, NominationBadgeProps>(
  ({ count, size = 'md', ...props }, ref) => {
    return (
      <Badge ref={ref} variant="nomination" size={size} {...props}>
        <span aria-hidden="true">❤️</span> {count} nomination{count === 1 ? '' : 's'}
      </Badge>
    )
  }
)

NominationBadge.displayName = 'NominationBadge'

export { NominationBadge }
