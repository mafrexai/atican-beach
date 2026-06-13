import { NextRequest, NextResponse } from 'next/server'
import { generateResponse, getWelcomeMessage } from '@/lib/ai/responses'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversationHistory } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get the request origin to determine context
    const origin = request.headers.get('origin') || ''
    const referer = request.headers.get('referer') || ''
    const currentPage = referer.replace(origin, '') || '/'

    // Generate response using rule-based system
    const reply = generateResponse(message, {
      page: currentPage,
      conversationHistory: conversationHistory || [],
    })

    return NextResponse.json({
      success: true,
      reply,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('AI Receptionist error:', error)
    return NextResponse.json(
      {
        success: false,
        reply: 'I apologize, but I\'m experiencing technical difficulties. Please try again or contact our front desk at +234 800 000 0000.',
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'AI Receptionist API is online',
    welcomeMessage: getWelcomeMessage(),
  })
}