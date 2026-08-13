'use client'

import { forwardRef, SelectHTMLAttributes, useId } from 'react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[]
  placeholder?: string
  /** default: Dark Ember field. glass: Sunset Glass session-mode field. */
  variant?: 'default' | 'glass'
  error?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, variant = 'default', error, ...props }, ref) => {
    const errorId = useId()

    const variantStyles = {
      default: `
        rounded-card
        bg-white/10 text-white
        border border-white/20
        focus:border-brand focus:ring-2 focus:ring-brand/30
      `,
      glass: `
        rounded-pill
        bg-white/95 text-gray-800
        border border-transparent
        focus:ring-2 focus:ring-white/60
        shadow-inner
      `,
    }

    return (
      <div className="relative">
        <select
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            `
            w-full px-4 py-3 pr-10
            text-base
            appearance-none
            transition-all duration-150
            focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            `,
            variantStyles[variant],
            error && 'border-red-400 focus:border-red-400 focus:ring-red-400/30',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="text-gray-800">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="text-gray-800"
            >
              {option.label}
            </option>
          ))}
        </select>
        <div aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <svg
            className={cn('w-4 h-4', variant === 'default' ? 'text-white/50' : 'text-gray-400')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Select }
