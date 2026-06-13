'use client'

import { useEffect } from 'react'

export function PageLoadTracker() {
  useEffect(() => {
    // Track page load time for AI Concierge triggers
    sessionStorage.setItem('pageLoadTime', Date.now().toString())
  }, [])

  return null
}