'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { Search, LogIn, LogOut, CheckCircle2, AlertCircle, User, Mail, CalendarDays, Clock } from 'lucide-react'

interface Booking {
  id: string
  booking_reference: string
  confirmation_code: string
  guest_name: string
  guest_email: string
  guest_phone: string | null
  total_amount: number
  status: string
  payment_status: string
  check_in_date: string | null
  check_out_date: string | null
  checked_in_at: string | null
  checked_out_at: string | null
  booking_type: string
  special_requests: string | null
}

export default function StaffCheckInPage() {
  const supabase = createClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Booking[]>([])
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Search for bookings
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a booking reference or email')
      return
    }

    setSearching(true)
    setError('')
    setSearchResults([])

    try {
      const query = searchQuery.trim()
      let result

      // Search by booking reference (format: AB-XXXXXX)
      if (query.toUpperCase().startsWith('AB-')) {
        const { data, error: searchError } = await supabase
          .from('bookings')
          .select('*')
          .ilike('booking_reference', query.toUpperCase())
          .single()

        if (searchError) throw searchError
        result = data ? [data] : []
      } else {
        // Search by email
        const { data, error: searchError } = await supabase
          .from('bookings')
          .select('*')
          .ilike('guest_email', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(10)

        if (searchError) throw searchError
        result = data || []
      }

      setSearchResults(result)

      if (result.length === 1) {
        setSelectedBooking(result[0])
      } else if (result.length === 0) {
        setError('No bookings found matching your search')
      }
    } catch (err: any) {
      console.error('Search error:', err)
      setError(err.message || 'Failed to search bookings')
    } finally {
      setSearching(false)
    }
  }

  // Check-in a booking
  const handleCheckIn = async (booking: Booking) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      // Update booking with checked_in_at
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          checked_in_at: new Date().toISOString(),
          status: 'confirmed',
        })
        .eq('id', booking.id)

      if (updateError) throw updateError

      // Log activity
      await supabase
        .from('booking_activity_log')
        .insert({
          booking_id: booking.id,
          user_id: session.user.id,
          action: 'checked_in',
          details: { checked_in_at: new Date().toISOString() },
        })

      setSuccess(`Checked in successfully! Guest: ${booking.guest_name}`)

      // Update local state
      setSelectedBooking({
        ...booking,
        checked_in_at: new Date().toISOString(),
        status: 'confirmed',
      })
    } catch (err: any) {
      console.error('Check-in error:', err)
      setError(err.message || 'Failed to check in')
    } finally {
      setLoading(false)
    }
  }

  // Check-out a booking
  const handleCheckOut = async (booking: Booking) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      // Update booking with checked_out_at
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          checked_out_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', booking.id)

      if (updateError) throw updateError

      // Log activity
      await supabase
        .from('booking_activity_log')
        .insert({
          booking_id: booking.id,
          user_id: session.user.id,
          action: 'checked_out',
          details: { checked_out_at: new Date().toISOString() },
        })

      setSuccess(`Checked out successfully! Guest: ${booking.guest_name}`)

      // Update local state
      setSelectedBooking({
        ...booking,
        checked_out_at: new Date().toISOString(),
        status: 'completed',
      })
    } catch (err: any) {
      console.error('Check-out error:', err)
      setError(err.message || 'Failed to check out')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (booking: Booking) => {
    if (booking.checked_out_at) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Checked Out</span>
    }
    if (booking.checked_in_at) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Checked In</span>
    }
    if (booking.status === 'confirmed') {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Confirmed</span>
    }
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Check-in / Check-out</h1>
        <p className="text-gray-500 text-sm mt-1">Look up bookings and manage guest check-in/out</p>
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

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <Search className="w-5 h-5 inline mr-2" />
          Find Booking
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm"
            placeholder="Enter booking reference (AB-XXXXXX) or guest email"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-5 py-2 bg-[#0A3D62] text-white rounded-lg hover:bg-[#082032] transition-colors text-sm font-medium disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Search Results (multiple) */}
      {searchResults.length > 1 && !selectedBooking && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Search Results</h2>
            <p className="text-sm text-gray-500">{searchResults.length} bookings found</p>
          </div>
          <div className="divide-y divide-gray-50">
            {searchResults.map((booking) => (
              <button
                key={booking.id}
                onClick={() => setSelectedBooking(booking)}
                className="w-full px-5 py-3 hover:bg-gray-50 text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{booking.guest_name}</p>
                    <p className="text-xs text-gray-500">{booking.guest_email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-[#0A3D62]">{booking.booking_reference}</p>
                    {getStatusBadge(booking)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Booking Details */}
      {selectedBooking && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Booking Details</h2>
            <button
              onClick={() => {
                setSelectedBooking(null)
                setSearchResults([])
                setSearchQuery('')
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Guest Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0A3D62]/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-[#0A3D62]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedBooking.guest_name}</p>
                  <p className="text-xs text-gray-500">Guest Name</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0A3D62]/10 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[#0A3D62]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedBooking.guest_email}</p>
                  <p className="text-xs text-gray-500">Email</p>
                </div>
              </div>
            </div>

            {/* Booking Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Reference</p>
                <p className="text-sm font-mono font-semibold text-[#0A3D62]">{selectedBooking.booking_reference}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <div className="mt-1">{getStatusBadge(selectedBooking)}</div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Check-in Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedBooking.check_in_date ? format(parseISO(selectedBooking.check_in_date), 'MMM d, yyyy') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Check-out Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedBooking.check_out_date ? format(parseISO(selectedBooking.check_out_date), 'MMM d, yyyy') : '—'}
                </p>
              </div>
            </div>

            {/* Check-in/out Times */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Checked In At</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedBooking.checked_in_at
                    ? format(parseISO(selectedBooking.checked_in_at), 'MMM d, yyyy h:mm a')
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Checked Out At</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedBooking.checked_out_at
                    ? format(parseISO(selectedBooking.checked_out_at), 'MMM d, yyyy h:mm a')
                    : '—'}
                </p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Booking Type</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{selectedBooking.booking_type.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Payment Status</p>
                <p className={`text-sm font-medium ${selectedBooking.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {selectedBooking.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="text-sm font-semibold text-gray-900">₦{selectedBooking.total_amount?.toLocaleString()}</p>
              </div>
            </div>

            {selectedBooking.special_requests && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">Special Requests</p>
                <p className="text-sm text-gray-700 mt-1">{selectedBooking.special_requests}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              {!selectedBooking.checked_in_at && !selectedBooking.checked_out_at && (
                <button
                  onClick={() => handleCheckIn(selectedBooking)}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? 'Processing...' : 'Check In'}
                </button>
              )}
              {selectedBooking.checked_in_at && !selectedBooking.checked_out_at && (
                <button
                  onClick={() => handleCheckOut(selectedBooking)}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  {loading ? 'Processing...' : 'Check Out'}
                </button>
              )}
              {selectedBooking.checked_out_at && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Stay Completed
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}