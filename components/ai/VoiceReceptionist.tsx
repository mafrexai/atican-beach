'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Volume2, VolumeX, Send, X,
  Minimize2, Maximize2, MessageCircle,
} from 'lucide-react'

interface Message {
  id: string
  type: 'guest' | 'ai'
  text: string
  timestamp: Date
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
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [sessionId] = useState(() => "session_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6))

  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load available voices
  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      setAvailableVoices(voices)

      // Prefer female Nigerian voice - check name patterns browsers actually use
      const preferred =
        voices.find((v) => v.lang === 'en-NG' && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'))) ||
        voices.find((v) => v.lang === 'en-NG') ||
        voices.find((v) => v.name.toLowerCase().includes('samantha')) ||
        voices.find((v) => v.name.toLowerCase().includes('zira')) ||
        voices.find((v) => v.name.toLowerCase().includes('victoria')) ||
        voices.find((v) => v.name.toLowerCase().includes('karen')) ||
        voices.find((v) => v.lang.startsWith('en') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'))) ||
        voices.find((v) => v.lang === 'en-GB' && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'))) ||
        voices.find((v) => v.lang === 'en-GB') ||
        voices.find((v) => v.lang.startsWith('en'))
      if (preferred) {
        setSelectedVoice(preferred.name)
    }
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
  }, [])

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
      addMessage('ai', 'Welcome to Atican Beach Resort! 🌊 I\'m your AI Receptionist. I can help with room availability, pricing, tent bookings, experiences, dining, and more. I can speak and respond to your voice! How can I assist you today?')
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

  // Enhanced speakText - no isOpen dependency so it always speaks
  const speakText = useCallback((text: string) => {
    if (!voiceEnabled) return
    if (!synthRef.current) return

    synthRef.current.cancel()

    setTimeout(() => {
      if (!synthRef.current) return

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-NG'
      utterance.rate = 0.95
      utterance.pitch = 1.2
      utterance.volume = 1

      if (selectedVoice) {
        const voice = availableVoices.find((v) => v.name === selectedVoice)
        if (voice) utterance.voice = voice
      }

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      synthRef.current.speak(utterance)
    }, 50)
  }, [voiceEnabled, selectedVoice, availableVoices])

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
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
        }),
      })

      const data = await response.json()
      let aiResponse = data.reply || 'I apologize, but I am having trouble responding. Please try again.'
      // Strip markdown asterisks for clean display
      aiResponse = aiResponse.replace(/\*\*/g, "").replace(/\*/g, "").replace(/^#{1,6}\s/gm, "").replace(/\s{2,}/g, " ").trim()
      addMessage('ai', aiResponse)
      // For speech: strip emojis and bullet chars for smooth TTS
      const cleanForSpeech = aiResponse.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").replace(/[-]\s*/g, "").replace(/\s{2,}/g, " ").trim()
      speakText(cleanForSpeech)
    } catch {
      const errorMsg = 'I apologize, but I\'m having technical difficulties. Please try again or call our front desk at +234 800 000 0000.'
      addMessage('ai', errorMsg)
      speakText(errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }, [inputText, isProcessing, messages, addMessage, speakText])

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
                      className="flex-1 border border-gray-200 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:border-[#0A3D62] focus:ring-1 focus:ring-[#0A3D62]/20 min-w-0 disabled:bg-gray-50"
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