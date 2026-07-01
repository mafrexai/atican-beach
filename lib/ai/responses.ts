// AI Receptionist Response Logic
// Rule-based system with keyword matching and context awareness

interface ResponseContext {
  page?: string
  cartItems?: string[]
  conversationHistory?: Array<{ type: string; text: string }>
}

const roomInfo: Record<string, { price: string; occupancy: string; amenities: string }> = {
  'Standard': { price: '₦55,000', occupancy: '2 guests', amenities: 'AC, TV, WiFi' },
  'Deluxe': { price: '₦65,000', occupancy: '2 guests', amenities: 'AC, TV, WiFi, Mini Bar' },
  'Double Bed': { price: '₦75,000', occupancy: '2 guests', amenities: 'AC, TV, WiFi, Mini Bar, Ocean View' },
  'Family': { price: '₦95,000', occupancy: '4 guests', amenities: 'AC, TV, WiFi, Mini Bar, 2 Bedrooms' },
  'Executive': { price: '₦120,000', occupancy: '2 guests', amenities: 'AC, TV, WiFi, Mini Bar, Ocean View, Lounge' },
  'Premium Suite': { price: '₦180,000', occupancy: '4 guests', amenities: 'AC, TV, WiFi, Mini Bar, Ocean View, Lounge, Jacuzzi' },
  'Executive Suite': { price: '₦250,000', occupancy: '4 guests', amenities: 'AC, TV, WiFi, Mini Bar, Ocean View, Lounge, Jacuzzi, Butler' },
  'Presidential Suite': { price: '₦500,000', occupancy: '6 guests', amenities: 'AC, TV, WiFi, Mini Bar, Ocean View, Lounge, Jacuzzi, Butler, Private Pool' },
}

const policies = {
  checkIn: 'Check-in is at 2:00 PM and check-out is at 12:00 PM. Early check-in and late check-out may be available upon request.',
  cancellation: 'Cancellations made up to 48 hours before check-in receive a full refund. Cancellations within 48 hours may be subject to a one-night charge.',
  payment: 'We accept all major credit/debit cards, bank transfers, and payments through Paystack. All online payments are processed securely.',
  id: 'Please bring a valid government-issued ID (passport or national ID) and your booking confirmation for check-in.',
  gateEntry: 'After your booking is confirmed, you\'ll receive a QR code via email. Show this QR code at the gate scanner for entry, or use your 6-digit confirmation code.',
  parking: 'Yes, we offer complimentary secure parking for all guests. Valet parking is also available.',
  wifi: 'Yes, complimentary high-speed WiFi is available throughout the resort, including all rooms, common areas, and the beach.',
  pool: 'Yes, we have a stunning infinity pool overlooking the beach, available to all guests. The Presidential Suite also includes a private pool.',
  pets: 'Unfortunately, pets are not allowed at the resort with the exception of service animals.',
  smoking: 'No smoking inside rooms. Designated smoking areas are available outdoors.',
}

const experiences = [
  { name: 'Bonfire', price: '₦30,000', unit: 'per group', desc: 'Evening beach bonfire experience' },
  { name: 'Sack Race', price: '₦5,000', unit: 'per group', desc: 'Fun beach sack race activity' },
  { name: 'Beach Ball', price: '₦10,000', unit: 'per group', desc: 'Beach ball games and activities' },
  { name: 'Horse Riding', price: '₦3,000', unit: 'per ride', desc: 'Beach horse riding experience' },
]

const dining = {
  hours: 'Our restaurant is open daily from 7:00 AM to 11:00 PM.',
  cuisine: 'Our world-class chefs prepare both local and international dishes with the freshest ingredients.',
  reservation: 'While walk-ins are welcome, we recommend making a reservation, especially during peak hours and weekends.',
  roomService: '24-hour room service is available. You can order through our Room Service page or by dialing extension 0 from your room phone.',
  dietary: 'Yes, our chefs can accommodate various dietary requirements including vegetarian, vegan, gluten-free, and halal options.',
}

