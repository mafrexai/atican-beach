// Format text for natural TTS pronunciation
// Converts numbers like 55,000 to fifty-five thousand

const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const scales = ['', 'thousand', 'million', 'billion']

function numberToWords(num: number): string {
  if (num === 0) return 'zero'
  if (num < 0) return 'negative ' + numberToWords(-num)
  if (num < 20) return units[num]
  if (num < 100) {
    const t = Math.floor(num / 10)
    const u = num % 10
    return tens[t] + (u ? '-' + units[u] : '')
  }
  if (num < 1000) {
    const h = Math.floor(num / 100)
    const rest = num % 100
    return units[h] + ' hundred' + (rest ? ' and ' + numberToWords(rest) : '')
  }
  for (let i = scales.length - 1; i >= 1; i--) {
    const scaleVal = Math.pow(1000, i)
    if (num >= scaleVal) {
      const prefix = Math.floor(num / scaleVal)
      const remainder = num % scaleVal
      return numberToWords(prefix) + ' ' + scales[i] + (remainder ? ' ' + numberToWords(remainder) : '')
    }
  }
  return String(num)
}

export function formatForSpeech(text: string): string {
  let formatted = text

  // Replace price patterns: N55,000/night, ₦55,000/night, 55,000/night, N55,000 per night, etc.
  formatted = formatted.replace(/([N\u20A6])?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?)\s*(?:\/\s*|\s+per\s+)?\s*(night|day|person|hour|week|month|group|ride)?/gi, (match, currency, numStr, unit) => {
    const num = parseInt(numStr.replace(/,/g, ''), 10)
    const words = numberToWords(num)
    const currText = currency ? 'Naira ' : 'Naira '
    const unitText = unit ? ' ' + unit : ''
    return currText + words + unitText
  })

  // Replace standalone decimals: 2.5 guests → two point five guests
  formatted = formatted.replace(/\b(\d+\.\d+)\b/g, (match) => {
    const parts = match.split('.')
    return numberToWords(parseInt(parts[0], 10)) + ' point ' + parseInt(parts[1], 10).toString().split('').map((d) => units[parseInt(d)] || d).join(' ')
  })

  // Replace standalone numbers: 2 guests → two guests, 6 rooms → six rooms
  formatted = formatted.replace(/\b(\d+)\s*(guests?|people|persons?|rooms?|nights?|days?|tables?|chairs?)\b/gi, (match, num, unit) => {
    return numberToWords(parseInt(num, 10)) + ' ' + unit
  })

  // Replace year-like numbers: 2024 → twenty twenty-four
  formatted = formatted.replace(/\b(19|20)(\d{2})\b/g, (_, prefix, suffix) => {
    return numberToWords(parseInt(prefix + suffix, 10))
  })

  // Clean up markdown remnants
  formatted = formatted.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#{1,6}\s/gm, '').replace(/\s{2,}/g, ' ').trim()

  return formatted
}

export { numberToWords }
