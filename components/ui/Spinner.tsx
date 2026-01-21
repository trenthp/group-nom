'use client'

import { cn } from '@/lib/utils'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'white' | 'brand'
  className?: string
}

function Spinner({ size = 'md', variant = 'default', className }: SpinnerProps) {
  const sizeStyles = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }

  const variantStyles = {
    default: 'border-gray-300 border-t-gray-600',
    white: 'border-white/30 border-t-white',
    brand: 'border-orange-200 border-t-brand-primary',
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full',
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

// LoadingDots - Three bouncing dots for waiting states
export interface LoadingDotsProps {
  variant?: 'default' | 'white'
  className?: string
}

function LoadingDots({ variant = 'default', className }: LoadingDotsProps) {
  const dotVariant = variant === 'white' ? 'bg-white' : 'bg-gray-400'

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <div className={cn('w-3 h-3 rounded-full animate-pulse', dotVariant)} />
      <div className={cn('w-3 h-3 rounded-full animate-pulse delay-100', dotVariant)} />
      <div className={cn('w-3 h-3 rounded-full animate-pulse delay-200', dotVariant)} />
    </div>
  )
}

export { LoadingDots }
