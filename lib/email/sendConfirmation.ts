import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface ConfirmationData {
  bookingReference: string
  confirmationCode: string
  items: Array<{ name: string; price: number; quantity: number }>
  totalAmount: number
  qrCode: string
  guestName: string
  checkIn?: string
  checkOut?: string
}

export async function sendBookingConfirmation(
  email: string,
  data: ConfirmationData
) {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₦${item.price.toLocaleString()}</td>
      </tr>`
    )
    .join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Confirmation - Atican Beach Resort</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white;">
        <tr>
          <td style="background: linear-gradient(135deg, #0099ff, #ff6600); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Booking Confirmed!</h1>
            <p style="color: white; margin: 10px 0 0; font-size: 14px;">Atican Beach Resort & Hotel</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px;">
            <p>Dear ${data.guestName},</p>
            <p>Thank you for choosing Atican Beach Resort. Your booking has been confirmed.</p>
            <table style="width: 100%; background: #f9f9f9; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <tr><td><strong>Booking Reference:</strong></td><td style="text-align: right; font-size: 18px; color: #0099ff;">${data.bookingReference}</td></tr>
              <tr><td><strong>Confirmation Code:</strong></td><td style="text-align: right; font-size: 18px; color: #ff6600;">${data.confirmationCode}</td></tr>
              ${data.checkIn ? `<tr><td><strong>Check-in:</strong></td><td style="text-align: right;">${data.checkIn}</td></tr>` : ''}
              ${data.checkOut ? `<tr><td><strong>Check-out:</strong></td><td style="text-align: right;">${data.checkOut}</td></tr>` : ''}
            </table>
            <div style="text-align: center; margin: 30px 0;">
              <img src="${data.qrCode}" alt="QR Code" style="max-width: 200px;" />
              <p style="color: #666; font-size: 12px;">Show this QR code at the gate for entry</p>
            </div>
            <p>We look forward to welcoming you!</p>
          </td>
        </tr>
        <tr>
          <td style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
            <p>Atican Beach Resort & Hotel<br/>Beachfront Luxury at its Finest</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  try {
    await resend.emails.send({
      from: 'Atican Beach <bookings@aticanbeach.com>',
      to: [email],
      subject: `Booking Confirmed - ${data.bookingReference}`,
      html,
    })
  } catch (error) {
    console.error('Failed to send confirmation email:', error)
  }
}