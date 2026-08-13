'use client'

import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** default: Dark Ember field. glass: Sunset Glass session-mode field. */
  variant?: 'default' | 'glass'
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = 'default', leftIcon, rightIcon, error, ...props }, ref) => {
    const errorId = useId()

    const variantStyles = {
      default: `
        rounded-card
        bg-white/10 text-white
        border border-white/20
        focus:border-brand focus:ring-2 focus:ring-brand/30
        placeholder-white/50
      `,
      glass: `
        rounded-pill
        bg-white/95 text-gray-800
        border border-transparent
        focus:ring-2 focus:ring-white/60
        placeholder-gray-500
        shadow-inner
      `,
    }

    return (
      <div className="relative">
        {leftIcon && (
          <div
            aria-hidden="true"
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2',
              variant === 'default' ? 'text-white/50' : 'text-gray-400'
            )}
          >
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            `
            w-full px-4 py-3
            text-base
            transition-all duration-150
            focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            `,
            variantStyles[variant],
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-400/30',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div
            aria-hidden="true"
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2',
              variant === 'default' ? 'text-white/50' : 'text-gray-400'
            )}
          >
            {rightIcon}
          </div>
        )}
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
