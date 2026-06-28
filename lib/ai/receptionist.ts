// Enhanced AI Receptionist - OpenRouter API with Supabase Knowledge Base
import { generateResponse as fallbackResponse, getWelcomeMessage } from './responses'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const openrouterUrl = 'https://openrouter.ai/api/v1/chat/completions'

interface KnowledgeEntry {
  id: string
  category: string
  question: string
  answer: string
  keywords: string[]
}

export async function getReceptionistResponse(
  message: string,
  context: { page?: string; conversationHistory?: Array<{ type: string; text: string }> },
  supabaseClient: any
): Promise<string> {
  if (OPENROUTER_API_KEY) {
    try {
      return await getOpenRouterResponse(message, context, supabaseClient)
    } catch (error) {
      console.error('OpenRouter error, falling back to rule-based:', error)
    }
  }
  return fallbackResponse(message, context)
}

async function getOpenRouterResponse(
  message: string,
  context: { page?: string; conversationHistory?: Array<{ type: string; text: string }> },
  supabaseClient: any
): Promise<string> {
  let knowledgeContext = ''
  let realTimeData = ''

  try {
    const [kbResult, roomsResult, experiencesResult, tentsResult] = await Promise.all([
      supabaseClient.from('ai_knowledge_base').select('*').eq('is_active', true),
      supabaseClient.from('rooms').select('room_number, room_type, price_per_night, is_active').eq('is_active', true),
      supabaseClient.from('experiences').select('name, price, price_unit, is_active').eq('is_active', true),
      supabaseClient.from('tents').select('tent_name, price, quantity_available, is_active').eq('is_active', true),
    ])

    const knowledgeBase: KnowledgeEntry[] = kbResult.data || []
    const matchedEntries = findMatchingEntries(message, knowledgeBase)
    knowledgeContext = matchedEntries.map(e => 'Q: ' + e.question + '\nA: ' + e.answer).join('\n\n')

    const rooms = roomsResult.data || []
    const experiences = experiencesResult.data || []
    const tents = tentsResult.data || []
    const roomLines = rooms.map((r: any) => '  Room ' + r.room_number + ': ' + r.room_type + ' at N' + r.price_per_night.toLocaleString() + '/night')
    const expLines = experiences.map((e: any) => '  ' + e.name + ': N' + e.price.toLocaleString() + ' ' + e.price_unit)
    const tentLines = tents.map((t: any) => '  ' + t.tent_name + ': N' + t.price.toLocaleString() + ' (' + t.quantity_available + ' available)')
    realTimeData = ['Current Room Inventory:', ...roomLines, '', 'Available Experiences:', ...expLines, '', 'Available Tents:', ...tentLines].join('\n')
  } catch (error) {
    console.error('Error fetching AI context from Supabase:', error)
  }

  const history = (context.conversationHistory || []).slice(-6)
  const historyStr = history.map(m => (m.type === 'guest' ? 'Guest' : 'AI') + ': ' + m.text).join('\n')

  const promptParts = [
    'You are the AI Receptionist for Atican Beach Resort, a 7-star luxury beachfront resort in Okun-Ajah, Lagos, Nigeria.',
    '',
    '## YOUR PERSONALITY',
    '- Warm, welcoming, and professional with a Nigerian-friendly tone',
    '- Knowledgeable about every aspect of the resort',
    '- Helpful and solution-oriented',
    '- Use Nigerian Naira (N) for prices',
    '- IMPORTANT: Respond in plain text. Do NOT use markdown formatting (no **, no *, no #, no bullet dashes). Use plain sentences.',
    '',
    '## KNOWLEDGE BASE (Official Resort Information)',
    knowledgeContext || 'Using general resort knowledge.',
    '',
    '## REAL-TIME DATA',
    realTimeData,
    '',
    '## CONVERSATION HISTORY',
    historyStr || 'This is the start of the conversation.',
    '',
    '## CURRENT PAGE',
    'The guest is currently on: ' + (context.page || 'Homepage'),
    '',
    '## GUEST MESSAGE',
    message,
    '',
    '## INSTRUCTIONS',
    '1. Respond naturally and conversationally in plain text (no markdown)',
    '2. Use the knowledge base for accurate information - do NOT make up prices or details',
    '3. If you dont know something, say so honestly and offer to connect them to the front desk',
    '4. Offer to help with bookings when appropriate',
    '5. Keep responses concise but helpful (under 200 words ideally)',
    '6. Use emojis sparingly for warmth (max 2-3 per response)',
    '7. For booking requests, guide them step by step: room type -> dates -> guests -> checkout',
    '8. For pricing questions, always reference the knowledge base prices',
    '',
    '## RESPONSE',
  ]

  const response = await fetch(openrouterUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://aticanbeach.com',
      'X-Title': 'Atican Beach AI Receptionist',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: 'You are the AI Receptionist for Atican Beach Resort. Respond in plain text without markdown. Be warm, professional, Nigerian-friendly.' },
        { role: 'user', content: promptParts.join('\n') },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  })
  if (!response.ok) throw new Error('OpenRouter API error: ' + response.status)
  const data = await response.json()
  return data.choices?.[0]?.message?.content || 'I apologize, I could not generate a response.'
}

