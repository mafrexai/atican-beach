import 'server-only'

const baseUrl = (process.env.MAFREXPAY_BASE_URL || 'https://www.mafrexai.com').replace(/\/+$/, '')
const apiKey = process.env.MAFREXPAY_API_KEY

export const isMafrexPayEnabled = process.env.MAFREXPAY_ENABLED?.toLowerCase() === 'true'
export const isMafrexPayConfigured = Boolean(apiKey && baseUrl)

export interface MafrexPayOrder {
  payment_order_id: string
  order_reference: string
  external_reference: string
  status: string
  amount_minor: number
  amount: number
  currency: string
  provider: string
  provider_reference?: string | null
  checkout_url?: string | null
  paid_at?: string | null
  reused?: boolean
}

interface CreateOrderInput {
  reference: string
  amountMinor: number
  customer: { name: string; email: string; phone?: string | null }
  context: Record<string, unknown>
  successUrl: string
  cancelUrl: string
}

export class MafrexPayError extends Error {
  constructor(
    message: string,
    public readonly code = 'MAFREXPAY_ERROR',
    public readonly status = 502,
    public readonly requestId?: string
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiKey) throw new MafrexPayError('MafrexPay is not configured.', 'MAFREXPAY_NOT_CONFIGURED', 503)

  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch {
    throw new MafrexPayError('MafrexPay is temporarily unreachable. Please try again shortly.', 'MAFREXPAY_UNAVAILABLE')
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const error = payload?.error
    throw new MafrexPayError(
      error?.message || 'MafrexPay could not process the request.',
      error?.code || 'MAFREXPAY_ERROR',
      response.status,
      error?.request_id
    )
  }

  return payload as T
}

export function createPaymentOrder(input: CreateOrderInput) {
  return request<MafrexPayOrder>('/api/v1/mafrexpay/payment-orders', {
    method: 'POST',
    body: JSON.stringify({
      reference: input.reference,
      amount_minor: input.amountMinor,
      currency: 'NGN',
      customer: input.customer,
      context: input.context,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    }),
  })
}

export function getPaymentOrder(orderReference: string) {
  return request<MafrexPayOrder>(
    `/api/v1/mafrexpay/payment-orders/${encodeURIComponent(orderReference)}`
  )
}
