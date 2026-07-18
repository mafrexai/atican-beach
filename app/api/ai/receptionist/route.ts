import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  getReceptionistResponse,
  detectBookingIntent,
  saveConversation,
  extractBookingDetails,
  getWelcomeMessage,
} from '@/lib/ai/receptionist'
import { generateResponse as fallbackResponse } from '@/lib/ai/responses'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
  const { message, conversationHistory, sessionId, userId } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 })
    }

    const origin = request.headers.get('origin') || ''
    const referer = request.headers.get('referer') || ''
    const currentPage = referer.replace(origin, '') || '/'

    // Get Supabase client for knowledge base + conversation saving
    const supabase = createAdminClient()

    // Detect booking intent
    const isBooking = detectBookingIntent(message)
    const bookingDetails = isBooking ? extractBookingDetails(message) : null

    const isAvailabilityInquiry = /\b(?:what|which|any|show|list|check|do you have|are there)\b[^?.!]*\brooms?\b[^?.!]*\b(?:available|availability|vacan(?:t|cy|cies))\b|\b(?:available|vacant)\s+rooms?\b/i.test(message)

    // Booking and availability responses are deterministic so model reasoning can never leak
    // into a revenue-critical guest flow. The structured form handles the rest.
    let reply: string
    if (isAvailabilityInquiry) {
      const { data: availableRooms } = await supabase
        .from('rooms')
        .select('room_type, price_per_night')
        .eq('is_active', true)
        .eq('status', 'available')
        .order('price_per_night', { ascending: true })

      const roomTypes = new Map<string, { count: number; price: number }>()
      for (const room of availableRooms || []) {
        const type = String(room.room_type || 'Room')
        const price = Number(room.price_per_night)
        const current = roomTypes.get(type)
        roomTypes.set(type, {
          count: (current?.count || 0) + 1,
          price: Number.isFinite(price) ? Math.min(current?.price ?? price, price) : current?.price || 0,
        })
      }

      const options = [...roomTypes.entries()]
        .sort((a, b) => a[1].price - b[1].price)
        .map(([type, details]) => `${type}: ${details.price.toLocaleString('en-NG')} Naira per night (${details.count} available)`)

      reply = options.length
        ? `These room types are currently available:\n\n${options.join('\n')}\n\nTell me your check-in date, check-out date, and number of guests so I can confirm availability for your stay.`
        : 'I cannot find a currently available room. Please share your preferred dates so I can help check other options.'
    } else if (isBooking && bookingDetails?.roomType) {
      const { data: matchingRooms } = await supabase
        .from('rooms')
        .select('price_per_night')
        .eq('room_type', bookingDetails.roomType)
        .eq('is_active', true)
        .eq('status', 'available')
        .order('price_per_night', { ascending: true })
        .limit(1)

      const price = Number(matchingRooms?.[0]?.price_per_night)
      const priceText = Number.isFinite(price) && price > 0
        ? ` at ${price.toLocaleString('en-NG')} Naira per night`
        : ''
      reply = `Absolutely — I can help you reserve a ${bookingDetails.roomType} room${priceText}. Please complete the secure reservation details below so I can check your exact dates and guest count.`
    } else {
      try {
        reply = await getReceptionistResponse(message, {
          page: currentPage,
          conversationHistory: conversationHistory || [],
        }, supabase)
      } catch (error) {
        console.error('AI response error, using fallback:', error)
        reply = fallbackResponse(message, {
          page: currentPage,
          conversationHistory: conversationHistory || [],
        })
      }
    }

    reply = sanitizeGuestReply(reply, isBooking)

    // Save conversation to database
    if (sessionId) {
      try {
        await saveConversation(sessionId, 'guest', message, userId, supabase)
        await saveConversation(sessionId, 'assistant', reply, undefined, supabase)
      } catch (e) {
        // Non-critical - don't fail the request
        console.error('Failed to save conversation:', e)
      }
    }

    return NextResponse.json({
      success: true,
      // Strip markdown formatting for clean AI voice
      reply: (reply || "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/^#{1,6}\s/gm, ""),
      isBooking,
      bookingDetails,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('AI Receptionist error:', error)
    return NextResponse.json({
      success: false,
      reply: 'I apologize, but I am experiencing technical difficulties. Please try again or contact our front desk at +234 902 962 2583.',
      error: 'Internal server error',
    }, { status: 500 })
  }
}

function sanitizeGuestReply(reply: string, isBooking: boolean): string {
  const cleaned = (reply || '')
    // Normalize symbol/prefix variants and consume an existing currency suffix
    // so model output such as "₦55,000 Naira" does not become "55,000 Naira Naira".
    .replace(/₦\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)(?:\s+Naira)?/gi, '$1 Naira')
    .replace(/\bN\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)(?:\s+Naira)?/gi, '$1 Naira')
    .replace(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s+Naira(?:\s+Naira)+/gi, '$1 Naira')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^#{1,6}\s/gm, '')
    .trim()

  const reasoningLeak = /\b(we need to respond|let(?:'s| us) (?:respond|extract|check)|should (?:respond|mention)|use exact price|system prompt|conversation history)\b/i.test(cleaned)
  if (reasoningLeak) {
    return isBooking
      ? 'I can help you reserve that room. Please complete the secure reservation details below so I can check your dates, confirm the total, and arrange secure payment.'
      : 'I can help with rooms, dining, experiences, events, and resort information. What would you like to know?'
  }

  return cleaned
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'AI Receptionist API is online',
    welcomeMessage: getWelcomeMessage(),
  })
}
