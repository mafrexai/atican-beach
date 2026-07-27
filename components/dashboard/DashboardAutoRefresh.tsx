'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardAutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
        window.dispatchEvent(new Event('atican:dashboard-refresh'))
      }
    }

    const timer = window.setInterval(refresh, intervalMs)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [intervalMs, router])

  return null
}
