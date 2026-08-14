'use client'
/* eslint-disable react-hooks/set-state-in-effect -- data is loaded from the authenticated API after mount */

import { useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'react-qr-code'
import { AlertCircle, BedDouble, CheckCircle2, Clock, ExternalLink, Timer } from 'lucide-react'

interface Room { id: string; room_number: string; room_type: string }
interface Booking { id: string; guest_name: string; guest_phone: string | null; guest_email: string; payment_status: string; booking_reference: string }
interface ShortRest {
  id: string; room_id: string; booking_id: string; price: number; duration_minutes: number
  started_at: string | null; ends_at: string | null; status: string; booking: Booking | null
}

const POLL_INTERVAL_MS = 15_000

export default function ShortRestPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [shortRests, setShortRests] = useState<ShortRest[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [roomId, setRoomId] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [price, setPrice] = useState(25000)
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mafrexpay'>('cash')
  const [submitting, setSubmitting] = useState(false)

  const [checkoutQr, setCheckoutQr] = useState<{ reference: string; url: string } | null>(null)
  const [verifying, setVerifying] = useState(false)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/staff/short-rests', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load short rests.')
      setRooms(data.rooms || [])
      setShortRests(data.shortRests || [])
      if (data.defaults) { setPrice(data.defaults.price); setDurationMinutes(data.defaults.durationMinutes) }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load short rests.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const dataInterval = setInterval(load, POLL_INTERVAL_MS)
    const clockInterval = setInterval(() => setNow(Date.now()), 1000)
    return () => { clearInterval(dataInterval); clearInterval(clockInterval) }
  }, [load])

  const verifyReference = useCallback(async (reference: string) => {
    setVerifying(true)
    setError('')
    try {
      const response = await fetch('/api/payments/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference }),
      })
      const data = await response.json()
      if (response.status === 409) { setError('Payment is still pending — ask the guest to complete checkout, then try again.'); return }
      if (!response.ok) throw new Error(data.error || 'Unable to verify payment.')
      setSuccess(`Payment confirmed for ${reference}.`)
      setCheckoutQr(null)
      await load()
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify payment.')
    } finally {
      setVerifying(false)
    }
  }, [load])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const reference = params.get('verify')
    if (reference) {
      window.history.replaceState({}, '', window.location.pathname)
      void verifyReference(reference)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot check for the return-from-checkout redirect
  }, [])

  async function startShortRest(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!roomId || !guestName.trim()) { setError('Please select a room and enter the guest name.'); return }

    setSubmitting(true)
    try {
      const created = await fetch('/api/staff/short-rests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, guestName, guestEmail, guestPhone, price, durationMinutes, paymentMethod }),
      })
      const createdData = await created.json()
      if (!created.ok) throw new Error(createdData.error || 'Unable to start the short rest.')

      if (paymentMethod === 'mafrexpay') {
        const reference = createdData.shortRest.reference as string
        const callbackUrl = `${window.location.origin}/staff/short-rest?verify=${encodeURIComponent(reference)}`
        const initialized = await fetch('/api/payments/initialize', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: createdData.shortRest.guest_email, bookingReference: reference, callbackUrl }),
        })
        const initializedData = await initialized.json()
        if (!initialized.ok) throw new Error(initializedData.error || 'Room reserved, but the checkout link could not be created.')
        const authorizationUrl = initializedData.data?.authorization_url || initializedData.authorization_url
        setCheckoutQr({ reference, url: authorizationUrl })
      } else {
        setSuccess(`Short rest started for room ${createdData.shortRest.room_number}.`)
      }

      setGuestName(''); setGuestEmail(''); setGuestPhone(''); setRoomId('')
      await load()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to start the short rest.')
    } finally {
      setSubmitting(false)
    }
  }

  async function endShortRest(id: string) {
    setError('')
    try {
      const response = await fetch(`/api/staff/short-rests/${id}/end`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to end the short rest.')
      await load()
    } catch (endError) {
      setError(endError instanceof Error ? endError.message : 'Unable to end the short rest.')
    }
  }

  const durationPresets = [30, 60, 90, 120]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Short Rest</h1>
        <p className="mt-1 text-sm text-gray-500">Book any available room for a short rest and track its countdown.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {checkoutQr && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Scan to pay</h2>
          <p className="mb-4 text-sm text-gray-500">Have the guest scan this with their phone to pay via MafrexPay. Reference: <span className="font-mono">{checkoutQr.reference}</span></p>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-4">
              <QRCode value={checkoutQr.url} size={160} />
            </div>
            <div className="flex flex-col gap-2">
              <a href={checkoutQr.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0A3D62] underline underline-offset-2 hover:text-[#08324f]">
                <ExternalLink className="h-3.5 w-3.5" /> Open checkout link
              </a>
              <button
                type="button"
                onClick={() => verifyReference(checkoutQr.reference)}
                disabled={verifying}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0A3D62] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#08324f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifying ? 'Checking…' : "I've collected payment — check status"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={startShortRest} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Start a short rest</h2>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Room *</label>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} required className={inputClass}>
              <option value="">{loading ? 'Loading rooms…' : rooms.length ? 'Select a room' : 'No rooms available right now'}</option>
              {rooms.map((room) => <option key={room.id} value={room.id}>{room.room_type} — Room {room.room_number}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Guest name *</label>
              <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} required className={inputClass} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
              <input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className={inputClass} placeholder="+234 800 000 0000" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email (optional)</label>
            <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className={inputClass} placeholder="Leave blank if the guest has none" />
            <p className="mt-1 text-xs text-gray-400">Needed for MafrexPay checkout — defaults to the resort&apos;s contact email if left blank.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Price (₦)</label>
              <input type="number" min={1} value={price} onChange={(e) => setPrice(Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Duration (minutes)</label>
              <input type="number" min={15} max={480} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className={inputClass} />
              <div className="mt-2 flex gap-2">
                {durationPresets.map((preset) => (
                  <button key={preset} type="button" onClick={() => setDurationMinutes(preset)} className={`rounded-md px-2 py-1 text-xs font-medium ${durationMinutes === preset ? 'bg-[#0A3D62] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {preset}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Payment method</label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPaymentMethod('cash')} className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${paymentMethod === 'cash' ? 'border-[#0A3D62] bg-[#0A3D62]/10 text-[#0A3D62]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                Cash (paid now)
              </button>
              <button type="button" onClick={() => setPaymentMethod('mafrexpay')} className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${paymentMethod === 'mafrexpay' ? 'border-[#0A3D62] bg-[#0A3D62]/10 text-[#0A3D62]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                MafrexPay (scan to pay)
              </button>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-[#0A3D62] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#08324f] disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Starting…' : 'Start short rest'}
          </button>
        </form>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Room short rests</h2>
          {shortRests.length === 0 && <p className="py-6 text-center text-sm text-gray-400">No rooms currently on short rest.</p>}
          <div className="space-y-3">
            {shortRests.map((rest) => (
              <ShortRestRow key={rest.id} rest={rest} now={now} onEnd={() => endShortRest(rest.id)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ShortRestRow({ rest, now, onEnd }: { rest: ShortRest; now: number; onEnd: () => void }) {
  const pendingPayment = rest.status === 'pending_payment'
  const remainingMs = useMemo(() => (rest.ends_at ? new Date(rest.ends_at).getTime() - now : 0), [rest.ends_at, now])
  const expired = !pendingPayment && remainingMs <= 0
  const label = pendingPayment ? 'Awaiting payment' : expired ? 'Ending…' : formatDuration(remainingMs)

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-center gap-3">
        <BedDouble className="h-5 w-5 text-[#0A3D62]" />
        <div>
          <p className="text-sm font-medium text-gray-900">{rest.booking?.guest_name || 'Guest'}</p>
          <p className="text-xs text-gray-500">₦{rest.price.toLocaleString()} · {rest.booking?.payment_status === 'paid' ? 'Paid' : 'Unpaid'}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${pendingPayment ? 'bg-blue-100 text-blue-700' : expired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
          <Timer className="h-3.5 w-3.5" />
          {label}
        </div>
        <button type="button" onClick={onEnd} className="flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <Clock className="h-3.5 w-3.5" /> {pendingPayment ? 'Cancel' : 'End now'}
        </button>
      </div>
    </div>
  )
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const hours = Math.floor(minutes / 60)
  const displayMinutes = minutes % 60
  if (hours > 0) return `${hours}h ${displayMinutes}m`
  return `${displayMinutes}:${seconds.toString().padStart(2, '0')}`
}

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0A3D62]'
