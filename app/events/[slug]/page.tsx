/* eslint-disable react-hooks/purity */
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarDays, Check, Clock3, MapPin, ShieldCheck, Ticket } from 'lucide-react'
import { getPublicEventBySlug } from '@/lib/supabase/queries'

export const dynamic = 'force-dynamic'

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getPublicEventBySlug(slug)
  if (!event) notFound()

  const starts = new Date(event.starts_at)
  const isPast = new Date(event.ends_at || event.starts_at).getTime() < Date.now()
  return (
    <main className="min-h-screen bg-[#071f2b] text-white">
      <section className="relative min-h-[620px]">
        {event.cover_image_url && <Image src={event.cover_image_url} alt={event.title} fill priority className="object-cover opacity-50" sizes="100vw" />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#061923] via-[#061923]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071f2b] via-transparent to-transparent" />
        <div className="relative mx-auto flex min-h-[620px] max-w-7xl items-end px-5 pb-20 pt-28 sm:px-8">
          <div className="max-w-3xl">
            <Link href="/events" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-white/65 hover:text-white"><ArrowLeft className="h-4 w-4" /> All events</Link>
            <p className="text-xs font-black uppercase tracking-[.24em] text-[#55d6be]">{event.recurrence_label || (isPast ? 'Past event' : 'Atican presents')}</p>
            <h1 className="mt-4 font-display text-5xl leading-none sm:text-7xl">{event.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">{event.summary}</p>
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Info icon={CalendarDays} label="Date" value={new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(starts)} />
            <Info icon={Clock3} label="Time" value={new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(starts)} />
            <Info icon={MapPin} label="Venue" value={event.venue} />
          </div>
          <div className="mt-12 max-w-3xl"><h2 className="font-display text-3xl">About this experience</h2><p className="mt-5 whitespace-pre-line text-base leading-8 text-white/65">{event.description}</p></div>
          {event.highlights.length > 0 && <div className="mt-12"><h2 className="font-display text-3xl">What to expect</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{event.highlights.map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm"><Check className="h-5 w-5 shrink-0 text-[#55d6be]" />{item}</div>)}</div></div>}
        </div>
        <aside className="h-fit rounded-[2rem] bg-white p-7 text-[#071f2b] shadow-2xl lg:sticky lg:top-24">
          <Ticket className="h-8 w-8 text-[#f45b69]" /><p className="mt-5 text-xs font-black uppercase tracking-[.2em] text-[#0f766e]">{isPast ? 'Event concluded' : 'Official ticket'}</p>
          <p className="mt-2 font-display text-4xl">{event.ticket_price === null ? 'See details' : event.ticket_price === 0 ? 'Free' : `₦${Number(event.ticket_price).toLocaleString('en-NG')}`}</p>
          <p className="mt-3 text-sm leading-6 text-[#52717b]">Secure your place through the verified Atican Beach Resort MafrexPay checkout.</p>
          {!isPast && event.payment_url ? <a href={event.payment_url} rel="noopener noreferrer" className="mt-6 flex w-full items-center justify-center rounded-full bg-[#f45b69] px-6 py-4 text-sm font-black text-white transition hover:bg-[#df4857]">Get your ticket</a> : <p className="mt-6 rounded-xl bg-gray-100 p-4 text-center text-sm font-bold text-gray-500">{isPast ? 'Ticket sales have ended' : 'Tickets will be available soon'}</p>}
          <div className="mt-5 flex items-start gap-2 border-t border-gray-100 pt-5 text-xs leading-5 text-[#6c8188]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" />Verified payment link published by Atican management.</div>
        </aside>
      </div></section>
    </main>
  )
}

function Info({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><Icon className="h-5 w-5 text-[#ffd166]" /><p className="mt-4 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">{label}</p><p className="mt-1 text-sm font-bold leading-5">{value}</p></div>
}
