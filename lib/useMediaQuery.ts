'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * True when the viewport matches a media query. False on the server and
 * during hydration, so phone-first markup renders first and desktop
 * layouts switch in on the client (the same order Tailwind's breakpoints
 * apply in CSS).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    [query]
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}

/** Tailwind's `lg` breakpoint: where Library and Discover go two-column. */
export const DESKTOP_QUERY = '(min-width: 1024px)'
