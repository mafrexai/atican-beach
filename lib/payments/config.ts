import 'server-only'

import { isMafrexPayConfigured, isMafrexPayEnabled } from '@/lib/mafrexpay'
import { isPaystackConfigured } from '@/lib/paystack'

export type PaymentProvider = 'mafrexpay' | 'paystack'

export function getActivePaymentProvider(): PaymentProvider | null {
  if (isMafrexPayEnabled) return isMafrexPayConfigured ? 'mafrexpay' : null
  return isPaystackConfigured ? 'paystack' : null
}
