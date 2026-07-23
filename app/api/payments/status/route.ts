import { NextResponse } from 'next/server'
import { getActivePaymentProvider } from '@/lib/payments/config'

export async function GET() {
  const provider = getActivePaymentProvider()
  return NextResponse.json({ configured: provider !== null, provider })
}
