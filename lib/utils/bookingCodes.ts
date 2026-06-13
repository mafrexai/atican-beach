export function generateBookingReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ATC-${timestamp}${random}`
}

export function generateConfirmationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}