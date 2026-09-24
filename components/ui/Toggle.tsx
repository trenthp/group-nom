'use client'

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean
  onPressedChange?: (pressed: boolean) => void
  children: ReactNode
  size?: 'sm' | 'md'
}

const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, pressed = false, onPressedChange, children, size = 'md', ...props }, ref) => {
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={pressed}
        onClick={() => onPressedChange?.(!pressed)}
        className={cn(
          `
          inline-flex items-center justify-center gap-2
          font-semibold rounded-pill
          transition-all duration-200 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page
          motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]
          `,
          pressed
            ? 'bg-brand text-white focus-visible:ring-brand'
            : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white focus-visible:ring-white/60',
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Toggle.displayName = 'Toggle'

export { Toggle }

// ToggleGroup - mutually exclusive options (e.g. list/map view switch)
export interface ToggleGroupProps {
  children: ReactNode
  /** Accessible name for the group of options. */
  ariaLabel: string
  className?: string
}

function ToggleGroup({ children, ariaLabel, className }: ToggleGroupProps) {
  return (
    <div
      className={cn('inline-flex gap-1 p-1 bg-white/10 rounded-pill', className)}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  )
}

export { ToggleGroup }

export interface ToggleGroupItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  value: string
  selected?: boolean
  onValueSelect?: (value: string) => void
  children: ReactNode
}

const ToggleGroupItem = forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, value, selected = false, onValueSelect, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => onValueSelect?.(value)}
        className={cn(
          `
          px-4 py-2 rounded-pill
          text-sm font-semibold
          transition-all duration-200 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60
          `,
          selected
            ? 'bg-brand text-white shadow-sm'
            : 'text-white/60 hover:text-white hover:bg-white/5',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

ToggleGroupItem.displayName = 'ToggleGroupItem'

export { ToggleGroupItem }
