'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowRight, BadgeCheck, Sparkles, Tag, X } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'

interface Recommendation {
  id: string
  source: 'manager_offer' | 'catalog_recommendation'
  type: 'room' | 'experience' | 'tent' | 'event_space' | 'public_event'
  title: string
  description: string
  itemName: string
  originalPrice: number
  offerPrice: number
  ctaText: string
  ctaLink: string
  expiresAt: string | null
}

export function AIConcierge() {
  const pathname = usePathname()
  const router = useRouter()
  const items = useCartStore((state) => state.items)
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [visible, setVisible] = useState(false)
  const cartTypes = useMemo(() => [...new Set(items.map((item) => item.type))].join(','), [items])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const query = new URLSearchParams({ page: pathname, cart: cartTypes })
        const response = await fetch(`/api/ai/concierge?${query}`, { cache: 'no-store', signal: controller.signal })
        if (!response.ok) return
        const data = await response.json()
        const next = data.recommendation as Recommendation | null
        if (!next) return
        const dismissed = JSON.parse(sessionStorage.getItem('concierge-dismissed') || '[]') as string[]
        if (dismissed.includes(next.id)) return
        setRecommendation(next)
        setVisible(true)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) console.error('[Concierge] Unable to load recommendation:', error)
      }
    }, 3500)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [pathname, cartTypes])

  function dismiss() {
    if (recommendation) {
      const dismissed = JSON.parse(sessionStorage.getItem('concierge-dismissed') || '[]') as string[]
      sessionStorage.setItem('concierge-dismissed', JSON.stringify([...new Set([...dismissed, recommendation.id])]))
    }
    setVisible(false)
  }

  function accept() {
    if (!recommendation) return
    setVisible(false)
    router.push(recommendation.ctaLink)
  }

  if (!recommendation) return null
  const hasDiscount = recommendation.source === 'manager_offer' && recommendation.offerPrice < recommendation.originalPrice

  return (
    <AnimatePresence>
      {visible && <motion.aside initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }} transition={{ type: 'spring', damping: 26, stiffness: 280 }} className="fixed bottom-16 right-2 z-40 w-[calc(100vw-1rem)] max-w-[360px] sm:bottom-20 sm:right-6" aria-label="Concierge recommendation">
        <div className="overflow-hidden rounded-2xl border border-[#D4AF37]/70 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-[#D4AF37] to-[#f2cc56] px-4 py-2 text-[#082032]"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /><span className="text-sm font-bold">Atican Concierge</span></div><button onClick={dismiss} aria-label="Dismiss recommendation" className="rounded p-1 hover:bg-black/5"><X className="h-4 w-4" /></button></div>
          <div className="p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700"><BadgeCheck className="h-4 w-4" />{recommendation.source === 'manager_offer' ? 'Manager-approved offer' : 'Live resort recommendation'}</div>
            <h2 className="mt-2 text-lg font-bold leading-tight text-[#082032]">{recommendation.title}</h2>
            <p className="mt-1 text-xs font-medium text-[#F97316]">{recommendation.itemName}</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">{recommendation.description}</p>
            <div className="mt-3 flex items-center gap-2">
              {hasDiscount && <span className="text-xs text-gray-400 line-through">₦{recommendation.originalPrice.toLocaleString()}</span>}
              <span className="text-lg font-bold text-[#082032]">₦{recommendation.offerPrice.toLocaleString()}</span>
              {hasDiscount && <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold text-green-700"><Tag className="h-3 w-3" />Save ₦{(recommendation.originalPrice - recommendation.offerPrice).toLocaleString()}</span>}
            </div>
            {recommendation.expiresAt && <p className="mt-2 text-[10px] text-gray-400">Available until {new Date(recommendation.expiresAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
            <div className="mt-4 flex gap-2"><button onClick={accept} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#F97316] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#e0650f]">{recommendation.ctaText}<ArrowRight className="h-4 w-4" /></button><button onClick={dismiss} className="rounded-lg border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-50">Not now</button></div>
          </div>
        </div>
      </motion.aside>}
    </AnimatePresence>
  )
}
