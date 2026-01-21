'use client'

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
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
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      hover:scale-110 active:scale-95
    `

    const variantStyles = {
      positive: `
        bg-action-positive text-white
        hover:bg-action-positive-hover
        focus-visible:ring-green-500
        shadow-lg hover:shadow-xl
      `,
      negative: `
        bg-action-negative text-white
        hover:bg-action-negative-hover
        focus-visible:ring-red-500
        shadow-lg hover:shadow-xl
      `,
      neutral: `
        bg-gray-100 text-gray-700
        hover:bg-gray-200
        focus-visible:ring-gray-500
        shadow-md hover:shadow-lg
      `,
      ghost: `
        bg-transparent text-gray-600
        hover:bg-gray-100 hover:text-gray-900
        focus-visible:ring-gray-500
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
