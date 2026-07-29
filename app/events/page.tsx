/* eslint-disable react-hooks/purity */
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarDays, Music2, Sparkles } from 'lucide-react'
import { getPublicEvents } from '@/lib/supabase/queries'
import type { PublicEvent } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const events = await getPublicEvents()
  const now = Date.now()
  const upcoming = events.filter((event) => new Date(event.ends_at || event.starts_at).getTime() >= now)
  const past = events.filter((event) => new Date(event.ends_at || event.starts_at).getTime() < now).reverse()
  const featured = upcoming.find((event) => event.is_featured) || upcoming[0]

  return (
    <main className="min-h-screen overflow-hidden bg-[#071f2b] text-white">
      <section className="relative min-h-[700px]">
        {featured?.cover_image_url ? (
          <Image src={featured.cover_image_url} alt={featured.title} fill priority className="object-cover object-center opacity-55" sizes="100vw" />
        ) : (
          <Image src="/images/home/burn-fire2.png" alt="A live beach event at Atican" fill priority className="object-cover opacity-50" sizes="100vw" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,25,34,.98)_0%,rgba(4,25,34,.78)_48%,rgba(4,25,34,.2)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071f2b] via-transparent to-[#071f2b]/20" />
        <div className="relative mx-auto flex min-h-[700px] max-w-7xl items-center px-5 py-24 sm:px-8">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#f4b942]/30 bg-[#f4b942]/10 px-4 py-2 text-xs font-bold uppercase tracking-[.22em] text-[#ffd77a]">
              <Sparkles className="h-4 w-4" /> Atican after dark
            </p>
            <h1 className="mt-6 font-display text-5xl leading-[.98] sm:text-7xl">Where Lagos comes alive by the ocean.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">Discover live music, beach celebrations and signature Atican moments. Find your next night out and secure your ticket in minutes.</p>
            {featured && (
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link href={`/events/${featured.slug}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f45b69] px-7 py-4 text-sm font-bold shadow-[0_18px_45px_rgba(244,91,105,.3)] transition hover:-translate-y-0.5">
                  Get your ticket <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="flex items-center gap-2 text-sm text-white/75"><CalendarDays className="h-4 w-4 text-[#ffd166]" />{formatDate(featured.starts_at)}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[.24em] text-[#55d6be]">Coming up</p><h2 className="mt-3 font-display text-4xl sm:text-5xl">Your next unforgettable night</h2></div>
            <p className="max-w-lg text-sm leading-6 text-white/55">Official event details and verified MafrexPay ticket links, published directly by Atican management.</p>
          </div>
          {upcoming.length ? <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{upcoming.map((event) => <EventCard key={event.id} event={event} />)}</div> : (
            <div className="mt-12 rounded-[2rem] border border-white/10 bg-white/5 p-12 text-center"><Music2 className="mx-auto h-10 w-10 text-[#ffd166]" /><h3 className="mt-4 font-display text-2xl">The next experience is being prepared</h3><p className="mt-2 text-white/55">Check back soon for newly announced beach events.</p></div>
          )}
        </div>
      </section>

      {past.length > 0 && <section className="border-t border-white/10 bg-[#061923] px-5 py-24 sm:px-8"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#f45b69]">Past moments</p><h2 className="mt-3 font-display text-4xl">The nights we still talk about</h2><div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{past.map((event) => <EventCard key={event.id} event={event} past />)}</div></div></section>}
    </main>
  )
}

function EventCard({ event, past = false }: { event: PublicEvent; past?: boolean }) {
  return <article className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[.06] shadow-2xl">
    <Link href={`/events/${event.slug}`} className="block">
      <div className="relative aspect-[4/5] overflow-hidden">
        {event.cover_image_url ? <Image src={event.cover_image_url} alt={event.title} fill className={`object-cover transition duration-700 group-hover:scale-105 ${past ? 'grayscale-[35%]' : ''}`} sizes="(max-width: 768px) 100vw, 33vw" /> : <div className="h-full bg-gradient-to-br from-[#0f766e] to-[#f45b69]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#061923] via-transparent to-transparent" />
        <span className="absolute left-5 top-5 rounded-full bg-[#ffd166] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-[#071f2b]">{past ? 'Past event' : event.recurrence_label || 'Upcoming'}</span>
        <div className="absolute inset-x-0 bottom-0 p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#55d6be]">{formatDate(event.starts_at)}</p><h3 className="mt-2 font-display text-3xl">{event.title}</h3></div>
      </div>
      <div className="p-6"><p className="line-clamp-2 text-sm leading-6 text-white/60">{event.summary}</p><div className="mt-5 flex items-center justify-between"><p className="font-bold text-[#ffd166]">{event.ticket_price === null ? 'Details inside' : event.ticket_price === 0 ? 'Free entry' : `₦${Number(event.ticket_price).toLocaleString('en-NG')}`}</p><span className="inline-flex items-center gap-1 text-sm font-bold">{past ? 'Relive it' : 'Get your ticket'} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></div></div>
    </Link>
  </article>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(value))
}