function findMatchingEntries(message: string, knowledgeBase: KnowledgeEntry[]): KnowledgeEntry[] {
  const normalized = message.toLowerCase()
  const matches: Array<{ entry: KnowledgeEntry; score: number }> = []
  for (const entry of knowledgeBase) {
    let score = 0
    for (const keyword of entry.keywords) {
      if (normalized.includes(keyword.toLowerCase())) score += 2
    }
    const questionWords = entry.question.toLowerCase().split(' ').filter(w => w.length > 3)
    for (const word of questionWords) {
      if (normalized.includes(word)) score += 1
    }
    if (score > 0) matches.push({ entry, score })
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, 5).map(m => m.entry)
}

export async function saveConversation(
  sessionId: string, role: 'guest' | 'assistant', message: string, userId?: string, supabaseClient?: any
): Promise<void> {
  if (!supabaseClient || !sessionId) return
  try {
    await supabaseClient.from('ai_conversations').insert({ user_id: userId || null, session_id: sessionId, role, message })
  } catch (error) { console.error('Error saving AI conversation:', error) }
}

export function detectBookingIntent(message: string): boolean {
  const bookingKeywords = ['book','reserve','reservation','stay','check in','check-in','available','vacancy','nights','room for','i want','i need','looking for','can i get']
  return bookingKeywords.some(keyword => message.toLowerCase().includes(keyword))
}

export function extractBookingDetails(message: string): { roomType?: string; checkIn?: string; checkOut?: string; guests?: number } {
  const details: { roomType?: string; checkIn?: string; checkOut?: string; guests?: number } = {}
  const lowerMsg = message.toLowerCase()
  const roomTypeMap: Record<string, string> = {
    'standard': 'Standard', 'deluxe': 'Deluxe', 'double bed': 'Double Bed', 'family': 'Family',
    'executive suite': 'Executive Suite', 'premium suite': 'Premium Suite', 'presidential suite': 'Presidential Suite',
    'executive': 'Executive', 'premium': 'Premium Suite', 'presidential': 'Presidential Suite', 'suite': 'Premium Suite',
  }
  const sortedTypes = Object.keys(roomTypeMap).sort((a, b) => b.length - a.length)
  for (const type of sortedTypes) { if (lowerMsg.includes(type)) { details.roomType = roomTypeMap[type]; break } }
  const dateRegex = /(?:(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})|(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{2,4})?)/gi
  const dateMatches = [...message.matchAll(dateRegex)]
  if (dateMatches.length >= 1) details.checkIn = dateMatches[0][0]
  if (dateMatches.length >= 2) details.checkOut = dateMatches[1][0]
  const guestRegex = /(\d+)\s*guests?|(\d+)\s*people|(\d+)\s*persons?/i
  const guestMatch = message.match(guestRegex)
  if (guestMatch) details.guests = parseInt(guestMatch[1] || guestMatch[2] || guestMatch[3])
  return details
}

export { getWelcomeMessage }
