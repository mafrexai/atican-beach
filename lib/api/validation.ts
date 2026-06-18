import { z } from 'zod'

export const initializePaymentSchema = z.object({
  email: z.string().email('Invalid email address'),
  amount: z.number().positive('Amount must be greater than 0'),
  bookingReference: z.string().min(1, 'Booking reference is required'),
  callbackUrl: z.string().url('Invalid callback URL').optional(),
})

export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>