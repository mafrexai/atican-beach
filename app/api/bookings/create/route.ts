import { NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { generateConfirmationCode, generateBookingReference } from '@/lib/utils/bookingCodes'
import { sendBookingConfirmation } from '@/lib/email/sendConfirmation'
import QRCode from 'qrcode'
import { apiSuccess, apiError } from '@/lib/api/responses'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestInfo, items } = body as {
      guestInfo: { name: string; email: string; phone?: string; specialRequests?: string }
      items: Array<{ id: string; type: string; name: string; price: number; quantity: number; metadata?: Record<string, unknown> }>
    }

    if (!guestInfo?.name?.trim() || !guestInfo?.email?.trim() || !Array.isArray(items) || items.length === 0) {
      return apiError('Guest details and at least one booking item are required.', 400)
    }

    // Use server client to read session from cookies
    const serverSupabase = await createServerSupabaseClient()
    const { data: { user } } = await serverSupabase.auth.getUser()

    if (!user) {
      return apiError('Authentication required. Please log in to complete your booking.', 401)
    }

    const userId = user.id

    // Use admin client for database operations (bypers RLS for writes)
    const supabase = createAdminClient()

    const tableByType = {
      room: { table: 'rooms', price: 'price_per_night', name: 'room_type' },
      tent: { table: 'tents', price: 'price', name: 'tent_name' },
      experience: { table: 'experiences', price: 'price', name: 'name' },
      event_space: { table: 'event_spaces', price: 'price', name: 'space_name' },
    } as const

    const secureItems: typeof items = []
    for (const item of items) {
      const definition = tableByType[item.type as keyof typeof tableByType]
      if (!definition || !item.id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 30) {
        return apiError('One or more booking items are invalid.', 400)
      }

      const { data: inventory, error: inventoryError } = await supabase
        .from(definition.table)
        .select(`id, ${definition.price}, ${definition.name}`)
        .eq('id', item.id)
        .eq('is_active', true)
        .single()

      if (inventoryError || !inventory) return apiError('A selected item is no longer available.', 409)

      let quantity = item.quantity
      if (item.type === 'room') {
        const checkIn = typeof item.metadata?.checkIn === 'string' ? item.metadata.checkIn : ''
        const checkOut = typeof item.metadata?.checkOut === 'string' ? item.metadata.checkOut : ''
        const nights = Math.ceil((new Date(`${checkOut}T00:00:00`).getTime() - new Date(`${checkIn}T00:00:00`).getTime()) / 86_400_000)
        if (!checkIn || !checkOut || nights < 1) return apiError('Valid room dates are required.', 400)
        const { data: isAvailable } = await supabase.rpc('check_room_availability', { p_room_id: item.id, p_check_in: checkIn, p_check_out: checkOut })
        if (!isAvailable) return apiError('The selected room is no longer available for those dates.', 409)
        quantity = nights
      }

      const row = inventory as unknown as Record<string, string | number>
      secureItems.push({
        ...item,
        name: String(row[definition.name]),
        price: Number(row[definition.price]),
        quantity,
      })
    }

    const totalAmount = secureItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

    const bookingReference = generateBookingReference()
    const confirmationCode = generateConfirmationCode()

    const qrData = JSON.stringify({
      bookingRef: bookingReference,
      confirmationCode,
      guestName: guestInfo.name,
      paymentPending: true,
    })
    const qrCode = await QRCode.toDataURL(qrData)

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        booking_reference: bookingReference,
        confirmation_code: confirmationCode,
        user_id: userId,
        guest_name: guestInfo.name,
        guest_email: guestInfo.email,
        guest_phone: guestInfo.phone ?? null,
        total_amount: totalAmount,
        payment_reference: null,
        payment_status: 'unpaid',
        status: 'pending',
        qr_code: qrCode,
        check_in_date: secureItems.find((i) => i.type === 'room')?.metadata?.checkIn ?? null,
        check_out_date: secureItems.find((i) => i.type === 'room')?.metadata?.checkOut ?? null,
        special_requests: guestInfo.specialRequests ?? null,
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Booking creation error:', bookingError)
      return apiError(`Failed to create booking: ${bookingError.message}`, 500)
    }

    const bookingItems = secureItems.map((item) => ({
      booking_id: booking.id,
      item_type: item.type,
      item_id: item.id,
      quantity: item.quantity,
      price_at_booking: item.price,
      start_date: item.metadata?.checkIn ?? null,
      end_date: item.metadata?.checkOut ?? null,
      metadata: item.metadata ?? {},
    }))

    const { error: itemsError } = await supabase
      .from('booking_items')
      .insert(bookingItems)

    if (itemsError) {
      console.error('Booking items error:', itemsError)
      await supabase.from('bookings').delete().eq('id', booking.id)
      return apiError(`Failed to save booking items: ${itemsError.message}`, 500)
    }

    const emailPayload: {
      bookingReference: string
      confirmationCode: string
      items: Array<{ name: string; price: number; quantity: number }>
      totalAmount: number
      qrCode: string
      guestName: string
      checkIn?: string
      checkOut?: string
      paymentPending?: boolean
    } = {
      bookingReference,
      confirmationCode,
      items: secureItems.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity })),
      totalAmount,
      qrCode,
      guestName: guestInfo.name,
    }

    const roomItem = secureItems.find((i) => i.type === 'room')
    const ci = roomItem?.metadata?.checkIn
    const co = roomItem?.metadata?.checkOut
    if (typeof ci === 'string') emailPayload.checkIn = ci
    if (typeof co === 'string') emailPayload.checkOut = co

    await sendBookingConfirmation(guestInfo.email, emailPayload)

    return apiSuccess({
      reference: bookingReference,
      confirmationCode,
      qrCode,
      totalAmount,
    })
  } catch (error) {
    console.error('Booking API error:', error)
    return apiError(`Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`, 500)
  }
}
