'use client'

import { useEffect, useRef, useState, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

export function BottomSheet({ isOpen, onClose, children, className }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const startY = useRef(0)

  // Handle open/close with animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      // Small delay to trigger CSS transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true)
        })
      })
    } else {
      setIsAnimating(false)
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

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

  // Prevent body scroll when open
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

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const currentY = e.touches[0].clientY
    const diff = currentY - startY.current
    // Only allow dragging down
    if (diff > 0) {
      setDragOffset(diff)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    // If dragged more than 100px, close the sheet
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

  // Use portal to render at document body level to avoid stacking context issues
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/60 transition-opacity duration-300',
          isAnimating ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-[#333333] rounded-t-2xl overflow-hidden',
          className
        )}
        style={{
          maxHeight: '85vh',
          transform: dragOffset > 0
            ? `translateY(${dragOffset}px)`
            : isAnimating
              ? 'translateY(0)'
              : 'translateY(100%)',
          transition: isDragging ? 'none' : 'transform 300ms ease-out',
        }}
      >
        {/* Header with Drag Handle and Close Button */}
        <div
          className="sticky top-0 z-10 bg-[#333333] pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
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
