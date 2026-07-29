'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, ExternalLink, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { PublicEvent, PublicEventStatus } from '@/types/database'

type EventForm = {
  id: string; title: string; slug: string; summary: string; description: string; venue: string
  startsAt: string; endsAt: string; recurrenceLabel: string; ticketPrice: string; paymentUrl: string
  coverImageUrl: string; galleryImages: string[]; videoUrl: string; highlights: string
  status: PublicEventStatus; isFeatured: boolean
}

const emptyForm: EventForm = {
  id: '', title: '', slug: '', summary: '', description: '', venue: 'Atican Beach Resort, Okun-Ajah, Lagos',
  startsAt: '', endsAt: '', recurrenceLabel: '', ticketPrice: '', paymentUrl: '', coverImageUrl: '',
  galleryImages: [], videoUrl: '', highlights: '', status: 'draft', isFeatured: false,
}

export default function ManagerEventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [form, setForm] = useState<EventForm>(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch('/api/manager/events', { cache: 'no-store' })
    const data = await response.json()
    if (response.ok) { setEvents(data.events || []); setError('') } else setError(data.error || 'Unable to load events.')
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  function createEvent() { setForm(emptyForm); setShowForm(true); setError('') }
  function editEvent(event: PublicEvent) {
    setForm({
      id: event.id, title: event.title, slug: event.slug, summary: event.summary, description: event.description,
      venue: event.venue, startsAt: toLocal(event.starts_at), endsAt: toLocal(event.ends_at),
      recurrenceLabel: event.recurrence_label || '', ticketPrice: event.ticket_price === null ? '' : String(event.ticket_price),
      paymentUrl: event.payment_url || '', coverImageUrl: event.cover_image_url || '',
      galleryImages: event.gallery_images || [], videoUrl: event.video_url || '',
      highlights: (event.highlights || []).join('\n'), status: event.status, isFeatured: event.is_featured,
    })
    setShowForm(true); setError('')
  }

  async function uploadMedia(file: File, destination: 'cover' | 'gallery' | 'video') {
    setUploading(true); setError('')
    const body = new FormData(); body.append('file', file)
    const response = await fetch('/api/manager/events/media', { method: 'POST', body })
    const data = await response.json()
    if (!response.ok) setError(data.error || 'Unable to upload media.')
    else if (destination === 'cover') setForm((current) => ({ ...current, coverImageUrl: data.url }))
    else if (destination === 'video') setForm((current) => ({ ...current, videoUrl: data.url }))
    else setForm((current) => ({ ...current, galleryImages: [...current.galleryImages, data.url] }))
    setUploading(false)
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    const payload = {
      ...(form.id ? { id: form.id } : {}), title: form.title, slug: form.slug, summary: form.summary,
      description: form.description, venue: form.venue, startsAt: new Date(form.startsAt).toISOString(),
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      recurrenceLabel: form.recurrenceLabel || null, ticketPrice: form.ticketPrice === '' ? null : Number(form.ticketPrice),
      paymentUrl: form.paymentUrl || null, coverImageUrl: form.coverImageUrl || null,
      galleryImages: form.galleryImages, videoUrl: form.videoUrl || null,
      highlights: form.highlights.split('\n').map((item) => item.trim()).filter(Boolean),
      status: form.status, isFeatured: form.isFeatured,
    }
    const response = await fetch('/api/manager/events', { method: form.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await response.json()
    if (!response.ok) setError(data.error || 'Unable to save event.')
    else { setShowForm(false); setForm(emptyForm); await load() }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this public event permanently?')) return
    const response = await fetch(`/api/manager/events?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    const data = await response.json()
    if (!response.ok) setError(data.error || 'Unable to delete event.')
    else await load()
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-[#082032]">Public Events</h1><p className="mt-1 text-sm text-gray-500">Publish campaign pages with rich media and verified MafrexPay ticket links.</p></div><button onClick={createEvent} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F97316] px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Create event</button></div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#0A3D62]" /></div> : <div className="grid gap-5 xl:grid-cols-2">
      {events.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center"><CalendarDays className="mx-auto h-10 w-10 text-gray-300" /><h2 className="mt-4 font-bold text-gray-700">No public events yet</h2><p className="mt-1 text-sm text-gray-500">Create the resort&apos;s first ticket campaign.</p></div>}
      {events.map((event) => <article key={event.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {event.cover_image_url && <div className="h-44 bg-cover bg-center" style={{ backgroundImage: `url("${event.cover_image_url.replace(/"/g, '%22')}")` }} />}
        <div className="p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${event.status === 'published' ? 'bg-green-100 text-green-700' : event.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{event.status}</span>{event.is_featured && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Featured</span>}</div><h2 className="mt-2 text-lg font-bold text-[#082032]">{event.title}</h2><p className="mt-1 text-xs text-gray-500">{new Date(event.starts_at).toLocaleString('en-NG')}</p></div><p className="font-bold text-[#F97316]">{event.ticket_price === null ? 'No price' : `₦${Number(event.ticket_price).toLocaleString('en-NG')}`}</p></div>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-600">{event.summary}</p><div className="mt-5 flex justify-between"><a href={`/events/${event.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-[#0A3D62]">View page <ExternalLink className="h-3.5 w-3.5" /></a><div className="flex gap-2"><button onClick={() => editEvent(event)} className="rounded-lg border border-gray-200 p-2 text-gray-500"><Pencil className="h-4 w-4" /></button><button onClick={() => remove(event.id)} className="rounded-lg border border-red-200 p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div></div></div>
      </article>)}
    </div>}

    {showForm && <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/55 p-4"><form onSubmit={save} className="mx-auto my-4 max-w-4xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold text-[#082032]">{form.id ? 'Edit public event' : 'Create public event'}</h2><p className="mt-1 text-sm text-gray-500">Draft first, preview it, then publish when every detail is confirmed.</p></div><button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Event title"><input required minLength={3} maxLength={140} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, ...(!form.id ? { slug: slugify(e.target.value) } : {}) })} className="input" /></Field>
        <Field label="Public URL slug"><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} className="input" /></Field>
        <Field label="Card summary" wide><textarea required minLength={10} maxLength={320} rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="input" /></Field>
        <Field label="Full event details" wide><textarea required minLength={20} maxLength={6000} rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" /></Field>
        <Field label="Starts"><input required type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="input" /></Field>
        <Field label="Ends (optional)"><input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="input" /></Field>
        <Field label="Venue" wide><input required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="input" /></Field>
        <Field label="Ticket price (₦)"><input type="number" min="0" value={form.ticketPrice} onChange={(e) => setForm({ ...form, ticketPrice: e.target.value })} className="input" /></Field>
        <Field label="Annual/recurrence label"><input placeholder="e.g. Annual signature event" value={form.recurrenceLabel} onChange={(e) => setForm({ ...form, recurrenceLabel: e.target.value })} className="input" /></Field>
        <Field label="Verified MafrexPay payment link" wide><input type="url" placeholder="https://www.mafrexai.com/h/..." value={form.paymentUrl} onChange={(e) => setForm({ ...form, paymentUrl: e.target.value })} className="input" /></Field>
        <Field label="Highlights (one per line)" wide><textarea rows={3} value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} className="input" /></Field>
        <Field label="Cover image"><MediaInput accept="image/jpeg,image/png,image/webp" disabled={uploading} onFile={(file) => uploadMedia(file, 'cover')} />{form.coverImageUrl && <p className="mt-1 truncate text-xs text-green-700">Cover uploaded</p>}</Field>
        <Field label="Gallery images"><MediaInput accept="image/jpeg,image/png,image/webp" disabled={uploading} onFile={(file) => uploadMedia(file, 'gallery')} /><p className="mt-1 text-xs text-gray-400">{form.galleryImages.length} uploaded</p></Field>
        <Field label="Promo video"><MediaInput accept="video/mp4,video/webm" disabled={uploading} onFile={(file) => uploadMedia(file, 'video')} />{form.videoUrl && <p className="mt-1 text-xs text-green-700">Video uploaded</p>}</Field>
        <Field label="Publishing status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PublicEventStatus })} className="input"><option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option></select></Field>
        <label className="sm:col-span-2 flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Feature this event on the homepage</label>
      </div>
      <div className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-600">Cancel</button><button disabled={saving || uploading} className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{(saving || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}{form.id ? 'Save changes' : 'Create event'}</button></div>
    </form></div>}
  </div>
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`${wide ? 'sm:col-span-2' : ''} text-sm font-medium text-gray-700`}>{label}{children}</label>
}

function MediaInput({ accept, disabled, onFile }: { accept: string; disabled: boolean; onFile: (file: File) => void }) {
  return <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500 hover:bg-gray-50"><ImagePlus className="h-4 w-4" />{disabled ? 'Uploading…' : 'Choose file'}<input type="file" accept={accept} disabled={disabled} className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = '' }} /></label>
}

function toLocal(value: string | null) {
  if (!value) return ''
  const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
