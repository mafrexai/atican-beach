const units: string[] = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const tens: string[] = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const scales: string[] = ['', 'thousand', 'million', 'billion']

function numberToWords(num: number): string {
  if (num === 0) return 'zero'
  if (num < 0) return 'negative ' + numberToWords(-num)
  if (num < 20) return units[num] || String(num)
  if (num < 100) {
    const t = Math.floor(num / 10)
    const u = num % 10
    return (tens[t] || '') + (u ? '-' + (units[u] || String(u)) : '')
  }
  if (num < 1000) {
    const h = Math.floor(num / 100)
    const rest = num % 100
    return (units[h] || String(h)) + ' hundred' + (rest ? ' and ' + numberToWords(rest) : '')
  }
  for (let i = scales.length - 1; i >= 1; i--) {
    const scaleVal = Math.pow(1000, i)
    if (num >= scaleVal) {
      const prefix = Math.floor(num / scaleVal)
      const remainder = num % scaleVal
      return numberToWords(prefix) + ' ' + (scales[i] || '') + (remainder ? ' ' + numberToWords(remainder) : '')
    }
  }
  return String(num)
}

export function formatForSpeech(text: string): string {
  let formatted = text

  // Replace price patterns: N55,000/night, 55,000/night, etc.
  formatted = formatted.replace(/([N\u20A6])?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?)\s*(?:\/\s*|\s+per\s+)?\s*(night|day|person|hour|week|month|group|ride)?/gi, (_match, currency, numStr, unit) => {
    const num = parseInt(numStr.replace(/,/g, ''), 10)
    const words = numberToWords(num)
    const currText = currency ? 'Naira ' : 'Naira '
    const unitText = unit ? ' ' + unit : ''
    return currText + words + unitText
  })

  // Replace standalone decimals: 2.5 guests
  formatted = formatted.replace(/\b(\d+\.\d+)\b/g, (match) => {
    const parts = match.split('.')
    const intPart = numberToWords(parseInt(parts[0] || "0", 10))
    const decPart = (parts[1] || "0").split('').map((d) => units[parseInt(d)] || d).join(' ')
    return intPart + ' point ' + decPart
  })

  // Replace standalone numbers with units
  formatted = formatted.replace(/\b(\d+)\s*(guests?|people|persons?|rooms?|nights?|days?|tables?|chairs?)\b/gi, (_match, num, unit) => {
    return numberToWords(parseInt(num, 10)) + ' ' + unit
  })

  // Replace years: 2024
  formatted = formatted.replace(/\b(19|20)(\d{2})\b/g, (_m, prefix, suffix) => {
    return numberToWords(parseInt(prefix + suffix, 10))
  })

  // Clean up markdown remnants
  formatted = formatted.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#{1,6}\s/gm, '').replace(/\s{2,}/g, ' ').trim()

  return formatted
}

export { numberToWords }
