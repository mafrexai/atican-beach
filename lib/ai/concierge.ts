// Enhanced AI Concierge - OpenRouter-powered personalized recommendations
import { formatForSpeech } from '../formatSpeech'

const openrouterUrl = 'https://openrouter.ai/api/v1/chat/completions'

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
  const apiKey = process.env.OPENROUTER_API_KEY || ''
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

  // 3. OpenRouter-powered personalized recommendations
  if (apiKey && supabaseClient && context.userBookings !== undefined) {
    try {
      const geminiRecs = await getOpenRouterRecommendations(context, supabaseClient, apiKey)
      recommendations.push(...geminiRecs)
    } catch (error) {
      console.error('[Concierge AI] OpenRouter error:', error)
    }
  }

  // Sort by priority (highest first) and return top 3
  return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 3)
}

async function getOpenRouterRecommendations(
  context: any,
  supabaseClient: any,
  apiKey: string
): Promise<ConciergeRecommendation[]> {
  const model = 'google/gemini-2.0-flash-001'

  const response = await fetch(openrouterUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://aticanbeach.com',
      'X-Title': 'Atican Beach AI Concierge',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are the AI Concierge for Atican Beach Resort. Return ONLY a raw JSON array, no markdown, no code fences. Each item: {type, title, description, ctaText, ctaLink, priority}. Types: upgrade, experience, dining, event, bundle. Max 80 words per description. Use N for Naira. Priority 1-10.'
        },
        {
          role: 'user',
          content: 'Guest context: ' + JSON.stringify(context) + '. Suggest 1-2 personalized upsell recommendations.'
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
    }),
  })

  if (!response.ok) return []
  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch {
    // Invalid JSON from OpenRouter, skip
  }
  return []
}
