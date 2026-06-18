'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, addDays } from 'date-fns'
import { CalendarDays, User, Mail, Phone, BedDouble, Tent, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'

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
  const supabase = createClient()

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

  // Fetch available items
  useEffect(() => {
    async function fetchItems() {
      try {
        const [roomsRes, tentsRes, experiencesRes] = await Promise.all([
          supabase.from('rooms').select('*').eq('is_active', true).order('room_number'),
          supabase.from('tents').select('*').eq('is_active', true).order('tent_name'),
          supabase.from('experiences').select('*').eq('is_active', true).order('name'),
        ])

        if (roomsRes.data) setRooms(roomsRes.data)
        if (tentsRes.data) setTents(tentsRes.data)
        if (experiencesRes.data) setExperiences(experiencesRes.data)
      } catch (err) {
        console.error('Error fetching items:', err)
        setError('Failed to load available items')
      } finally {
        setFetchingItems(false)
      }
    }

    fetchItems()
  }, [supabase])

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

  const totalAmount = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const generateReference = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = 'AB-'
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
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

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      const bookingReference = generateReference()
      const confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          booking_reference: bookingReference,
          confirmation_code: confirmationCode,
          user_id: session.user.id,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone || null,
          total_amount: totalAmount,
          status: 'confirmed',
          payment_status: 'unpaid',
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          special_requests: specialRequests || null,
          created_by: session.user.id,
          booking_type: 'walk_in',
        })
        .select()
        .single()

      if (bookingError) throw bookingError

      // Create booking items
      const bookingItems = selectedItems.map((item) => ({
        booking_id: booking.id,
        item_type: item.itemType,
        item_id: item.itemId,
        quantity: item.quantity,
        price_at_booking: item.price,
        start_date: checkInDate,
        end_date: checkOutDate,
      }))

      const { error: itemsError } = await supabase
        .from('booking_items')
        .insert(bookingItems)

      if (itemsError) throw itemsError

      // Log activity
      await supabase
        .from('booking_activity_log')
        .insert({
          booking_id: booking.id,
          user_id: session.user.id,
          action: 'walk_in_booking_created',
          details: { total_amount: totalAmount, items: selectedItems.length },
        })

      setSuccess(`Booking created successfully! Reference: ${bookingReference}`)

      // Reset form
      setGuestName('')
      setGuestEmail('')
      setGuestPhone('')
      setSpecialRequests('')
      setSelectedItems([])
    } catch (err: any) {
      console.error('Error creating booking:', err)
      setError(err.message || 'Failed to create booking')
    } finally {
      setLoading(false)
    }
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm"
                required
              />
            </div>
          </div>
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
                    {item.itemType === 'room' && (
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
                    <p className="text-sm font-semibold text-gray-900">₦{(item.price * item.quantity).toLocaleString()}</p>
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
              <p className="text-xl font-bold text-[#0A3D62]">₦{totalAmount.toLocaleString()}</p>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm"
            placeholder="Any special requests or notes..."
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || selectedItems.length === 0}
            className="px-6 py-2.5 bg-[#0A3D62] text-white rounded-lg hover:bg-[#082032] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Booking...' : 'Create Walk-in Booking'}
          </button>
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