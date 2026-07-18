'use client'
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/immutability, react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization, react-hooks/exhaustive-deps */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Volume2, VolumeX, Send, X,
  Minimize2, Maximize2, MessageCircle, CalendarDays,
  Users, CreditCard, CheckCircle2,
} from 'lucide-react'
import { speakText as ttsSpeakText } from '@/lib/tts'
import { formatForSpeech } from '@/lib/formatSpeech'

interface Message {
  id: string
  type: 'guest' | 'ai'
  text: string
  timestamp: Date
}

function formatReceptionistDisplay(text: string): string {
  return text
    .replace(/₦\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)(?:\s+Naira)?/gi, '₦$1')
    .replace(/\b(?:NGN|N)\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)(?:\s+Naira)?/gi, '₦$1')
    .replace(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s+Naira(?:\s+Naira)*/gi, '₦$1')
}

function getReceptionistWelcome(): string {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return `${greeting}! Welcome to Atican Beach Resort & Hotel. I’m Mafrex, your receptionist. I can assist with rooms, tent bookings, dining, experiences, and resort information. How may I help you today?`
}

export function VoiceReceptionist() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [sessionId] = useState(() => "session_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6))
  const [bookingDraft, setBookingDraft] = useState<BookingDraft>(emptyBookingDraft)
  const [bookingStep, setBookingStep] = useState<'closed' | 'details' | 'review' | 'submitting' | 'complete'>('closed')
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null)
  const [bookingError, setBookingError] = useState('')
  const [isStartingPayment, setIsStartingPayment] = useState(false)

  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return

    synthRef.current = window.speechSynthesis

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-NG'

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInputText(transcript)
        handleSendMessage(transcript)
        setIsListening(false)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
        addMessage('ai', 'I couldn\'t hear you clearly. Could you type your message or try speaking again?')
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    return () => {
      if (synthRef.current) synthRef.current.cancel()
    }
  }, [])

  // Load saved messages
  useEffect(() => {
    const saved = localStorage.getItem('receptionist_messages')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })))
      } catch {
        // Invalid data, start fresh
      }
    } else {
      addMessage('ai', getReceptionistWelcome())
    }
  }, [])

  // Save messages
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('receptionist_messages', JSON.stringify(messages))
    }
  }, [messages])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = useCallback((type: 'guest' | 'ai', text: string) => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      type,
      text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMessage])
    if (type === 'ai' && !isOpen) {
      setUnreadCount((prev) => prev + 1)
    }
  }, [isOpen])

  // Speak using Google TTS or browser fallback with Nigerian voice
  const speakTextLocally = useCallback((text: string) => {
    if (!voiceEnabled) return
    try {
      ttsSpeakText({
        text: text,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      })
    } catch {
      setIsSpeaking(false)
    }
  }, [voiceEnabled])
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
  }, [])

  const handleSendMessage = useCallback(async (text?: string) => {
    const messageText = text || inputText
    if (!messageText.trim() || isProcessing) return

    const guestMessage = messageText.trim()
    setInputText('')
    setIsProcessing(true)
    addMessage('guest', guestMessage)

    try {
      const response = await fetch('/api/ai/receptionist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: guestMessage,
          conversationHistory: messages.slice(-10),
          sessionId,
        }),
      })

      const data = await response.json()
      let aiResponse = data.reply || 'I\'m sorry, I\'m unable to retrieve that information at the moment. Please try again shortly.'
      // Strip markdown asterisks for clean display
      aiResponse = formatReceptionistDisplay(aiResponse.replace(/\*\*/g, "").replace(/\*/g, "").replace(/^#{1,6}\s/gm, "").replace(/\s{2,}/g, " ").trim())
      addMessage('ai', aiResponse)
      if (data.isBooking && bookingStep === 'closed') {
        setBookingDraft((current) => ({
          ...current,
          roomType: data.bookingDetails?.roomType || current.roomType,
          guests: data.bookingDetails?.guests || current.guests,
        }))
        setBookingStep('details')
      }
      // For speech: strip emojis and bullet chars for smooth TTS
      const cleanForSpeech = aiResponse.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").replace(/[-]\s*/g, "").replace(/\s{2,}/g, " ").trim()
       const speechReady = formatForSpeech(cleanForSpeech)
       speakTextLocally(speechReady)
    } catch {
      const errorMsg = 'I\'m sorry, I\'m unable to retrieve that information at the moment. Please try again shortly or contact our front desk on +234 902 962 2583.'
      addMessage('ai', errorMsg)
      speakTextLocally(errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }, [inputText, isProcessing, messages, addMessage, speakTextLocally, sessionId, bookingStep])


  const reviewBooking = () => {
    setBookingError('')
    if (!bookingDraft.guestName.trim() || !bookingDraft.guestEmail.trim() || !bookingDraft.checkIn || !bookingDraft.checkOut) {
      setBookingError('Please complete your name, email, check-in, and check-out dates.')
      return
    }
    if (bookingDraft.checkOut <= bookingDraft.checkIn) {
      setBookingError('Check-out must be after check-in.')
      return
    }
    setBookingStep('review')
  }

  const confirmBooking = async () => {
    setBookingStep('submitting')
    setBookingError('')
    try {
      const response = await fetch('/api/ai/book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookingDraft),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to create your reservation.')
      setBookingResult(result.booking)
      setBookingStep('complete')
      addMessage('ai', `Your room is reserved under ${result.booking.reference}. It will be confirmed after secure payment.`)
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Unable to create your reservation.')
      setBookingStep('review')
    }
  }

  const startPayment = async () => {
    if (!bookingResult) return
    setIsStartingPayment(true)
    setBookingError('')
    try {
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: bookingResult.guestEmail,
          bookingReference: bookingResult.reference,
          callbackUrl: `${window.location.origin}/booking/confirmation?ref=${bookingResult.reference}`,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to start payment.')
      window.location.assign(result.data.authorization_url)
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Unable to start payment.')
      setIsStartingPayment(false)
    }
  }

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        // Cancel any ongoing speech before listening
        if (synthRef.current) {
          synthRef.current.cancel()
          setIsSpeaking(false)
        }
        recognitionRef.current.start()
        setIsListening(true)
      } catch {
        addMessage('ai', 'Please allow microphone access to use voice input.')
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => {
          setIsOpen(true)
          setUnreadCount(0)
        }}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-gradient-to-r from-[#0A3D62] to-[#082032] text-white p-3 sm:p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
        aria-label="Open AI Receptionist chat"
      >
        <div className="relative">
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-2 -right-2 bg-[#F97316] text-white text-[10px] sm:text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center animate-pulse font-bold">
              {unreadCount}
            </span>
          )}
        </div>
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed z-50 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 transition-all duration-300 ${
              isMinimized
                ? 'bottom-16 right-4 sm:bottom-20 sm:right-6 w-[280px] sm:w-[320px] h-14'
                : 'bottom-16 right-2 sm:bottom-20 sm:right-6 w-[calc(100vw-1rem)] sm:w-[380px] max-w-[420px] h-[400px] sm:h-[520px] max-h-[70vh]'
            }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0A3D62] to-[#082032] text-white p-3 sm:p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 ${
                  isListening ? 'bg-[#F97316] animate-pulse' : isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-green-400'
                }`} />
                <div className="min-w-0">
                  <h3 className="font-semibold text-xs sm:text-sm truncate">AI Receptionist</h3>
                  <p className="text-[10px] sm:text-xs opacity-80 truncate">
                    {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Voice enabled'}
                  </p>
                </div>
              </div>
              <div className="flex gap-0.5 sm:gap-1 shrink-0">
                {/* Voice toggle */}
                <button
                  onClick={() => {
                    if (voiceEnabled) stopSpeaking()
                    setVoiceEnabled(!voiceEnabled)
                  }}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                    voiceEnabled ? 'hover:bg-white/20' : 'bg-red-500/50 text-white/60'
                  }`}
                  title={voiceEnabled ? 'Voice output on' : 'Voice output off'}
                >
                  {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
                {!isMinimized && (
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                      isListening ? 'bg-[#F97316] text-white animate-pulse' : 'hover:bg-white/20'
                    }`}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </button>
                )}
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition"
                >
                  {isMinimized ? <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 bg-[#F5F1E8] min-h-0">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.type === 'guest' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-2.5 sm:p-3 rounded-2xl text-xs sm:text-sm break-words ${
                          message.type === 'guest'
                            ? 'bg-[#0A3D62] text-white rounded-br-sm'
                            : 'bg-white text-[#082032] rounded-bl-sm shadow-sm'
                        }`}
                      >
                        {message.text}
                      </div>
                    </motion.div>
                  ))}

                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-white p-2.5 sm:p-3 rounded-2xl rounded-bl-sm shadow-sm">
                        <div className="flex gap-1 sm:gap-1.5">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#F97316] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#F97316] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#F97316] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {bookingStep !== 'closed' && (
                    <div className="rounded-2xl border border-[#0A3D62]/15 bg-white p-3 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F97316]">Secure reservation</p>
                          <p className="text-sm font-semibold text-[#082032]">
                            {bookingStep === 'details' && 'Tell us about your stay'}
                            {(bookingStep === 'review' || bookingStep === 'submitting') && 'Review before reserving'}
                            {bookingStep === 'complete' && 'Room reserved'}
                          </p>
                        </div>
                        {bookingStep !== 'submitting' && bookingStep !== 'complete' && (
                          <button type="button" onClick={() => setBookingStep('closed')} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Close booking form"><X className="h-4 w-4" /></button>
                        )}
                      </div>

                      {bookingStep === 'details' && (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-2 gap-2">
                            <input aria-label="Full name" placeholder="Full name" value={bookingDraft.guestName} onChange={(e) => setBookingDraft({ ...bookingDraft, guestName: e.target.value })} className="col-span-2 rounded-lg border border-gray-200 px-2.5 py-2 text-xs text-gray-900 outline-none focus:border-[#0A3D62]" />
                            <input aria-label="Email" type="email" placeholder="Email address" value={bookingDraft.guestEmail} onChange={(e) => setBookingDraft({ ...bookingDraft, guestEmail: e.target.value })} className="col-span-2 rounded-lg border border-gray-200 px-2.5 py-2 text-xs text-gray-900 outline-none focus:border-[#0A3D62]" />
                            <input aria-label="Phone" type="tel" placeholder="Phone number" value={bookingDraft.guestPhone} onChange={(e) => setBookingDraft({ ...bookingDraft, guestPhone: e.target.value })} className="col-span-2 rounded-lg border border-gray-200 px-2.5 py-2 text-xs text-gray-900 outline-none focus:border-[#0A3D62]" />
                            <select aria-label="Room type" value={bookingDraft.roomType} onChange={(e) => setBookingDraft({ ...bookingDraft, roomType: e.target.value })} className="col-span-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-900 outline-none focus:border-[#0A3D62]">
                              {roomTypes.map((roomType) => <option key={roomType}>{roomType}</option>)}
                            </select>
                            <label className="text-[10px] font-medium text-gray-500"><span className="mb-1 flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Check-in</span><input type="date" min={new Date().toISOString().split('T')[0]} value={bookingDraft.checkIn} onChange={(e) => setBookingDraft({ ...bookingDraft, checkIn: e.target.value })} className="w-full rounded-lg border border-gray-200 px-2 py-2 text-xs text-gray-900" /></label>
                            <label className="text-[10px] font-medium text-gray-500"><span className="mb-1 flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Check-out</span><input type="date" min={bookingDraft.checkIn || new Date().toISOString().split('T')[0]} value={bookingDraft.checkOut} onChange={(e) => setBookingDraft({ ...bookingDraft, checkOut: e.target.value })} className="w-full rounded-lg border border-gray-200 px-2 py-2 text-xs text-gray-900" /></label>
                            <label className="col-span-2 text-[10px] font-medium text-gray-500"><span className="mb-1 flex items-center gap-1"><Users className="h-3 w-3" /> Guests</span><input type="number" min="1" max="12" value={bookingDraft.guests} onChange={(e) => setBookingDraft({ ...bookingDraft, guests: Number(e.target.value) })} className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs text-gray-900" /></label>
                            <textarea aria-label="Special requests" placeholder="Special requests (optional)" value={bookingDraft.specialRequests} onChange={(e) => setBookingDraft({ ...bookingDraft, specialRequests: e.target.value })} className="col-span-2 resize-none rounded-lg border border-gray-200 px-2.5 py-2 text-xs text-gray-900 outline-none focus:border-[#0A3D62]" rows={2} />
                          </div>
                          <button type="button" onClick={reviewBooking} className="w-full rounded-lg bg-[#0A3D62] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#08324f]">Review reservation</button>
                        </div>
                      )}

                      {(bookingStep === 'review' || bookingStep === 'submitting') && (
                        <div className="space-y-3 text-xs text-gray-600">
                          <div className="rounded-xl bg-[#F5F1E8] p-3">
                            <p className="font-semibold text-[#082032]">{bookingDraft.roomType} · {bookingDraft.guests} guest{bookingDraft.guests === 1 ? '' : 's'}</p>
                            <p className="mt-1">{bookingDraft.checkIn} → {bookingDraft.checkOut}</p>
                            <p className="mt-1">{bookingDraft.guestName} · {bookingDraft.guestEmail}</p>
                          </div>
                          <p className="text-[10px] leading-relaxed text-gray-500">We will reserve an available room for these exact dates. Your stay becomes confirmed only after Paystack verifies payment.</p>
                          <div className="flex gap-2">
                            <button type="button" disabled={bookingStep === 'submitting'} onClick={() => setBookingStep('details')} className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 font-semibold text-gray-600 disabled:opacity-50">Edit</button>
                            <button type="button" disabled={bookingStep === 'submitting'} onClick={confirmBooking} className="flex-1 rounded-lg bg-[#F97316] px-3 py-2.5 font-semibold text-white disabled:opacity-60">{bookingStep === 'submitting' ? 'Reserving…' : 'Reserve room'}</button>
                          </div>
                        </div>
                      )}

                      {bookingStep === 'complete' && bookingResult && (
                        <div className="space-y-3 text-xs">
                          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-emerald-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-semibold">Reference {bookingResult.reference}</p><p className="mt-1">{bookingResult.roomType}, room {bookingResult.roomNumber} · ₦{bookingResult.totalAmount.toLocaleString()}</p></div></div>
                          <button type="button" onClick={startPayment} disabled={isStartingPayment} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A3D62] px-3 py-2.5 font-semibold text-white disabled:opacity-60"><CreditCard className="h-4 w-4" />{isStartingPayment ? 'Opening Paystack…' : 'Pay securely with Paystack'}</button>
                        </div>
                      )}

                      {bookingError && <p role="alert" className="mt-2 rounded-lg bg-red-50 p-2 text-[11px] text-red-700">{bookingError}</p>}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Listening Indicator */}
                {isListening && (
                  <div className="bg-[#F97316]/10 px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-center gap-2 shrink-0">
                    <div className="flex gap-0.5 sm:gap-1">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: [6, 18, 6] }}
                          transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
                          className="w-0.5 sm:w-1 bg-[#F97316] rounded-full"
                        />
                      ))}
                    </div>
                    <span className="text-[10px] sm:text-xs text-[#F97316] font-medium">Listening...</span>
                  </div>
                )}

                {/* Speaking indicator */}
                {isSpeaking && !isListening && (
                  <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#0A3D62]/5 flex items-center justify-center gap-2 shrink-0">
                    <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0A3D62] animate-pulse" />
                    <span className="text-[10px] sm:text-xs text-[#0A3D62]">AI is speaking...</span>
                    <button onClick={stopSpeaking} className="text-[10px] sm:text-xs text-[#F97316] hover:underline ml-1">
                      Stop
                    </button>
                  </div>
                )}

                {/* Input Area */}
                <div className="p-2.5 sm:p-3 border-t border-gray-200 bg-white shrink-0">
                  <div className="flex gap-1.5 sm:gap-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder={isListening ? 'Listening...' : 'Type or click the mic to speak...'}
                      disabled={isListening}
                      className="flex-1 border border-gray-200 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:border-[#0A3D62] focus:ring-1 focus:ring-[#0A3D62]/20 min-w-0 disabled:bg-gray-50 text-black placeholder-gray-500"
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!inputText.trim() || isProcessing || isListening}
                      className="bg-[#F97316] text-white p-1.5 sm:p-2 rounded-xl hover:bg-[#e0650f] transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                  <div className="flex justify-between mt-1 sm:mt-1.5 text-[9px] sm:text-[10px] text-gray-400 px-0.5 sm:px-1">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span className={`flex items-center gap-0.5 shrink-0 ${voiceEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                        {voiceEnabled ? <Volume2 className="w-2.5 h-2.5" /> : <VolumeX className="w-2.5 h-2.5" />}
                        Voice {voiceEnabled ? 'on' : 'off'}
                      </span>
                      <span className="truncate">🎤 Click mic and speak</span>
                    </div>
                    {isSpeaking && (
                      <button onClick={stopSpeaking} className="text-[#F97316] hover:underline shrink-0">
                        Stop speaking
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

interface BookingDraft {
  guestName: string
  guestEmail: string
  guestPhone: string
  roomType: string
  checkIn: string
  checkOut: string
  guests: number
  specialRequests: string
}

interface BookingResult {
  reference: string
  roomType: string
  roomNumber: string
  checkIn: string
  checkOut: string
  nights: number
  totalAmount: number
  guestEmail: string
}

const roomTypes = ['Standard', 'Deluxe', 'Double Bed', 'Family', 'Executive', 'Premium Suite', 'Executive Suite', 'Presidential Suite']

const emptyBookingDraft: BookingDraft = {
  guestName: '', guestEmail: '', guestPhone: '', roomType: 'Deluxe',
  checkIn: '', checkOut: '', guests: 2, specialRequests: '',
}
