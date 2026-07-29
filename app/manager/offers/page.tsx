'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgePercent, Loader2, Pencil, Plus, Power, Trash2, X } from 'lucide-react'

type TargetType = 'room' | 'experience' | 'tent' | 'event_space' | 'public_event'

interface CatalogItem { id: string; type: TargetType; name: string; price: number }
interface OfferRow {
  id: string; title: string; description: string; target_type: TargetType; target_id: string
  offer_price: number | null; cta_text: string; audience_page: string; priority: number
  starts_at: string | null; ends_at: string | null; is_active: boolean
}

const emptyForm = {
  id: '', title: '', description: '', targetType: 'experience' as TargetType, targetId: '',
  offerPrice: '', ctaText: 'View offer', audiencePage: 'any', priority: '5',
  startsAt: '', endsAt: '', isActive: true,
}

export default function ManagerOffersPage() {
  const [offers, setOffers] = useState<OfferRow[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch('/api/manager/concierge-offers', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) setError(data.error || 'Unable to load offers.')
    else { setOffers(data.offers); setCatalog(data.catalog); setError('') }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const availableTargets = useMemo(() => catalog.filter((item) => item.type === form.targetType), [catalog, form.targetType])
  const selectedItem = catalog.find((item) => item.id === form.targetId)

  function startCreate() { setForm(emptyForm); setShowForm(true); setError('') }
  function startEdit(offer: OfferRow) {
    setForm({
      id: offer.id, title: offer.title, description: offer.description, targetType: offer.target_type,
      targetId: offer.target_id, offerPrice: offer.offer_price === null ? '' : String(offer.offer_price),
      ctaText: offer.cta_text, audiencePage: offer.audience_page, priority: String(offer.priority),
      startsAt: toLocalDateTime(offer.starts_at), endsAt: toLocalDateTime(offer.ends_at), isActive: offer.is_active,
    })
    setShowForm(true); setError('')
  }

  async function saveOffer(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    const payload = {
      ...(form.id ? { id: form.id } : {}), title: form.title, description: form.description,
      targetType: form.targetType, targetId: form.targetId,
      offerPrice: form.offerPrice === '' ? null : Number(form.offerPrice), ctaText: form.ctaText,
      audiencePage: form.audiencePage, priority: Number(form.priority),
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null, isActive: form.isActive,
    }
    const response = await fetch('/api/manager/concierge-offers', {
      method: form.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) setError(data.error || 'Unable to save this offer.')
    else { setShowForm(false); setForm(emptyForm); await load() }
    setSaving(false)
  }

  async function deleteOffer(id: string) {
    if (!window.confirm('Delete this Concierge offer?')) return
    const response = await fetch(`/api/manager/concierge-offers?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!response.ok) { const data = await response.json(); setError(data.error || 'Unable to delete this offer.'); return }
    await load()
  }

  async function toggleOffer(offer: OfferRow) {
    const item = catalog.find((candidate) => candidate.id === offer.target_id)
    if (!item) { setError('This offer target is no longer available.'); return }
    const response = await fetch('/api/manager/concierge-offers', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: offer.id, title: offer.title, description: offer.description, targetType: offer.target_type,
        targetId: offer.target_id, offerPrice: offer.offer_price, ctaText: offer.cta_text,
        audiencePage: offer.audience_page, priority: offer.priority, startsAt: offer.starts_at,
        endsAt: offer.ends_at, isActive: !offer.is_active,
      }),
    })
    if (!response.ok) { const data = await response.json(); setError(data.error || 'Unable to update this offer.'); return }
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-[#082032]">Concierge Offers</h1><p className="mt-1 text-sm text-gray-500">Create verified promotions backed by live resort inventory.</p></div>
        <button onClick={startCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e0650f]"><Plus className="h-4 w-4" /> New offer</button>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#0A3D62]" /></div> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {offers.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center"><BadgePercent className="mx-auto h-9 w-9 text-gray-300" /><p className="mt-3 font-medium text-gray-700">No manager offers yet</p><p className="mt-1 text-sm text-gray-500">The Concierge will recommend verified catalog items at their live prices.</p></div>}
          {offers.map((offer) => {
            const item = catalog.find((candidate) => candidate.id === offer.target_id)
            return <article key={offer.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-[#082032]">{offer.title}</h2><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${offer.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{offer.is_active ? 'Active' : 'Paused'}</span></div><p className="mt-1 text-xs text-gray-500">{item?.name || 'Unavailable target'} · {offer.audience_page === 'any' ? 'All pages' : offer.audience_page}</p></div><span className="rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Priority {offer.priority}</span></div>
              <p className="mt-3 text-sm leading-6 text-gray-600">{offer.description}</p>
              <div className="mt-4 flex items-end justify-between"><div><p className="text-xs text-gray-400">Verified price</p><p className="font-bold text-[#F97316]">₦{Number(offer.offer_price ?? item?.price ?? 0).toLocaleString()}</p>{offer.offer_price !== null && item && offer.offer_price < item.price && <p className="text-xs text-gray-400 line-through">₦{item.price.toLocaleString()}</p>}</div><div className="flex gap-2"><button onClick={() => toggleOffer(offer)} aria-label={offer.is_active ? 'Pause offer' : 'Activate offer'} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"><Power className="h-4 w-4" /></button><button onClick={() => startEdit(offer)} aria-label="Edit offer" className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"><Pencil className="h-4 w-4" /></button><button onClick={() => deleteOffer(offer.id)} aria-label="Delete offer" className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></div>
            </article>
          })}
        </div>
      )}

      {showForm && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"><form onSubmit={saveOffer} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-[#082032]">{form.id ? 'Edit offer' : 'Create verified offer'}</h2><p className="text-sm text-gray-500">Every offer must reference an active catalog item.</p></div><button type="button" onClick={() => setShowForm(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2 text-sm font-medium text-gray-700">Offer title<input required minLength={3} maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
          <label className="sm:col-span-2 text-sm font-medium text-gray-700">Guest-facing description<textarea required minLength={10} maxLength={500} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
          <label className="text-sm font-medium text-gray-700">Catalog type<select value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value as TargetType, targetId: '' })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"><option value="room">Room</option><option value="experience">Experience</option><option value="tent">Tent</option><option value="event_space">Setup package</option><option value="public_event">Public event</option></select></label>
          <label className="text-sm font-medium text-gray-700">Catalog item<select required value={form.targetId} onChange={(e) => setForm({ ...form, targetId: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"><option value="">Select an item</option>{availableTargets.map((item) => <option key={item.id} value={item.id}>{item.name} — ₦{item.price.toLocaleString()}</option>)}</select></label>
          <label className="text-sm font-medium text-gray-700">Offer price <span className="font-normal text-gray-400">(blank = live price)</span><input type="number" min="0" max={selectedItem?.price} value={form.offerPrice} onChange={(e) => setForm({ ...form, offerPrice: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
          <label className="text-sm font-medium text-gray-700">Button text<input required value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
          <label className="text-sm font-medium text-gray-700">Show on<select value={form.audiencePage} onChange={(e) => setForm({ ...form, audiencePage: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"><option value="any">All pages</option><option value="rooms">Rooms</option><option value="experiences">Experiences</option><option value="tents">Tents</option><option value="events">Events</option><option value="checkout">Checkout</option></select></label>
          <label className="text-sm font-medium text-gray-700">Priority<input type="number" min="1" max="10" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
          <label className="text-sm font-medium text-gray-700">Starts <span className="font-normal text-gray-400">(optional)</span><input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
          <label className="text-sm font-medium text-gray-700">Ends <span className="font-normal text-gray-400">(optional)</span><input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4" /> Make this offer active</label>
        </div>
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{form.id ? 'Save changes' : 'Create offer'}</button></div>
      </form></div>}
    </div>
  )
}

function toLocalDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
