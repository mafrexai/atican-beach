// AI Receptionist - Mafrex | OpenRouter API + Supabase Knowledge Base
import { generateResponse as fallbackResponse, getWelcomeMessage } from './responses'

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
  const apiKey = process.env.OPENROUTER_API_KEY || ''
  console.log('[Mafrex AI] OpenRouter key available:', apiKey ? 'yes (' + apiKey.slice(0, 10) + '...)' : 'no - will use fallback')

  if (apiKey) {
    try {
      return await getOpenRouterResponse(message, context, supabaseClient, apiKey)
    } catch (error) {
      console.error('[Mafrex AI] OpenRouter error:', error)
    }
  }

  // Fallback to rule-based with live data attempt
  console.log('[Mafrex AI] Using rule-based fallback')
  return fallbackResponse(message, context)
}

async function getOpenRouterResponse(
  message: string,
  context: { page?: string; conversationHistory?: Array<{ type: string; text: string }> },
  supabaseClient: any,
  apiKey: string
): Promise<string> {
  let knowledgeContext = ''
  let realTimeData = ''

  // Fetch LIVE data from Supabase
  try {
    console.log('[Mafrex AI] Fetching live data from Supabase...')
    const [kbResult, roomsResult, experiencesResult, tentsResult] = await Promise.all([
      supabaseClient.from('ai_knowledge_base').select('*').eq('is_active', true),
      supabaseClient.from('rooms').select('room_number, room_type, price_per_night, is_active').eq('is_active', true),
      supabaseClient.from('experiences').select('name, price, price_unit, is_active').eq('is_active', true),
      supabaseClient.from('tents').select('tent_name, price, quantity_available, is_active').eq('is_active', true),
    ])

    // Knowledge base keyword scoring
    const knowledgeBase: KnowledgeEntry[] = kbResult.data || []
    console.log('[Mafrex AI] Knowledge base entries:', knowledgeBase.length)
    const matchedEntries = findMatchingEntries(message, knowledgeBase)
    knowledgeContext = matchedEntries.map(e => 'Q: ' + e.question + '\nA: ' + e.answer).join('\n\n')
    console.log('[Mafrex AI] Matched KB entries:', matchedEntries.length)

    // Build LIVE real-time data strings
    const rooms = roomsResult.data || []
    const experiences = experiencesResult.data || []
    const tents = tentsResult.data || []
    console.log('[Mafrex AI] Live data - Rooms:', rooms.length, 'Experiences:', experiences.length, 'Tents:', tents.length)
    const roomLines = rooms.map((r: any) => '  Room ' + r.room_number + ': ' + r.room_type + ' at N' + r.price_per_night.toLocaleString() + '/night')
    const expLines = experiences.map((e: any) => '  ' + e.name + ': N' + e.price.toLocaleString() + ' ' + e.price_unit)
    const tentLines = tents.map((t: any) => '  ' + t.tent_name + ': N' + t.price.toLocaleString() + ' (' + t.quantity_available + ' available)')
    realTimeData = ['Current Room Inventory (LIVE from database):', ...roomLines, '', 'Available Experiences (LIVE):', ...expLines, '', 'Available Tents (LIVE):', ...tentLines].join('\n')
  } catch (error) {
    console.error('[Mafrex AI] Error fetching live data:', error)
  }

  // Conversation history
  const history = (context.conversationHistory || []).slice(-6)
  const historyStr = history.map(m => (m.type === 'guest' ? 'Guest' : 'Mafrex') + ': ' + m.text).join('\n')

  // Build the prompt with LIVE data
  const userPrompt = [
    '',
    '## KNOWLEDGE BASE (Official Resort Information)',
    knowledgeContext || 'No knowledge base matches found. Use the real-time data below.',
    '',
    '## REAL-TIME DATA (LIVE from database - ALWAYS use these prices)',
    realTimeData || 'No live data available.',
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
    '1. Answer the guests question accurately using the LIVE data above',
    '2. When asked about prices, use the EXACT prices from the real-time data',
    '3. When asked about availability, reference the real inventory counts',
    '4. Respond in plain text only - NO markdown (no **, no *, no #, no - bullets)',
    '5. Keep it concise (under 200 words)',
    '6. If the guest wants to book, guide them: room type -> dates -> guests -> checkout',
    '7. Be warm, professional, and Nigerian-friendly',
    '8. Use emojis sparingly (max 2-3)',
    '9. Introduce yourself as Mafrex when relevant',
  ].join('\n')

  console.log('[Mafrex AI] Sending request to OpenRouter with model: openrouter/owl-alpha...')

  const response = await fetch(openrouterUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://aticanbeachresort.com',
      'X-Title': 'Mafrex AI Receptionist',
    },
    body: JSON.stringify({
      model: 'openrouter/owl-alpha',
      messages: [
        {
          role: 'system',
          content: 'You are Mafrex, the AI Receptionist for Atican Beach Resort, a 7-star luxury beachfront resort in Okun-Ajah, Lagos, Nigeria. You are warm, professional, and have a Nigerian-friendly tone. You MUST use the LIVE data provided in the prompt for all prices and availability - never make up prices. Respond in plain text only - no markdown formatting. Your name is Mafrex. When asked who you are, say you are Mafrex, the AI assistant for Atican Beach Resort.'
        },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('[Mafrex AI] OpenRouter error:', response.status, errText)
    throw new Error('OpenRouter API error: ' + response.status)
  }

  const data = await response.json()
  const reply = data.choices?.[0]?.message?.content || ''
  console.log('[Mafrex AI] Got reply, length:', reply.length)
  return reply || 'I apologize, I could not generate a response. Please try again.'
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
  } catch (error) { console.error('[Mafrex AI] Error saving conversation:', error) }
}

export function detectBookingIntent(message: string): boolean {
  const bookingKeywords = ['book','reserve','reservation','stay','check in','check-in','available','vacancy','nights','room for','i want','i need','looking for','can i get','how much','price','cost','rate']
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
  if (dateMatches.length >= 1) details.checkIn = dateMatches[0]?.[0]
  if (dateMatches.length >= 2) details.checkOut = dateMatches[1]?.[0]
  const guestRegex = /(\d+)\s*guests?|(\d+)\s*people|(\d+)\s*persons?/i
  const guestMatch = message.match(guestRegex)
  if (guestMatch) details.guests = parseInt(guestMatch[1] || guestMatch[2] || guestMatch[3] || "0")
  return details
}

export { getWelcomeMessage }