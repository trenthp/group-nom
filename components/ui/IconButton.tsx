'use client'

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons have no visible text for screen readers. */
  'aria-label': string
  variant?: 'positive' | 'negative' | 'neutral' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'neutral', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center
      rounded-full
      transition-all duration-200 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page
      disabled:opacity-50 disabled:cursor-not-allowed
      motion-safe:hover:scale-110 motion-safe:active:scale-95
    `

    const variantStyles = {
      positive: `
        bg-action-positive text-white
        hover:bg-action-positive-hover
        focus-visible:ring-action-positive
        shadow-lg hover:shadow-xl
      `,
      negative: `
        bg-action-negative text-white
        hover:bg-action-negative-hover
        focus-visible:ring-action-negative
        shadow-lg hover:shadow-xl
      `,
      neutral: `
        bg-white/10 text-white
        hover:bg-white/20
        focus-visible:ring-white/60
      `,
      ghost: `
        bg-transparent text-white/60
        hover:bg-white/10 hover:text-white
        focus-visible:ring-white/60
      `,
    }

    const sizeStyles = {
      sm: 'w-8 h-8',
      md: 'w-12 h-12',
      lg: 'w-16 h-16',
      xl: 'w-20 h-20',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'

export { IconButton }
