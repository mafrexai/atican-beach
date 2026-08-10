'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CalendarCheck, CheckCircle2, Database, KeyRound, Loader2, RefreshCw, Server, ShieldCheck } from 'lucide-react'

interface SyncActivity {
  id: string
  action: string
  summary: string
  severity: string
  details: Record<string, unknown>
  created_at: string
}

interface SyncStatus {
  configuration: { configured: boolean; baseUrl: string; externalSource: string; keyPrefix: string | null }
  inventory: { rooms: number; categories: number; activeBookings: number }
  queue: { pending: number; processing: number; failed: number; available: boolean }
  recentActivity: SyncActivity[]
}

type SyncAction = 'test' | 'categories' | 'rooms' | 'bookings' | 'checkins' | 'all'

export default function ManagerPropertySyncPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<SyncAction | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/manager/property-sync', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load Property Sync status.')
      setStatus(data)
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to load Property Sync status.' })
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function run(action: SyncAction) {
    if (action !== 'test' && !window.confirm(action === 'all' ? 'Push all current room categories and rooms to MafrexAI?' : action === 'bookings' ? 'Push all active and future room bookings to MafrexAI?' : action === 'checkins' ? 'Push check-in and check-out activity from the last 30 days to MafrexAI?' : `Push current ${action} to MafrexAI?`)) return
    setRunning(action); setMessage(null)
    try {
      const response = await fetch('/api/manager/property-sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Property Sync failed.')
      const text = action === 'test'
        ? 'Connection verified. MafrexAI accepted the Property Sync credential.'
        : action === 'all'
          ? 'Room categories and rooms were submitted successfully.'
          : action === 'bookings' ? `${data.submitted || 0} active bookings were submitted successfully.` : action === 'checkins' ? `${data.submitted || 0} stay events were submitted successfully.` : `${action === 'categories' ? 'Room categories' : 'Rooms'} were submitted successfully.`
      setMessage({ type: 'success', text })
      await load()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Property Sync failed.' })
    } finally { setRunning(null) }
  }

  if (loading && !status) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-[#0A3D62]" /></div>

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-[#082032]">Property Sync</h1><p className="mt-1 text-sm text-gray-500">Securely publish Atican inventory and active bookings to MafrexAI without exposing integration keys in the browser.</p></div>

    {message && <div role="alert" className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}<p>{message.text}</p></div>}

    <div className="grid gap-4 md:grid-cols-3">
      <StatusCard icon={KeyRound} label="Connection" value={status?.configuration.configured ? 'Configured' : 'Not configured'} detail={status?.configuration.keyPrefix ? `Key ${status.configuration.keyPrefix}…` : 'Add the server environment key'} good={Boolean(status?.configuration.configured)} />
      <StatusCard icon={Database} label="Local inventory" value={`${status?.inventory.rooms || 0} rooms`} detail={`${status?.inventory.categories || 0} room categories`} good />
      <StatusCard icon={Server} label="Destination" value="MafrexAI" detail={status?.configuration.baseUrl || 'https://www.mafrexai.com'} good={Boolean(status?.configuration.configured)} />
    </div>

    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-6 w-6 text-[#0A3D62]" /><div><h2 className="font-bold text-[#082032]">Manual inventory synchronization</h2><p className="mt-1 text-sm leading-6 text-gray-500">Categories are sent before rooms so every room can be linked correctly. Repeating the same unchanged payload is safe because Atican uses deterministic idempotency keys.</p></div></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ActionButton label="Test connection" action="test" running={running} configured={Boolean(status?.configuration.configured)} onRun={run} />
        <ActionButton label="Push categories" action="categories" running={running} configured={Boolean(status?.configuration.configured)} onRun={run} />
        <ActionButton label="Push rooms" action="rooms" running={running} configured={Boolean(status?.configuration.configured)} onRun={run} />
        <ActionButton label="Sync inventory" action="all" running={running} configured={Boolean(status?.configuration.configured)} primary onRun={run} />
      </div>
      {!status?.configuration.configured && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">Set <code>MAFREXAI_PROPERTY_SYNC_KEY</code> in the server environment before testing or synchronizing.</p>}
    </section>

    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3"><CalendarCheck className="mt-0.5 h-6 w-6 text-[#0A3D62]" /><div><h2 className="font-bold text-[#082032]">Booking synchronization</h2><p className="mt-1 text-sm leading-6 text-gray-500">Backfill pending, confirmed, in-house, and future room stays. New booking and payment changes are queued automatically and retried without delaying the guest booking flow.</p></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatusCard icon={CalendarCheck} label="Active bookings" value={String(status?.inventory.activeBookings || 0)} detail="Eligible for manual backfill" good />
        <StatusCard icon={RefreshCw} label="Automatic queue" value={status?.queue.available ? `${status.queue.pending + status.queue.processing} waiting` : 'Migration required'} detail={status?.queue.available ? 'Dispatched every 10 minutes' : 'Run the booking outbox migration'} good={Boolean(status?.queue.available)} />
        <StatusCard icon={AlertCircle} label="Failed delivery" value={String(status?.queue.failed || 0)} detail="Retried up to eight times" good={!status?.queue.failed} />
      </div>
      <div className="mt-5 grid max-w-2xl gap-3 sm:grid-cols-2"><ActionButton label="Push active bookings" action="bookings" running={running} configured={Boolean(status?.configuration.configured)} primary onRun={run} /><ActionButton label="Push recent stay activity" action="checkins" running={running} configured={Boolean(status?.configuration.configured)} onRun={run} /></div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4"><h2 className="font-bold text-[#082032]">Recent Property Sync activity</h2><p className="mt-1 text-xs text-gray-500">Detailed item results remain available in the MafrexAI Property Sync dashboard.</p></div>
      <div className="divide-y divide-gray-100">
        {!status?.recentActivity.length && <p className="p-8 text-center text-sm text-gray-400">No inventory synchronization has been attempted yet.</p>}
        {status?.recentActivity.map((activity) => <div key={activity.id} className="flex items-start gap-3 px-6 py-4"><div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${activity.severity === 'warning' || activity.severity === 'critical' ? 'bg-red-500' : 'bg-green-500'}`} /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-gray-800">{activity.summary}</p><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400"><span>{new Date(activity.created_at).toLocaleString('en-NG')}</span>{typeof activity.details?.runId === 'string' && <span className="font-mono">Run {activity.details.runId}</span>}{typeof activity.details?.requestId === 'string' && <span className="font-mono">Request {activity.details.requestId}</span>}</div></div></div>)}
      </div>
    </section>
  </div>
}

function StatusCard({ icon: Icon, label, value, detail, good }: { icon: typeof KeyRound; label: string; value: string; detail: string; good: boolean }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><Icon className="h-6 w-6 text-[#0A3D62]" /><span className={`h-2.5 w-2.5 rounded-full ${good ? 'bg-green-500' : 'bg-amber-500'}`} /></div><p className="mt-5 text-xs font-bold uppercase tracking-[.14em] text-gray-400">{label}</p><p className="mt-1 font-bold text-[#082032]">{value}</p><p className="mt-1 truncate text-xs text-gray-500">{detail}</p></div>
}

function ActionButton({ label, action, running, configured, primary = false, onRun }: { label: string; action: SyncAction; running: SyncAction | null; configured: boolean; primary?: boolean; onRun: (action: SyncAction) => void }) {
  const busy = running !== null
  return <button disabled={!configured || busy} onClick={() => onRun(action)} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${primary ? 'bg-[#F97316] text-white hover:bg-[#e2670e]' : 'border border-gray-200 bg-white text-[#082032] hover:bg-gray-50'}`}>{running === action ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{label}</button>
}
