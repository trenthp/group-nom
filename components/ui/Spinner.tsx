'use client'

import { cn } from '@/lib/utils'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  /** brand (default): the app's #EA4D19 ring. white/muted for busy surfaces. */
  variant?: 'brand' | 'white' | 'muted'
  className?: string
}

function Spinner({ size = 'md', variant = 'brand', className }: SpinnerProps) {
  const sizeStyles = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
  }

  const variantStyles = {
    brand: 'border-brand border-t-transparent',
    white: 'border-white/30 border-t-white',
    muted: 'border-white/20 border-t-white/60',
  }

  return (
    <div
      className={cn(
        'motion-safe:animate-spin rounded-full',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export { Spinner }

// LoadingDots - three pulsing dots for waiting states
export interface LoadingDotsProps {
  variant?: 'default' | 'white'
  className?: string
}

function LoadingDots({ variant = 'default', className }: LoadingDotsProps) {
  const dotVariant = variant === 'white' ? 'bg-white' : 'bg-white/60'

  return (
    <div className={cn('flex items-center justify-center gap-2', className)} role="status" aria-label="Loading">
      <div className={cn('w-3 h-3 rounded-full motion-safe:animate-pulse', dotVariant)} />
      <div
        className={cn('w-3 h-3 rounded-full motion-safe:animate-pulse', dotVariant)}
        style={{ animationDelay: '150ms' }}
      />
      <div
        className={cn('w-3 h-3 rounded-full motion-safe:animate-pulse', dotVariant)}
        style={{ animationDelay: '300ms' }}
      />
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export { LoadingDots }
