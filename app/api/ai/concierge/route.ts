import { NextRequest, NextResponse } from 'next/server'
import { getConciergeRecommendation } from '@/lib/ai/concierge'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const page = normalizePage(request.nextUrl.searchParams.get('page'))
    const cartItemTypes = (request.nextUrl.searchParams.get('cart') || '')
      .split(',')
      .filter((type) => ['room', 'experience', 'tent', 'event_space'].includes(type))
      .slice(0, 10)

    const recommendation = await getConciergeRecommendation(
      { currentPage: page, cartItemTypes },
      createAdminClient()
    )

    return NextResponse.json({ success: true, recommendation })
  } catch (error) {
    console.error('[Concierge] Recommendation error:', error)
    return NextResponse.json({ success: false, recommendation: null }, { status: 500 })
  }
}

function normalizePage(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value.slice(0, 200)
}
