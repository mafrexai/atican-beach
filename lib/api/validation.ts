import { z } from 'zod'

export const initializePaymentSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  bookingReference: z.string().trim().min(1, 'Booking reference is required').max(40),
  callbackUrl: z.string().url('Invalid callback URL').optional(),
})

export const aiBookingSchema = z.object({
  guestName: z.string().trim().min(2, 'Guest name is required').max(120),
  guestEmail: z.string().trim().email('A valid email is required').max(200),
  guestPhone: z.string().trim().min(7).max(30).optional().or(z.literal('')),
  roomType: z.string().trim().min(2).max(80),
  checkIn: z.iso.date(),
  checkOut: z.iso.date(),
  guests: z.coerce.number().int().min(1).max(12),
  specialRequests: z.string().trim().max(1000).optional().or(z.literal('')),
})

export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>
