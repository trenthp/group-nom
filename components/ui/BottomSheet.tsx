'use client'

import { useEffect, useRef, useState, useSyncExternalStore, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

function subscribeToReducedMotion(callback: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  )
}

export interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  /** Accessible name for the sheet dialog. */
  ariaLabel?: string
  className?: string
}

export function BottomSheet({ isOpen, onClose, children, ariaLabel, className }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const reduceMotion = useReducedMotion()
  const startY = useRef(0)

  // Handle open/close with animation. State updates are scheduled via rAF /
  // timeout (never synchronously in the effect body) so the closed transform
  // paints before the open transition starts.
  useEffect(() => {
    let raf = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    if (isOpen) {
      raf = requestAnimationFrame(() => {
        setIsVisible(true)
        raf = requestAnimationFrame(() => {
          raf = requestAnimationFrame(() => setIsAnimating(true))
        })
      })
    } else {
      raf = requestAnimationFrame(() => setIsAnimating(false))
      timer = setTimeout(() => setIsVisible(false), reduceMotion ? 0 : 300)
    }
    return () => {
      cancelAnimationFrame(raf)
      if (timer) clearTimeout(timer)
    }
  }, [isOpen, reduceMotion])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Move focus into the sheet on open; restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null
      sheetRef.current?.focus()
      return () => {
        previousFocusRef.current?.focus?.()
      }
    }
  }, [isOpen])

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0) {
      setDragOffset(diff)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    if (dragOffset > 100) {
      onClose()
    }
    setDragOffset(0)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    startY.current = e.clientY
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const diff = e.clientY - startY.current
    if (diff > 0) {
      setDragOffset(diff)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    if (dragOffset > 100) {
      onClose()
    }
    setDragOffset(0)
  }

  if (!isVisible) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/60 transition-opacity duration-300 motion-reduce:transition-none',
          isAnimating ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          'absolute bottom-0 left-0 right-0 mx-auto max-w-lg bg-surface-card rounded-t-2xl overflow-hidden focus:outline-none',
          className
        )}
        style={{
          maxHeight: '85vh',
          transform: dragOffset > 0
            ? `translateY(${dragOffset}px)`
            : isAnimating
              ? 'translateY(0)'
              : 'translateY(100%)',
          transition: isDragging || reduceMotion ? 'none' : 'transform 300ms ease-out',
        }}
      >
        {/* Header with drag handle and close button */}
        <div
          className="sticky top-0 z-10 bg-surface-card pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div aria-hidden="true" className="w-10 h-1 bg-white/20 rounded-full mx-auto" />

          <button
            onClick={onClose}
            className="absolute top-2 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 44px)' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-white/60"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