function matchKeywords(message: string): string[] {
  const lower = message.toLowerCase()
  const keywords: string[] = []

  if (lower.includes('room') || lower.includes('book') || lower.includes('reservation') || lower.includes('stay')) keywords.push('rooms')
  if (lower.includes('price') || lower.includes('cost') || lower.includes('how much') || lower.includes('rate')) keywords.push('pricing')
  if (lower.includes('check') && (lower.includes('in') || lower.includes('out'))) keywords.push('checkin')
  if (lower.includes('cancel') || lower.includes('refund')) keywords.push('cancellation')
  if (lower.includes('pay') || lower.includes('card') || lower.includes('transfer')) keywords.push('payment')
  if (lower.includes('tent') || lower.includes('event') || lower.includes('wedding') || lower.includes('party')) keywords.push('events')
  if (lower.includes('experience') || lower.includes('bonfire') || lower.includes('horse') || lower.includes('ride') || lower.includes('activity')) keywords.push('experiences')
  if (lower.includes('food') || lower.includes('eat') || lower.includes('restaurant') || lower.includes('dining') || lower.includes('menu') || lower.includes('breakfast') || lower.includes('lunch') || lower.includes('dinner')) keywords.push('dining')
  if (lower.includes('pool') || lower.includes('swim')) keywords.push('pool')
  if (lower.includes('wifi') || lower.includes('internet')) keywords.push('wifi')
  if (lower.includes('parking') || lower.includes('car')) keywords.push('parking')
  if (lower.includes('pet') || lower.includes('dog') || lower.includes('cat')) keywords.push('pets')
  if (lower.includes('smoke') || lower.includes('smoking')) keywords.push('smoking')
  if (lower.includes('id') || lower.includes('document') || lower.includes('passport')) keywords.push('id')
  if (lower.includes('gate') || lower.includes('qr') || lower.includes('code') || lower.includes('entry')) keywords.push('gate')
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('good morning') || lower.includes('good afternoon') || lower.includes('good evening')) keywords.push('greeting')
  if (lower.includes('thank') || lower.includes('thanks')) keywords.push('thanks')
  if (lower.includes('help') || lower.includes('assist') || lower.includes('support')) keywords.push('help')
  if (lower.includes('contact') || lower.includes('phone') || lower.includes('email') || lower.includes('call')) keywords.push('contact')
  if (lower.includes('location') || lower.includes('address') || lower.includes('where') || lower.includes('direction')) keywords.push('location')
  if (lower.includes('amenity') || lower.includes('facility') || lower.includes('service')) keywords.push('amenities')
  if (lower.includes('suite') || lower.includes('presidential') || lower.includes('executive') || lower.includes('premium')) keywords.push('suites')
  if (lower.includes('standard') || lower.includes('deluxe') || lower.includes('family') || lower.includes('double')) keywords.push('roomTypes')
  if (lower.includes('room service') || lower.includes('order food') || lower.includes('deliver')) keywords.push('roomService')
  if (lower.includes('cancel') || lower.includes('modify') || lower.includes('change')) keywords.push('modify')

  return keywords
}

