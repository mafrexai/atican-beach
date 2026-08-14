'use client'
/* eslint-disable react-hooks/set-state-in-effect -- one-shot check of the return-from-checkout URL param after mount */

import { useCallback, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, differenceInDays } from 'date-fns'
import QRCode from 'react-qr-code'
import { CalendarDays, User, Mail, Phone, BedDouble, Tent, Sparkles, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'

interface Room {
  id: string
  room_number: string
  room_type: string
  price_per_night: number
  max_occupancy: number
  is_active: boolean
}

interface Tent {
  id: string
  tent_name: string
  price: number
  quantity_available: number
  is_active: boolean
}

interface Experience {
  id: string
  name: string
  price: number
  price_unit: string
  is_active: boolean
}

type ItemType = 'room' | 'tent' | 'experience'

interface SelectedItem {
  itemType: ItemType
  itemId: string
  name: string
  price: number
  quantity: number
}

export default function StaffBookPage() {
  const router = useRouter()

  // Form state
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [checkInDate, setCheckInDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [checkOutDate, setCheckOutDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [specialRequests, setSpecialRequests] = useState('')

  // Items state
  const [rooms, setRooms] = useState<Room[]>([])
  const [tents, setTents] = useState<Tent[]>([])
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [activeTab, setActiveTab] = useState<ItemType>('room')

  // UI state
  const [loading, setLoading] = useState(false)
  const [fetchingItems, setFetchingItems] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Payment state
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'processing' | 'paid'>('unpaid');
  const [checkoutQr, setCheckoutQr] = useState<{ reference: string; url: string } | null>(null)
  const [verifying, setVerifying] = useState(false)

  // Calculate number of nights for room pricing
  const numberOfNights = Math.max(1, differenceInDays(new Date(checkOutDate), new Date(checkInDate)))

  // Fetch available items
  useEffect(() => {
    async function fetchItems() {
      try {
        const response = await fetch('/api/staff/bookings', { cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load booking inventory')
        setRooms(data.rooms || [])
        setTents(data.tents || [])
        setExperiences(data.experiences || [])
      } catch (err) {
        console.error('Error fetching items:', err)
        setError('Failed to load available items')
      } finally {
        setFetchingItems(false)
      }
    }

    fetchItems()
  }, [])

  const verifyReference = useCallback(async (reference: string) => {
    setVerifying(true)
    setError('')
    try {
      const response = await fetch('/api/payments/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference }),
      })
      const data = await response.json()
      if (response.status === 409) { setError('Payment is still pending — ask the guest to complete checkout, then try again.'); return }
      if (!response.ok) throw new Error(data.error || 'Unable to verify payment.')
      setSuccess(`Payment confirmed and booking ${reference} has been marked as paid.`)
      setCheckoutQr(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to verify payment.')
    } finally {
      setVerifying(false)
    }
  }, [])

  // If the guest's own phone gets redirected back here after paying (it won't
  // land on the front desk's screen, but handle it just in case someone opens
  // the callback link directly).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const reference = params.get('verify')
    if (reference) {
      window.history.replaceState({}, '', window.location.pathname)
      void verifyReference(reference)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot check for the return-from-checkout redirect
  }, [])

  const addItem = (itemType: ItemType, item: Room | Tent | Experience) => {
    const exists = selectedItems.find((i) => i.itemType === itemType && i.itemId === item.id)
    if (exists) return

    const name = itemType === 'room'
      ? `${(item as Room).room_type} ${(item as Room).room_number}`
      : itemType === 'tent'
        ? (item as Tent).tent_name
        : (item as Experience).name

    const price = itemType === 'room'
      ? (item as Room).price_per_night
      : itemType === 'tent'
        ? (item as Tent).price
        : (item as Experience).price

    setSelectedItems([...selectedItems, {
      itemType,
      itemId: item.id,
      name,
      price,
      quantity: 1,
    }])
  }

  const removeItem = (itemType: ItemType, itemId: string) => {
    setSelectedItems(selectedItems.filter((i) => !(i.itemType === itemType && i.itemId === itemId)))
  }

  const updateQuantity = (itemType: ItemType, itemId: string, quantity: number) => {
    if (quantity < 1) return
    setSelectedItems(selectedItems.map((i) =>
      i.itemType === itemType && i.itemId === itemId ? { ...i, quantity } : i
    ))
  }

  const totalAmount = selectedItems.reduce((sum, item) => {
    // Rooms are priced per night, tents and experiences are one-time
    const itemTotal = item.itemType === 'room'
      ? item.price * numberOfNights * item.quantity
      : item.price * item.quantity
    return sum + itemTotal
  }, 0)

  // Creates the booking, then opens a MafrexPay checkout as a scan-to-pay QR
  // code so the front desk can turn the screen to the guest instead of the
  // guest needing to hand over a card or the desk navigating away.
  const handlePayment = async () => {
    if (!guestEmail) {
      setError('Guest email is required for payment');
      return;
    }
    if (totalAmount === 0) {
      setError('Please select at least one item');
      return;
    }
    setPaymentStatus('processing');
    setError('');
    setCheckoutQr(null)
    try {
      const booking = await createBooking('unpaid', false)
      const bookingReference = booking.reference
      const callbackUrl = `${window.location.origin}/staff/book?verify=${encodeURIComponent(bookingReference)}`

      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: guestEmail, bookingReference, callbackUrl }),
      });
      const data = await response.json();
      const authorizationUrl = data.data?.authorization_url || data.authorization_url
      if (data.success && authorizationUrl) {
        setCheckoutQr({ reference: bookingReference, url: authorizationUrl })
        setPaymentStatus('unpaid')
        setGuestName(''); setGuestEmail(''); setGuestPhone(''); setSpecialRequests('')
        setSelectedItems([])
      } else {
        throw new Error(data.error || 'Failed to initialize payment');
      }
    } catch (err: unknown) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setPaymentStatus('unpaid');
    }
  };

  const createBooking = async (paymentStatusValue: 'paid' | 'unpaid', resetAfter = true) => {
    const response = await fetch('/api/staff/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestName, guestEmail, guestPhone, checkInDate, checkOutDate, specialRequests,
        paymentStatus: paymentStatusValue,
        items: selectedItems.map(({ itemType, itemId, quantity }) => ({ itemType, itemId, quantity })) }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to create booking')
    if (resetAfter) {
      setSuccess(`Booking created successfully! Reference: ${data.booking.reference}`)
      setGuestName(''); setGuestEmail(''); setGuestPhone(''); setSpecialRequests('')
      setSelectedItems([]); setPaymentStatus('unpaid')
    }
    return data.booking as { booking_id: string; reference: string; total_amount: number }
  };

  const handleCreateBookingOnly = async () => {
    setLoading(true)
    try {
      await createBooking('unpaid')
    } catch (err: unknown) {
      console.error('Error creating booking:', err)
      setError(err instanceof Error ? err.message : 'Failed to create booking')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!guestName || !guestEmail) {
      setError('Guest name and email are required')
      return
    }

    if (selectedItems.length === 0) {
      setError('Please select at least one item')
      return
    }

    // Always trigger payment on form submit (Continue to Payment)
    await handlePayment()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Walk-in Booking</h1>
        <p className="text-gray-500 text-sm mt-1">Create a booking for walk-in guests</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {checkoutQr && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Scan to pay</h2>
          <p className="mb-4 text-sm text-gray-500">Turn the screen to the guest to scan with their phone and pay via MafrexPay. Reference: <span className="font-mono">{checkoutQr.reference}</span></p>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-4">
              <QRCode value={checkoutQr.url} size={160} />
            </div>
            <div className="flex flex-col gap-2">
              <a href={checkoutQr.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0A3D62] underline underline-offset-2 hover:text-[#08324f]">
                <ExternalLink className="h-3.5 w-3.5" /> Open checkout link
              </a>
              <button
                type="button"
                onClick={() => verifyReference(checkoutQr.reference)}
                disabled={verifying}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0A3D62] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#08324f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifying ? 'Checking…' : "I've collected payment — check status"}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Guest Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Guest Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Full Name *
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm text-gray-900"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 inline mr-1" />
                Email *
              </label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm text-gray-900"
                placeholder="john@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone
              </label>
              <input
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm text-gray-900"
                placeholder="+234 800 000 0000"
              />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <CalendarDays className="w-5 h-5 inline mr-2" />
            Stay Dates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date *</label>
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date *</label>
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                min={checkInDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm text-gray-900"
                required
              />
            </div>
          </div>
          {numberOfNights > 1 && (
            <p className="text-sm text-gray-500 mt-2">Stay duration: {numberOfNights} nights</p>
          )}
        </div>

        {/* Item Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Items</h2>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-200">
            {[
              { key: 'room' as ItemType, label: 'Rooms', icon: BedDouble },
              { key: 'tent' as ItemType, label: 'Tents', icon: Tent },
              { key: 'experience' as ItemType, label: 'Experiences', icon: Sparkles },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#0A3D62] text-[#0A3D62]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {fetchingItems ? (
            <div className="text-center py-8 text-gray-400">Loading items...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {activeTab === 'room' && rooms.map((room) => {
                const isSelected = selectedItems.some((i) => i.itemType === 'room' && i.itemId === room.id)
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => addItem('room', room)}
                    disabled={isSelected}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'bg-[#0A3D62]/10 border-[#0A3D62] opacity-50'
                        : 'border-gray-200 hover:border-[#0A3D62] hover:bg-gray-50'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">{room.room_type}</p>
                    <p className="text-xs text-gray-500">Room {room.room_number}</p>
                    <p className="text-sm font-semibold text-[#0A3D62] mt-1">₦{room.price_per_night.toLocaleString()}/night</p>
                    {numberOfNights > 1 && (
                      <p className="text-xs text-gray-500">{numberOfNights} nights = ₦{(room.price_per_night * numberOfNights).toLocaleString()}</p>
                    )}
                  </button>
                )
              })}
              {activeTab === 'tent' && tents.map((tent) => {
                const isSelected = selectedItems.some((i) => i.itemType === 'tent' && i.itemId === tent.id)
                return (
                  <button
                    key={tent.id}
                    type="button"
                    onClick={() => addItem('tent', tent)}
                    disabled={isSelected}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'bg-[#0A3D62]/10 border-[#0A3D62] opacity-50'
                        : 'border-gray-200 hover:border-[#0A3D62] hover:bg-gray-50'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">{tent.tent_name}</p>
                    <p className="text-xs text-gray-500">{tent.quantity_available} available</p>
                    <p className="text-sm font-semibold text-[#0A3D62] mt-1">₦{tent.price.toLocaleString()}</p>
                  </button>
                )
              })}
              {activeTab === 'experience' && experiences.map((exp) => {
                const isSelected = selectedItems.some((i) => i.itemType === 'experience' && i.itemId === exp.id)
                return (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => addItem('experience', exp)}
                    disabled={isSelected}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'bg-[#0A3D62]/10 border-[#0A3D62] opacity-50'
                        : 'border-gray-200 hover:border-[#0A3D62] hover:bg-gray-50'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">{exp.name}</p>
                    <p className="text-xs text-gray-500">{exp.price_unit}</p>
                    <p className="text-sm font-semibold text-[#0A3D62] mt-1">₦{exp.price.toLocaleString()}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected Items & Summary */}
        {selectedItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Selected Items</h2>
            <div className="space-y-3">
              {selectedItems.map((item) => (
                <div key={`${item.itemType}-${item.itemId}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{item.itemType}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.itemType !== 'room' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.itemType, item.itemId, item.quantity - 1)}
                          className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-sm hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.itemType, item.itemId, item.quantity + 1)}
                          className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-sm hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    )}
                    <p className="text-sm font-semibold text-gray-900">₦{(item.itemType === 'room' ? item.price * numberOfNights * item.quantity : item.price * item.quantity).toLocaleString()}</p>
                    <button
                      type="button"
                      onClick={() => removeItem(item.itemType, item.itemId)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
              <p className="text-lg font-semibold text-gray-900">Total</p>
              <div className="text-right">
                <p className="text-xl font-bold text-[#0A3D62]">₦{totalAmount.toLocaleString()}</p>
                {numberOfNights > 1 && (
                  <p className="text-xs text-gray-500">({numberOfNights} nights)</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Special Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Special Requests</h2>
          <textarea
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm text-gray-900"
            placeholder="Any special requests or notes..."
          />
        </div>


        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || paymentStatus === 'processing' || selectedItems.length === 0}
            className="px-6 py-2.5 bg-[#0A3D62] text-white rounded-lg hover:bg-[#082032] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {paymentStatus === 'processing' ? 'Processing...' : loading ? 'Creating...' : 'Create & Get Payment QR'}
          </button>
          {true && (
            <button
              type="button"
              onClick={handleCreateBookingOnly}
              disabled={loading || paymentStatus === 'processing'}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Create Without Payment'}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push('/staff/dashboard')}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
