'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Crown, Gift,
  X, ArrowRight, Star, Tag, Clock, TrendingUp,
} from 'lucide-react'

interface UpsellOffer {
  id: string
  title: string
  description: string
  originalPrice: number
  offerPrice: number
  savings: number
  icon: React.ReactNode
  ctaText: string
  ctaLink: string
  timer?: number
}

export function AIConcierge() {
  const [currentOffer, setCurrentOffer] = useState<UpsellOffer | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [dismissedOffers, setDismissedOffers] = useState<string[]>([])
  const [timer, setTimer] = useState<number | null>(null)

  const showOffer = useCallback((offer: UpsellOffer) => {
    setCurrentOffer(offer)
    setIsVisible(true)
    if (offer.timer) setTimer(offer.timer)

    // Auto-dismiss after 20 seconds
    setTimeout(() => {
      setIsVisible(false)
    }, 20000)
  }, [])

  // Smart triggers based on user behavior
  useEffect(() => {
    if (dismissedOffers.length > 3) return

    const path = window.location.pathname

    // Trigger: Views rooms page
    if (path === '/rooms' && !dismissedOffers.includes('suite-upgrade')) {
      const timeout = setTimeout(() => {
        showOffer({
          id: 'suite-upgrade',
          title: '✨ Upgrade to Presidential Suite',
          description: 'Experience our 7-star Presidential Suite with private butler, ocean views, and private pool.',
          originalPrice: 500000,
          offerPrice: 450000,
          savings: 50000,
          icon: <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4AF37]" />,
          ctaText: 'View Suite',
          ctaLink: '/rooms',
          timer: 15,
        })
      }, 5000)
      return () => clearTimeout(timeout)
    }

    // Trigger: On experiences page
    if (path === '/experiences' && !dismissedOffers.includes('bundle')) {
      const timeout = setTimeout(() => {
        showOffer({
          id: 'bundle',
          title: '🎯 Experience Bundle Deal',
          description: 'Book Bonfire + Sack Race + Beach Ball for ₦40,000 (save ₦5,000).',
          originalPrice: 45000,
          offerPrice: 40000,
          savings: 5000,
          icon: <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4AF37]" />,
          ctaText: 'Add Bundle',
          ctaLink: '/experiences',
          timer: 10,
        })
      }, 4000)
      return () => clearTimeout(timeout)
    }

    // Trigger: On page for 30+ seconds
    const pageLoadTime = sessionStorage.getItem('pageLoadTime')
    if (pageLoadTime && !dismissedOffers.includes('lingering')) {
      const timeOnPage = (Date.now() - parseInt(pageLoadTime)) / 1000
      if (timeOnPage > 30) {
        showOffer({
          id: 'lingering',
          title: '💎 Special Offer Just For You',
          description: 'Book within the next 10 minutes and receive a complimentary beachside dinner for two (₦45,000 value).',
          originalPrice: 0,
          offerPrice: 0,
          savings: 45000,
          icon: <Star className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4AF37]" />,
          ctaText: 'Claim Offer',
          ctaLink: '/rooms',
          timer: 10,
        })
      }
    }

    // Trigger: Cart has items (check localStorage)
    const cart = localStorage.getItem('atican-cart')
    if (cart && !dismissedOffers.includes('cart-experience')) {
      try {
        const cartData = JSON.parse(cart)
        if (cartData?.items?.length > 0) {
          const timeout = setTimeout(() => {
            showOffer({
              id: 'cart-experience',
              title: '🎉 Add an Experience!',
              description: 'Enhance your stay with a Bonfire night experience. Add to your booking for just ₦30,000.',
              originalPrice: 30000,
              offerPrice: 25000,
              savings: 5000,
              icon: <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#F97316]" />,
              ctaText: 'Add Experience',
              ctaLink: '/experiences',
              timer: 10,
            })
          }, 3000)
          return () => clearTimeout(timeout)
        }
      } catch {
        // Invalid cart data
      }
    }
  }, [dismissedOffers, showOffer])

  // Timer countdown
  useEffect(() => {
    if (timer && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => (prev && prev > 0 ? prev - 1 : null))
      }, 60000)
      return () => clearInterval(interval)
    }
  }, [timer])

  const handleDismiss = () => {
    if (currentOffer) {
      setDismissedOffers(prev => [...prev, currentOffer.id])
      const dismissed = JSON.parse(localStorage.getItem('dismissedOffers') || '[]')
      localStorage.setItem('dismissedOffers', JSON.stringify([...dismissed, currentOffer.id]))
    }
    setIsVisible(false)
    setCurrentOffer(null)
    setTimer(null)
  }

  const handleAccept = () => {
    if (currentOffer) {
      window.location.href = currentOffer.ctaLink
    }
  }

  if (!currentOffer) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-16 right-2 sm:bottom-20 sm:right-6 z-40 w-[calc(100vw-1rem)] sm:w-[340px] max-w-[380px]"
        >
          <div className="bg-white rounded-xl shadow-2xl border-2 border-[#D4AF37] overflow-hidden">
            {/* Premium Badge */}
            <div className="bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-[#082032] px-3 sm:px-4 py-1.5 sm:py-2 flex justify-between items-center">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold truncate">AI Concierge • Premium</span>
              </div>
              <button onClick={handleDismiss} className="hover:opacity-70 transition-opacity shrink-0 p-0.5">
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Offer Content */}
            <div className="p-3 sm:p-4">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <div className="bg-[#F5F1E8] p-2 sm:p-2.5 rounded-full shrink-0">
                  {currentOffer.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#0A3D62] text-xs sm:text-sm leading-tight">{currentOffer.title}</h3>
                  <p className="text-[11px] sm:text-xs text-gray-600 mt-1 leading-relaxed">{currentOffer.description}</p>

                  {/* Pricing */}
                  {currentOffer.savings > 0 && (
                    <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      {currentOffer.originalPrice > 0 && (
                        <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                          ₦{currentOffer.originalPrice.toLocaleString()}
                        </span>
                      )}
                      {currentOffer.offerPrice > 0 && (
                        <span className="text-sm sm:text-base font-bold text-[#F97316]">
                          ₦{currentOffer.offerPrice.toLocaleString()}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] bg-green-100 text-green-700 px-1 sm:px-1.5 py-0.5 rounded-full font-medium">
                        <Tag className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                        Save ₦{currentOffer.savings.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Timer */}
                  {timer && timer > 0 && (
                    <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-500 mt-1 sm:mt-1.5">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span>Expires in {timer} min{timer !== 1 ? 's' : ''}</span>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-1.5 sm:gap-2 mt-2.5 sm:mt-3">
                    <button
                      onClick={handleAccept}
                      className="flex-1 bg-[#F97316] text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-[#e0650f] transition flex items-center justify-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold"
                    >
                      {currentOffer.ctaText}
                      <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-[11px] sm:text-xs text-gray-600"
                    >
                      No thanks
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}