export function generateResponse(message: string, context?: ResponseContext): string {
  const keywords = matchKeywords(message)
  const lower = message.toLowerCase()

  // Greeting
  if (keywords.includes('greeting')) {
    return 'Welcome to Atican Beach Resort! I am Mafrex, your AI assistant. 🌊 I\'m your AI Receptionist. I can help you with room bookings, pricing, availability, experiences, dining, and any other questions about your stay. How can I assist you today?'
  }

  // Thanks
  if (keywords.includes('thanks')) {
    return 'You\'re welcome! 😊 Is there anything else I can help you with? I can assist with room bookings, experiences, dining reservations, or any other questions about Atican Beach Resort.'
  }

  // Help
  if (keywords.includes('help')) {
    return 'I\'d be happy to help! Here are some things I can assist with:\n\n🏨 **Room Bookings** - Check availability and pricing\n🎪 **Events & Tents** - Book event spaces and tents\n🎯 **Experiences** - Bonfire, horse riding, beach games\n🍽️ **Dining** - Restaurant info and room service\n📋 **Policies** - Check-in/out, cancellation, payment\n📍 **Location** - Directions and contact info\n\nJust ask me anything!'
  }

  // Rooms & Pricing
  if (keywords.includes('rooms') || keywords.includes('roomTypes') || keywords.includes('suites')) {
    if (keywords.includes('pricing') || lower.includes('how much') || lower.includes('price') || lower.includes('cost')) {
      return `Here are our room options and prices per night:\n\n` +
        `🛏️ **Standard** - ₦55,000 (2 guests)\n` +
        `🛏️ **Deluxe** - ₦65,000 (2 guests)\n` +
        `🛏️ **Double Bed** - ₦80,000 (2 guests)\n` +
        `👨‍👩‍👧‍👦 **Family** - ₦85,000 (4 guests)\n` +
        `⭐ **Executive** - ₦120,000 (2 guests)\n` +
        `👑 **Premium Suite** - ₦100,000 (4 guests)\n` +
        `🏆 **Executive Suite** - ₦120,000 (4 guests)\n` +
        `🌟 **Presidential Suite** - ₦150,000 (6 guests)\n\n` +
        `Would you like to book a room or get more details about any specific type?`
    }

    if (lower.includes('presidential') || lower.includes('best') || lower.includes('luxury') || lower.includes('premium')) {
      const ps = roomInfo['Presidential Suite']
      if (!ps) return 'I couldn\'t find information about that suite. Please try again.'
      return `🌟 **Presidential Suite** - Our finest accommodation!\n\n` +
        `💰 **Price:** ${ps.price}/night\n` +
        `👥 **Occupancy:** ${ps.occupancy}\n` +
        `✨ **Amenities:** ${ps.amenities}\n\n` +
        `This is the ultimate luxury experience with panoramic ocean views, a private pool, and dedicated butler service. Would you like to book this suite?`
    }

    return `We have 45 beautiful rooms and suites across 8 categories:\n\n` +
      `🛏️ **Standard** (₦55,000) - Cozy and comfortable\n` +
      `🛏️ **Deluxe** (₦65,000) - Upgraded with mini bar\n` +
      `🛏️ **Double Bed** (₦80,000) - Ocean view included\n` +
      `👨‍👩‍👧‍👦 **Family** (₦85,000) - Perfect for families (4 guests)\n` +
      `⭐ **Executive** (₦85,000) - Lounge access\n` +
      `👑 **Premium Suite** (₦100,000) - With Jacuzzi\n` +
      `🏆 **Executive Suite** (₦120,000) - With butler service\n` +
      `🌟 **Presidential Suite** (₦150,000) - Private pool & ultimate luxury\n\n` +
      `Which room type interests you? I can provide more details or help you book!`
  }

  // Pricing
  if (keywords.includes('pricing')) {
    return `Here's our pricing overview:\n\n` +
      `**Rooms (per night):**\n` +
      `• Standard: ₦55,000 | Deluxe: ₦65,000\n` +
      `• Double Bed: ₦75,000 | Family: ₦95,000\n` +
      `• Executive: ₦120,000 | Premium Suite: ₦180,000\n` +
      `• Executive Suite: ₦250,000 | Presidential: ₦500,000\n\n` +
      `**Experiences:**\n` +
      `• Bonfire: ₦30,000 | Horse Riding: ₦3,000/ride\n` +
      `• Sack Race: ₦5,000 | Beach Ball: ₦10,000\n\n` +
      `**Event Tents:** From ₦50,000 to ₦300,000\n\n` +
      `All prices are in Nigerian Naira (₦). Would you like to book something?`
  }

  // Check-in/out
  if (keywords.includes('checkin')) {
    return `📋 **Check-in & Check-out Policy:**\n\n` +
      `• **Check-in:** 2:00 PM\n` +
      `• **Check-out:** 12:00 PM (noon)\n` +
      `• Early check-in and late check-out may be available upon request, subject to availability.\n\n` +
      `At check-in, please bring:\n` +
      `• Valid government-issued ID (passport or national ID)\n` +
      `• Your booking confirmation (QR code or 6-digit confirmation code)\n\n` +
      `Your QR code will be sent via email after booking confirmation.`
  }

  // Cancellation
  if (keywords.includes('cancellation')) {
    return `📋 **Cancellation Policy:**\n\n` +
      `• **48+ hours before check-in:** Full refund\n` +
      `• **Within 48 hours:** May be subject to one-night charge\n` +
      `• **No-show:** Full booking charge applies\n\n` +
      `To cancel or modify your booking, please contact our front desk or use your dashboard. Is there anything else I can help with?`
  }

  // Payment
  if (keywords.includes('payment')) {
    return `💳 **Payment Methods:**\n\n` +
      `We accept:\n` +
      `• All major credit/debit cards (Visa, Mastercard)\n` +
      `• Bank transfers\n` +
      `• Paystack (secure online payment)\n\n` +
      `All online payments are processed securely through Paystack. You'll be redirected to complete payment after booking.\n\n` +
      `Would you like to proceed with a booking?`
  }

  // Events & Tents
  if (keywords.includes('events')) {
    return `🎪 **Event Spaces & Tents:**\n\n` +
      `We offer 7 event spaces and 4 premium tent options:\n\n` +
      `**Event Spaces:**\n` +
      `• Small Setup (₦15,000) - Intimate gatherings\n` +
      `• Medium Setup (₦30,000) - Wooden chairs + sofas\n` +
      `• Large Setup (₦50,000) - 25 chairs, 3 tables\n` +
      `• XL Setup (₦100,000) - 50 chairs, 6 tables\n` +
      `• Photo Shoot (₦50,000) - Professional location\n` +
      `• Video Shoot (₦100,000) - Professional location\n` +
      `• VIP Event Space (₦300,000) - Exclusive area\n\n` +
      `**Tents:** From ₦50,000 to ₦300,000\n\n` +
      `Perfect for weddings, corporate events, and celebrations! Would you like to book an event space?`
  }

  // Experiences
  if (keywords.includes('experiences')) {
    return `🎯 **Experiences & Activities:**\n\n` +
      `🔥 **Bonfire** - ₦30,000/group\n` +
      `   Evening beach bonfire experience under the stars\n\n` +
      `🏃 **Sack Race** - ₦5,000/group\n` +
      `   Fun beach sack race activity\n\n` +
      `⚽ **Beach Ball** - ₦10,000/group\n` +
      `   Beach ball games and activities\n\n` +
      `🐴 **Horse Riding** - ₦3,000/ride\n` +
      `   Beach horse riding experience\n\n` +
      `You can add experiences to your booking or book them separately. Which experience interests you?`
  }

  // Dining
  if (keywords.includes('dining')) {
    if (keywords.includes('roomService')) {
      return `🛎️ **Room Service:**\n\n` +
        `24-hour room service is available! You can:\n` +
        `• Order through our Room Service page on the website\n` +
        `• Dial extension 0 from your room phone\n\n` +
        `Our menu includes breakfast, mains, desserts, and drinks. Delivery typically takes 30-45 minutes.\n\n` +
        `Would you like me to help with anything else?`
    }

    return `🍽️ **Dining at Atican Beach:**\n\n` +
      `🕐 **Hours:** Daily 7:00 AM - 11:00 PM\n` +
      `📍 **Location:** Ground Floor, Main Building, Beachfront\n` +
      `⭐ **Cuisine:** 7-star local and international dishes\n\n` +
      `**Menu Highlights:**\n` +
      `• Grilled Prawns (₦8,500) | Seafood Soup (₦6,000)\n` +
      `• Grilled Lobster (₦25,000) | Seafood Paella (₦15,000)\n` +
      `• Grilled Fish (₦12,000) | Jollof Rice (₦7,500)\n` +
      `• Coconut Panna Cotta (₦4,000) | Chocolate Lava Cake (₦5,000)\n\n` +
      `We accommodate dietary restrictions (vegetarian, vegan, gluten-free, halal).\n` +
      `Reservations recommended! Would you like to reserve a table?`
  }

  // Contact
  if (keywords.includes('contact')) {
    return `📞 **Contact Information:**\n\n` +
      `📱 **Phone:** +234 800 000 0000\n` +
      `📧 **Email:** info@aticanbeach.com\n` +
      `📍 **Address:** Atican Beach Resort & Hotel, Beachfront, Atican, Lagos, Nigeria\n\n` +
      `🕐 **Front Desk:** 24/7\n` +
      `🕐 **Concierge:** 6:00 AM - 11:00 PM\n\n` +
      `You can also use our Contact page to send us a message directly!`
  }

  // Location
  if (keywords.includes('location')) {
    return `📍 **Location:**\n\n` +
      `Atican Beach Resort & Hotel is located on the pristine beachfront of Atican, Lagos, Nigeria.\n\n` +
      `We offer complimentary secure parking for all guests, and valet parking is also available.\n\n` +
      `Would you like directions or any other information?`
  }

  // Pool
  if (keywords.includes('pool')) {
    return `🏊 **Swimming Pool:**\n\n` +
      `Yes! We have a stunning infinity pool overlooking the beach, available to all guests.\n\n` +
      `The Presidential Suite also includes a private pool for exclusive use.\n\n` +
      `Pool hours: 6:00 AM - 10:00 PM daily.`
  }

  // WiFi
  if (keywords.includes('wifi')) {
    return `📶 **WiFi:**\n\n` +
      `Yes! Complimentary high-speed WiFi is available throughout the resort:\n` +
      `• All rooms and suites\n` +
      `• Common areas and lobby\n` +
      `• Restaurant and pool area\n` +
      `• Beach area\n\n` +
      `Stay connected during your stay!`
  }

  // Parking
  if (keywords.includes('parking')) {
    return `🚗 **Parking:**\n\n` +
      `Yes! We offer:\n` +
      `• Complimentary secure parking for all guests\n` +
      `• Valet parking service available\n\n` +
      `Your vehicle will be safe during your stay.`
  }

  // Pets
  if (keywords.includes('pets')) {
    return `🐾 **Pet Policy:**\n\n` +
      `Unfortunately, pets are not allowed at the resort with the exception of service animals.\n\n` +
      `If you have specific requirements, please contact our front desk and we'll do our best to accommodate you.`
  }

  // Smoking
  if (keywords.includes('smoking')) {
    return `🚭 **Smoking Policy:**\n\n` +
      `No smoking inside rooms or indoor areas.\n\n` +
      `Designated outdoor smoking areas are available throughout the resort.`
  }

  // Gate entry
  if (keywords.includes('gate')) {
    return `🚪 **Gate Entry:**\n\n` +
      `After your booking is confirmed, you'll receive:\n` +
      `• A **QR code** via email - show at the gate scanner\n` +
      `• A **6-digit confirmation code** - can be used as backup\n\n` +
      `Simply present either at the gate for seamless entry. Your booking details will be verified automatically.`
  }

  // ID
  if (keywords.includes('id')) {
    return `🪪 **Check-in Requirements:**\n\n` +
      `Please bring:\n` +
      `• Valid government-issued ID (passport or national ID)\n` +
      `• Your booking confirmation (QR code or confirmation code)\n\n` +
      `These are required for all guests at check-in.`
  }

  // Amenities
  if (keywords.includes('amenities')) {
    return `✨ **Resort Amenities:**\n\n` +
      `🏊 Infinity pool with ocean views\n` +
      `🍽️ Ocean-view restaurant (7-star cuisine)\n` +
      `🛎️ 24-hour room service\n` +
      `📶 High-speed WiFi throughout\n` +
      `🚗 Complimentary parking + valet\n` +
      `🎯 Beach experiences & activities\n` +
      `🎪 Event spaces & premium tents\n` +
      // `💆 Spa & wellness services\n` +
      // `🏋️ Fitness center\n\n` +
      `All rooms include AC, TV, and WiFi. Higher-tier rooms include additional amenities like Mini Bar, Ocean View, Lounge, Jacuzzi, and Butler service.`
  }

  // Modify booking
  if (keywords.includes('modify')) {
    return `📋 **Modify or Cancel Booking:**\n\n` +
      `You can modify or cancel your booking:\n` +
      `• **Online:** Use your dashboard at /dashboard\n` +
      `• **Phone:** Call +234 902 962 2583\n` +
      `• **Email:** aticanbeachresort716@gmail.com\n\n` +
      `**Cancellation Policy:**\n` +
      `• 48+ hours before check-in: Full refund\n` +
      `• Within 48 hours: May incur one-night charge\n\n` +
      `Would you like help with anything else?`
  }

  // Default / Fallback
  return `Thank you for your message! I'm here to help with:\n\n` +
    `🏨 Room bookings & pricing\n` +
    `🎪 Events & tent rentals\n` +
    `🎯 Experiences (bonfire, horse riding, etc.)\n` +
    `🍽️ Dining & room service\n` +
    `📋 Policies (check-in, cancellation, payment)\n` +
    `📍 Location & contact info\n\n` +
    `Could you tell me more about what you're looking for? For example, you can ask "What rooms are available?" or "How much does the Presidential Suite cost?"`
}

export function getWelcomeMessage(): string {
  return 'Welcome to Atican Beach Resort! 🌊 I\'m your AI Receptionist. I can help with room availability, pricing, tent bookings, experiences, dining, and more. You can speak or type - whatever\'s easiest! How can I assist you today?'
}