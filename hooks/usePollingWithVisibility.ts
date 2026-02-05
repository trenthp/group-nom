'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

/** Maximum session duration: 60 minutes */
const MAX_SESSION_DURATION_MS = 60 * 60 * 1000

interface UsePollingWithVisibilityOptions {
  /** Polling interval in milliseconds */
  intervalMs: number
  /** Whether polling is enabled */
  enabled?: boolean
  /** Whether to poll immediately on mount/enable */
  immediate?: boolean
  /** Session start time (timestamp in ms). If provided, polling stops after 60 minutes. */
  sessionStartTime?: number
}

/**
 * A hook that polls at a given interval, but pauses when the tab is not visible.
 * Also stops polling after 60 minutes from session start to prevent stale sessions.
 */
export function usePollingWithVisibility(
  callback: () => Promise<void> | void,
  options: UsePollingWithVisibilityOptions
) {
  const { intervalMs, enabled = true, immediate = true, sessionStartTime } = options
  const [isExpired, setIsExpired] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isVisibleRef = useRef(true)
  const callbackRef = useRef(callback)

  // Keep callback ref updated
  callbackRef.current = callback

  // Check if session has expired (60 minute limit)
  const checkExpired = useCallback(() => {
    if (!sessionStartTime) return false
    const elapsed = Date.now() - sessionStartTime
    if (elapsed >= MAX_SESSION_DURATION_MS) {
      setIsExpired(true)
      return true
    }
    return false
  }, [sessionStartTime])

  const startPolling = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Don't poll if expired, disabled, or not visible
    if (checkExpired() || !enabled || !isVisibleRef.current) return

    intervalRef.current = setInterval(() => {
      // Check expiration on each poll
      if (checkExpired()) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        return
      }
      if (isVisibleRef.current) {
        callbackRef.current()
      }
    }, intervalMs)
  }, [intervalMs, enabled, checkExpired])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      stopPolling()
      return
    }

    // Handle visibility change
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible'

      if (isVisibleRef.current) {
        // Tab became visible - check expiration first
        if (checkExpired()) {
          stopPolling()
          return
        }
        // Poll immediately and restart interval
        callbackRef.current()
        startPolling()
      } else {
        // Tab became hidden - stop polling
        stopPolling()
      }
    }

    // Set initial visibility state
    isVisibleRef.current = document.visibilityState === 'visible'

    // Check if already expired
    if (checkExpired()) {
      return
    }

    // Add visibility listener
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Initial poll if immediate and visible
    if (immediate && isVisibleRef.current) {
      callbackRef.current()
    }

    // Start polling if visible
    if (isVisibleRef.current) {
      startPolling()
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      stopPolling()
    }
  }, [enabled, immediate, startPolling, stopPolling, checkExpired])

  return { stopPolling, isExpired }
}
