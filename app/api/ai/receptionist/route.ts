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

    // Generate response (Gemini with knowledge base, or fallback to rule-based)
    let reply: string
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

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'AI Receptionist API is online',
    welcomeMessage: getWelcomeMessage(),
  })
}
