import Paystack from '@paystack/paystack-sdk'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY

export const isPaystackConfigured = !!(PAYSTACK_SECRET_KEY && NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY)

let paystack: Paystack | null = null

if (isPaystackConfigured && PAYSTACK_SECRET_KEY) {
  paystack = new Paystack({ secretKey: PAYSTACK_SECRET_KEY })
}

export interface PaystackInitializeParams {
  email: string
  amount: number // Amount in Naira (will be converted to kobo)
  reference?: string
  callback_url?: string
  metadata?: Record<string, unknown>
}

export interface PaystackInitializeResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

export async function initializeTransaction(params: PaystackInitializeParams): Promise<PaystackInitializeResponse> {
  if (!paystack || !isPaystackConfigured) {
    return {
      status: false,
      message: 'Paystack is not configured. Please set PAYSTACK_SECRET_KEY and NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY environment variables.',
      data: null as any,
    }
  }

  try {
    const response = await paystack.initialize({
      email: params.email,
      amount: params.amount * 100, // Convert Naira to Kobo
      reference: params.reference,
      callback_url: params.callback_url,
      metadata: params.metadata,
    })

    return response as PaystackInitializeResponse
  } catch (error: any) {
    console.error('Paystack initialize error:', error)
    return {
      status: false,
      message: error.message || 'Failed to initialize payment',
      data: null as any,
    }
  }
}

export async function verifyTransaction(reference: string): Promise<{
  status: boolean
  message: string
  data: any
}> {
  if (!paystack || !isPaystackConfigured) {
    return {
      status: false,
      message: 'Paystack is not configured.',
      data: null,
    }
  }

  try {
    const response = await paystack.verify({ reference })
    return response as any
  } catch (error: any) {
    console.error('Paystack verify error:', error)
    return {
      status: false,
      message: error.message || 'Failed to verify payment',
      data: null,
    }
  }
}

export { PAYSTACK_SECRET_KEY, NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY }