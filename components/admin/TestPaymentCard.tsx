'use client'
/* eslint-disable react-hooks/set-state-in-effect -- restoring state from the return-from-checkout URL param after mount */

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'

type Status = 'idle' | 'creating' | 'awaiting' | 'checking' | 'paid' | 'error'

export default function TestPaymentCard() {
  const [status, setStatus] = useState<Status>('idle')
  const [reference, setReference] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const returned = params.get('test_payment')
    if (returned) {
      setReference(returned)
      setStatus('awaiting')
      setMessage('You are back from checkout. Click "Check payment status" to confirm it went through.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function runTestPayment() {
    setStatus('creating')
    setMessage('')
    setCheckoutUrl(null)

    // Open the tab synchronously, inside the click handler, so the browser treats it as a
    // direct user action instead of a blocked popup. We point it at the real URL once we have it.
    const newTab = window.open('', '_blank', 'noopener')

    try {
      const created = await fetch('/api/admin/test-payment', { method: 'POST' })
      const createdData = await created.json()
      if (!created.ok) throw new Error(createdData.error || 'Unable to create a test booking.')

      const callbackUrl = `${window.location.origin}/admin/settings?test_payment=${encodeURIComponent(createdData.bookingReference)}`
      const initialized = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: createdData.email, bookingReference: createdData.bookingReference, callbackUrl }),
      })
      const initializedData = await initialized.json()
      if (!initialized.ok) throw new Error(initializedData.error || 'Unable to start the test payment.')

      const authorizationUrl = initializedData.data?.authorization_url || initializedData.authorization_url
      setReference(createdData.bookingReference)
      setCheckoutUrl(authorizationUrl)
      setStatus('awaiting')

      if (newTab) {
        newTab.location.href = authorizationUrl
        setMessage(`Checkout opened in a new tab for ${'₦'}${createdData.amount}. Complete it, then come back and check status.`)
      } else {
        setMessage(`Your browser blocked the popup. Use the "Open checkout" link below to pay ${'₦'}${createdData.amount}, then come back and check status.`)
      }
    } catch (error) {
      newTab?.close()
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unable to run the test payment.')
    }
  }

  async function checkStatus() {
    if (!reference) return
    setStatus('checking')
    setMessage('')
    try {
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      })
      const data = await response.json()
      if (response.status === 409) {
        setStatus('awaiting')
        setMessage('Still pending. Complete the checkout in the other tab, then check again.')
        return
      }
      if (!response.ok) throw new Error(data.error || 'Unable to verify the test payment.')

      const result = data.data || data
      setStatus('paid')
      setMessage(`Confirmed: ${'₦'}${result.amount} settled via ${result.provider}. The booking pipeline is working end to end.`)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unable to verify the test payment.')
    }
  }

  const busy = status === 'creating' || status === 'checking'

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Payment Pipeline Test</h2>
      <p className="mb-4 text-sm text-gray-500">
        Runs a real {'₦'}100 checkout through the live payment provider to confirm bookings can be paid for end to end. This creates a real, tiny charge — use a card you control.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runTestPayment}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0A3D62] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#08324f] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'creating' && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === 'creating' ? 'Starting…' : `Run ${'₦'}100 test payment`}
        </button>

        {reference && (
          <button
            type="button"
            onClick={checkStatus}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'checking' && <Loader2 className="h-4 w-4 animate-spin" />}
            Check payment status
          </button>
        )}
      </div>

      {reference && (
        <p className="mt-3 text-xs text-gray-400">
          Test booking reference: <span className="font-mono">{reference}</span>
        </p>
      )}

      {checkoutUrl && status === 'awaiting' && (
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#0A3D62] underline underline-offset-2 hover:text-[#08324f]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open checkout
        </a>
      )}

      {message && status === 'paid' && (
        <div role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {message && status === 'awaiting' && (
        <div role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {message && status === 'error' && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
    </section>
  )
}
