// Google Cloud TTS with Nigerian Voice
// Uses the Web Speech API as fallback for browsers without Google TTS key

let currentAudio: HTMLAudioElement | null = null
let speakingTimeout: ReturnType<typeof setTimeout> | null = null

export interface TTSSpeakOptions {
  text: string
  lang?: string
  voiceName?: string
  pitch?: number
  rate?: number
  volume?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: string) => void
}

// Use Google Cloud TTS if API key is available, otherwise fallback to browser TTS
export async function speakText(options: TTSSpeakOptions): Promise<void> {
  const { text, onStart, onEnd, onError } = options
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_TTS_KEY

  stopSpeaking()

  if (apiKey) {
    try {
      await speakWithGoogleTTS(text, apiKey, onStart, onEnd)
      return
    } catch (error) {
      console.warn('[TTS] Google TTS failed, falling back to browser:', error)
    }
  }

  // Fallback: Browser Web Speech API
  speakWithBrowserTTS(options, onStart, onEnd, onError)
}

async function speakWithGoogleTTS(
  text: string,
  apiKey: string,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  const url = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + apiKey
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'en-NG', name: 'en-NG-Standard-A' },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  })

  if (!response.ok) throw new Error('Google TTS error: ' + response.status)

  const data = await response.json()
  if (!data.audioContent) throw new Error('No audio content returned')

  onStart?.()
  const audioUrl = 'data:audio/mp3;base64,' + data.audioContent
  currentAudio = new Audio(audioUrl)

  currentAudio.onended = () => {
    currentAudio = null
    onEnd?.()
  }

  currentAudio.onerror = () => {
    currentAudio = null
    onEnd?.()
  }

  await currentAudio.play()
}

function speakWithBrowserTTS(
  options: TTSSpeakOptions,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: string) => void
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onError?.('Speech synthesis not available')
    return
  }

  const synth = window.speechSynthesis
  synth.cancel()

  const utterance = new SpeechSynthesisUtterance(options.text)
  utterance.lang = options.lang || 'en-NG'
  utterance.pitch = options.pitch ?? 1.2
  utterance.rate = options.rate ?? 0.95
  utterance.volume = options.volume ?? 1

  // Select best available voice
  const voices = synth.getVoices()
  const selectedVoice = selectBestVoice(voices, options.voiceName)
  if (selectedVoice) {
    utterance.voice = selectedVoice
    utterance.lang = selectedVoice.lang
  }

  utterance.onstart = () => onStart?.()
  utterance.onend = () => onEnd?.()
  utterance.onerror = (e) => onError?.(e.error)

  synth.speak(utterance)
}

function selectBestVoice(voices: SpeechSynthesisVoice[], preferredName?: string): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null

  // 1. Try preferred name
  if (preferredName) {
    const found = voices.find((v) => v.name === preferredName)
    if (found) return found
  }

  // 2. Nigerian female voices
  const ngFemale = voices.find(
    (v) => v.lang === 'en-NG' && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'))
  )
  if (ngFemale) return ngFemale

  // 3. Nigerian any voice
  const ngAny = voices.find((v) => v.lang === 'en-NG')
  if (ngAny) return ngAny

  // 4. English female voices by common name patterns
  const femalePatterns = ['samantha', 'victoria', 'karen', 'fiona', 'moira', 'tessa', 'zira', 'aria', 'jenny', 'guy']
  for (const pattern of femalePatterns) {
    const found = voices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes(pattern))
    if (found) return found
  }

  // 5. Any English voice with female/woman in name
  const enFemale = voices.find(
    (v) => v.lang.startsWith('en') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'))
  )
  if (enFemale) return enFemale

  // 6. British female
  const gbFemale = voices.find(
    (v) => v.lang === 'en-GB' && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'))
  )
  if (gbFemale) return gbFemale

  // 7. British any
  const gbAny = voices.find((v) => v.lang === 'en-GB')
  if (gbAny) return gbAny

  // 8. Any English voice
  const enAny = voices.find((v) => v.lang.startsWith('en'))
  if (enAny) return enAny

  // 9. First available voice
  return voices[0] || null
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  if (speakingTimeout) {
    clearTimeout(speakingTimeout)
    speakingTimeout = null
  }
}

export function isSpeaking(): boolean {
  if (currentAudio && !currentAudio.ended) return true
  if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) return true
  return false
}
