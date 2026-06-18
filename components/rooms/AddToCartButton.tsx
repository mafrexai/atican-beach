'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Calendar } from 'lucide-react'
import { useCartStore, type CartItem } from '@/stores/cartStore'
import { DatePicker } from '@/components/ui/DatePicker'
import type { Room } from '@/types/database'
import toast from 'react-hot-toast'

interface AddToCartButtonProps {
  room: Room
}

export function AddToCartButton({ room }: AddToCartButtonProps) {
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)

  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const totalPrice = nights * room.price_per_night

  const handleAddToCart = () => {
    if (!checkIn || !checkOut) {
      toast.error('Please select check-in and check-out dates')
      return
    }
    if (nights <= 0) {
      toast.error('Check-out must be after check-in')
      return
    }

    const item: CartItem = {
      id: room.id,
      type: 'room',
      name: `${room.room_type} — Room ${room.room_number}`,
      price: room.price_per_night,
      quantity: nights,
      metadata: {
        checkIn,
        checkOut,
        guests,
        roomNumber: room.room_number,
        roomType: room.room_type,
      },
    }

    addItem(item)
    toast.success(`${room.room_type} added to cart!`)
  }

  const handleBookNow = () => {
    handleAddToCart()
    router.push('/checkout')
  }

  return (
    <div className="space-y-4">
      {/* Date Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <Calendar className="w-4 h-4 inline mr-1" />
          Select Dates
        </label>
        <DatePicker
          checkIn={checkIn}
          checkOut={checkOut}
          onCheckInChange={setCheckIn}
          onCheckOutChange={setCheckOut}
        />
      </div>

      {/* Guests */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Guests</label>
        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-gray-900"
        >
          {Array.from({ length: room.max_occupancy }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} Guest{n > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Price Summary */}
      {nights > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">₦{room.price_per_night.toLocaleString()} × {nights} night{nights > 1 ? 's' : ''}</span>
            <span className="text-gray-900">₦{totalPrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-blue-200">
            <span>Total</span>
            <span className="text-blue-600">₦{totalPrice.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleAddToCart}
          className="flex-1 flex items-center justify-center gap-2 border-2 border-blue-600 text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
        >
          <ShoppingBag className="w-5 h-5" />
          Add to Cart
        </button>
        <button
          onClick={handleBookNow}
          className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Book Now
        </button>
      </div>
    </div>
  )
}