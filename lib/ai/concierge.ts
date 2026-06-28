// Enhanced AI Concierge - Personalized recommendations and upselling
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null

export interface ConciergeRecommendation {
  type: 'upgrade' | 'experience' | 'dining' | 'event' | 'bundle'
  title: string
  description: string
  ctaText: string
  ctaLink: string
  priority: number
}

export async function getConciergeRecommendations(
  context: {
    currentPage?: string
    cartItems?: string[]
    hasRoom?: boolean
    hasStandardRoom?: boolean
    hasExperience?: boolean
    userBookings?: number
  },
  supabaseClient?: any
): Promise<ConciergeRecommendation[]> {
  const recommendations: ConciergeRecommendation[] = []

  // 1. Room upgrade suggestions based on cart
  if (context.hasStandardRoom) {
    recommendations.push({
      type: 'upgrade',
      title: 'Upgrade to Deluxe Room',
      description: 'For just N10,000 more per night, enjoy Mini Bar and premium ocean views in our Deluxe Room.',
      ctaText: 'View Deluxe Rooms',
      ctaLink: '/rooms?type=Deluxe',
      priority: 10,
    })
  }

  if (context.hasRoom && !context.hasExperience) {
    recommendations.push({
      type: 'experience',
      title: 'Add a Bonfire Night',
      description: 'Make your stay unforgettable with our beach bonfire experience. N30,000 per group.',
      ctaText: 'View Experiences',
      ctaLink: '/experiences',
      priority: 8,
    })
  }

  // 2. Page-based suggestions
  if (context.currentPage === '/experiences') {
    recommendations.push({
      type: 'bundle',
      title: 'Experience Bundle Deal',
      description: 'Book Bonfire + Sack Race + Beach Ball for N40,000 (save N5,000).',
      ctaText: 'Add Bundle',
      ctaLink: '/experiences',
      priority: 9,
    })
  }

  if (context.currentPage === '/rooms') {
    recommendations.push({
      type: 'upgrade',
      title: 'Presidential Suite Special',
      description: 'Experience 7-star luxury with private pool, butler, and ocean views. N500,000/night.',
      ctaText: 'View Suite',
      ctaLink: '/rooms?type=Presidential+Suite',
      priority: 7,
    })
  }

  if (context.currentPage === '/dining') {
    recommendations.push({
      type: 'dining',
      title: 'Sunset Dinner Package',
      description: 'Book our romantic sunset dinner for two. A perfect end to your beach day.',
      ctaText: 'Reserve Table',
      ctaLink: '/dining',
      priority: 8,
    })
  }

  // 3. Gemini-powered personalized recommendations
  if (genAI && supabaseClient && context.userBookings !== undefined) {
    try {
      const geminiRecs = await getGeminiRecommendations(context, supabaseClient)
      recommendations.push(...geminiRecs)
    } catch (error) {
      console.error('Gemini concierge error:', error)
    }
  }

  // Sort by priority (highest first) and return top 3
  return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 3)
}

async function getGeminiRecommendations(
  context: any,
  supabaseClient: any
): Promise<ConciergeRecommendation[]> {
  const model = genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const promptParts = [
    'You are the AI Concierge for Atican Beach Resort in Okun-Ajah, Lagos, Nigeria.',
    'Based on the guest context below, suggest 1-2 personalized upsell or cross-sell recommendations.',
    'Context: ' + JSON.stringify(context),
    '',
    'Return JSON array only. Each item: {type, title, description, ctaText, ctaLink, priority}.',
    'Types: upgrade, experience, dining, event, bundle.',
    'Keep descriptions under 80 words. Use N for Naira. Priority 1-10.',
  ]

  const result = await model.generateContent(promptParts.join('\n'))
  const text = result.response.text()

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch {
    // Invalid JSON from Gemini, skip
  }
  return []
}
