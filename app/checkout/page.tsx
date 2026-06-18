'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { CreditCard, Loader2, AlertCircle, Info, CheckCircle, Trash2 } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { useAuth } from '@/hooks/useAuth'

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0A3D62] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading checkout...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, authResolved } = useAuth()
  const items = useCartStore((s) => s.items)
  const getTotal = useCartStore((s) => s.getTotal)
  const clearCart = useCartStore((s) => s.clearCart)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialRequests: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paystackConfigured, setPaystackConfigured] = useState<boolean | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null)

  // Redirect to login if not authenticated — only after auth has fully resolved
  useEffect(() => {
    if (authResolved && !user) {
      const redirect = searchParams.toString()
      const loginUrl = `/login?redirect=/checkout${redirect ? '&' + redirect : ''}`
      router.push(loginUrl)
    }
  }, [authResolved, user, router, searchParams])

  // Pre-fill form with user data
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: user.email || prev.email,
        name: user.full_name || prev.name,
      }))
    }
  }, [user])

  const total = getTotal()

  // Check if Paystack is configured on mount
  useEffect(() => {
    const checkPaystackConfig = async () => {
      try {
        const res = await fetch('/api/paystack/status')
        const data = await res.json()
        setPaystackConfigured(data.configured === true)
      } catch {
        setPaystackConfigured(false)
      }
    }
    checkPaystackConfig()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Debug: log auth state
    console.log('[Checkout] User:', user?.email, 'ID:', user?.id)

    if (!user) {
      setError('Please log in to complete your booking')
      setLoading(false)
      return
    }

    try {
      // Step 1: Create booking first
      const bookingRes = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          guestInfo: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            specialRequests: formData.specialRequests,
          },
          items: items.map((item) => ({
            id: item.id,
            type: item.type,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            metadata: item.metadata,
          })),
          totalAmount: total,
        }),
      })

      const bookingData = await bookingRes.json()

      if (!bookingData.success) {
        throw new Error(bookingData.error || 'Failed to create booking')
      }

      const bookingRef = bookingData.data.reference

      // Step 2: If Paystack is not configured, show success message
      if (paystackConfigured === false) {
        setBookingSuccess(bookingRef)
        clearCart()
        setLoading(false)
        return
      }

      // Step 3: Initialize Paystack payment
      const paystackRes = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          amount: total,
          bookingReference: bookingRef,
          callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/booking/confirmation?ref=${bookingRef}`,
        }),
      })

      const paystackData = await paystackRes.json()

      if (!paystackData.success) {
        throw new Error(paystackData.error || 'Payment initialization failed')
      }

      // Step 4: Update booking payment status before redirecting
      await fetch('/api/bookings/update-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bookingReference: bookingRef,
          paymentStatus: 'paid',
          status: 'confirmed',
        }),
      })

      // Step 5: Redirect to Paystack payment page
      window.location.href = paystackData.data.authorization_url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  // Empty cart state
  if (items.length === 0 && !bookingSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#082032] mb-4">Your cart is empty</h1>
          <button
            onClick={() => router.push('/')}
            className="bg-[#0A3D62] text-white px-6 py-3 rounded-lg hover:bg-[#08324f] transition-colors"
          >
            Browse Rooms & Services
          </button>
        </div>
      </div>
    )
  }

  // Booking success state (offline payment)
  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] py-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#082032] mb-2">Booking Created!</h1>
          <p className="text-gray-600 mb-4">
            Your booking reference is: <strong>{bookingSuccess}</strong>
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Our team will contact you shortly to arrange payment. Please keep your booking reference for reference.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-[#0A3D62] text-white px-6 py-3 rounded-lg hover:bg-[#08324f] transition-colors"
          >
            Return to Home
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] py-12">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-[#0A3D62] to-[#F97316] p-6 text-white">
            <h1 className="text-2xl font-bold">Complete Your Booking</h1>
            <p className="text-blue-100 mt-1">Review your items and provide guest details</p>
          </div>

          <div className="p-6">
            {/* Order Summary */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#082032] mb-4">Order Summary</h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-[#F5F1E8] rounded-lg">
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-[#082032]">{item.name}</p>
                          <p className="text-sm text-gray-500">{item.type.replace('_', ' ')} × {item.quantity}</p>
                          {item.metadata.checkIn && item.metadata.checkOut && (
                            <p className="text-xs text-gray-400">{item.metadata.checkIn} → {item.metadata.checkOut}</p>
                          )}
                        </div>
                        <p className="font-semibold text-[#0A3D62]">₦{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={clearCart}
                className="mt-3 text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Items
              </button>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-lg font-semibold text-[#082032]">Total</span>
                <span className="text-2xl font-bold text-[#0A3D62]">₦{total.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Status Notice */}
            {paystackConfigured === false && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-800 font-medium">Payment System Not Configured</p>
                    <p className="text-amber-700 text-sm mt-1">
                      Online payments are currently unavailable. Please complete your booking and our team will contact you for alternative payment arrangements.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Guest Details Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-lg font-semibold text-[#082032]">Guest Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-gray-900 placeholder:text-gray-400"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-gray-900 placeholder:text-gray-400"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-gray-900 placeholder:text-gray-400"
                    placeholder="+234 800 000 0000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                <textarea
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-gray-900 placeholder:text-gray-400"
                  placeholder="Any special requests or preferences..."
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0A3D62] text-white py-4 rounded-lg font-semibold text-lg hover:bg-[#08324f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : paystackConfigured === false ? (
                  <>
                    <Info className="w-5 h-5" />
                    Complete Booking (Payment Offline)
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pay ₦{total.toLocaleString()} with Paystack
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                {paystackConfigured === false
                  ? 'Your booking will be created. Our team will contact you for payment arrangements.'
                  : 'Secure payment powered by Paystack. You will be redirected to complete payment.'
                }
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}