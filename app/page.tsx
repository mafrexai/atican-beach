import Image from 'next/image'
import Link from 'next/link'
import heroBeachImage from '@/public/images/home/atican-beach-hero.png'
import room602OceanViewImage from '@/public/images/home/room-602-ocean-view.png'
import {
  ArrowRight, CalendarDays, Clock3, MapPin, ShieldCheck,
  Sparkles, Star, Sun, Users, Waves,
} from 'lucide-react'
import { getFeaturedRooms } from '@/lib/supabase/queries'

const escapes = [
  { title: 'Stay by the ocean', copy: 'Wake to Atlantic light, soft linen and the hush of the tide.', href: '/rooms', image: room602OceanViewImage, eyebrow: 'Rooms & suites' },
  { title: 'Celebrate on the sand', copy: 'Turn weddings, birthdays and private gatherings into golden memories.', href: '/events', image: '/images/banner1.jpeg', eyebrow: 'Beach events' },
  { title: 'Play until sunset', copy: 'Horse rides, beach games, bonfires and slow afternoons by the water.', href: '/experiences', image: '/images/banner3.jpeg', eyebrow: 'Experiences' },
]

const dayPlan = [
  { time: '8:00', title: 'Breakfast by the ocean', copy: 'Fresh flavours and an unhurried start with the Atlantic in view.' },
  { time: '11:00', title: 'Swim, play, exhale', copy: 'Move between beach games, cool water and a shaded lounger.' },
  { time: '16:30', title: 'Golden-hour adventure', copy: 'Ride the shoreline or explore the beach as the light turns amber.' },
  { time: '20:30', title: 'Bonfire beneath the stars', copy: 'End the day with music, warm sand and your favourite people.' },
]

export default async function HomePage() {
  const featuredRooms = await getFeaturedRooms(3)

  return (
    <div className="overflow-hidden bg-[#FFFDF7] text-[#073B4C]">
      <section className="relative -mt-16 min-h-[860px] lg:min-h-[900px]">
        <Image src={heroBeachImage} alt="A couple walking along Atican Beach Resort at golden hour" fill priority className="object-cover object-center" sizes="100vw" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,35,46,.82)_0%,rgba(7,59,76,.48)_48%,rgba(7,59,76,.12)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,59,76,.6)_0%,transparent_45%)]" />

        <div className="relative z-10 mx-auto flex min-h-[760px] max-w-7xl items-center px-5 pt-24 sm:px-8 lg:min-h-[800px]">
          <div className="max-w-3xl text-white">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] backdrop-blur-md">
              <Sun className="h-4 w-4 text-[#E8B44F]" /> Beachfront escape · Lagos
            </div>
            <h1 className="max-w-3xl font-display text-5xl font-medium leading-[.98] tracking-[-0.035em] sm:text-6xl lg:text-[5.4rem]">
              Your escape begins at the water&apos;s edge.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/85 sm:text-xl">
              Golden mornings, oceanfront stays and unforgettable nights—made for the people you never want to leave.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/rooms" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#F47C5C] px-7 py-4 text-sm font-bold text-white shadow-[0_18px_45px_rgba(244,124,92,.3)] transition hover:-translate-y-0.5 hover:bg-[#e86d4d]">
                Find your room <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/experiences" className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/10 px-7 py-4 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20">
                Explore the experience
              </Link>
            </div>
          </div>
        </div>

        <form action="/rooms" method="get" className="absolute inset-x-4 bottom-8 z-20 mx-auto grid max-w-6xl gap-2 rounded-[1.75rem] border border-white/40 bg-white/95 p-3 shadow-[0_28px_80px_rgba(7,59,76,.25)] backdrop-blur-xl sm:inset-x-8 md:grid-cols-[1fr_1fr_.8fr_auto] md:items-end md:p-4">
          <label className="rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[.13em] text-[#52717b]"><span className="mb-2 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#0F766E]" /> Check-in</span><input type="date" name="checkIn" required className="w-full bg-transparent text-sm font-semibold normal-case tracking-normal text-[#073B4C] outline-none" /></label>
          <label className="rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[.13em] text-[#52717b]"><span className="mb-2 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#0F766E]" /> Check-out</span><input type="date" name="checkOut" required className="w-full bg-transparent text-sm font-semibold normal-case tracking-normal text-[#073B4C] outline-none" /></label>
          <label className="rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[.13em] text-[#52717b]"><span className="mb-2 flex items-center gap-2"><Users className="h-4 w-4 text-[#0F766E]" /> Guests</span><select name="guests" defaultValue="2" className="w-full bg-transparent text-sm font-semibold normal-case tracking-normal text-[#073B4C] outline-none"><option value="1">1 guest</option><option value="2">2 guests</option><option value="3">3 guests</option><option value="4">4 guests</option><option value="6">5–6 guests</option></select></label>
          <button type="submit" className="rounded-2xl bg-[#073B4C] px-7 py-4 text-sm font-bold text-white transition hover:bg-[#0F766E]">Check availability</button>
        </form>
      </section>

      <section className="px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[.24em] text-[#F47C5C]">Choose your kind of escape</p><h2 className="mt-4 font-display text-4xl leading-tight text-[#073B4C] sm:text-5xl">Come for the ocean.<br />Stay for the feeling.</h2></div>
            <p className="max-w-2xl text-lg leading-8 text-[#52717b] lg:justify-self-end">Atican is where the city loosens its grip. Settle into a room, gather your favourite people and let the day unfold at beach pace.</p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {escapes.map((escape, index) => (
              <Link key={escape.title} href={escape.href} className={`group relative min-h-[480px] overflow-hidden rounded-[2rem] ${index === 1 ? 'md:translate-y-8' : ''}`}>
                <Image src={escape.image} alt={escape.title} fill className="object-cover transition duration-700 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#03232e]/90 via-[#073B4C]/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7 text-white"><p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#E8B44F]">{escape.eyebrow}</p><h3 className="mt-2 font-display text-3xl">{escape.title}</h3><p className="mt-3 text-sm leading-6 text-white/75">{escape.copy}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold">Discover more <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#EAF5F2] px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.24em] text-[#0F766E]">Sleep beautifully</p><h2 className="mt-4 font-display text-4xl sm:text-5xl">Your room by the sea</h2></div><Link href="/rooms" className="inline-flex items-center gap-2 text-sm font-bold text-[#073B4C]">Explore all rooms <ArrowRight className="h-4 w-4" /></Link></div>
          {featuredRooms.length > 0 ? (
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {featuredRooms.map((room, index) => (
                <Link key={room.id} href={`/rooms/${room.id}`} className={`group overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_50px_rgba(7,59,76,.08)] ${index === 0 ? 'lg:col-span-2 lg:grid lg:grid-cols-[1.35fr_.65fr]' : ''}`}>
                  <div className={`relative min-h-[300px] overflow-hidden ${index === 0 ? 'lg:min-h-[470px]' : ''}`}>
                    {room.image_url ? <Image src={room.image_url} alt={room.image_alt || room.room_type} fill className="object-cover transition duration-700 group-hover:scale-105" sizes={index === 0 ? '(max-width: 1024px) 100vw, 55vw' : '(max-width: 1024px) 100vw, 30vw'} /> : <Image src={room602OceanViewImage} alt="Atican beachfront room with an ocean view" fill className="object-cover transition duration-700 group-hover:scale-105" sizes="50vw" />}
                    <span className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-[#073B4C] backdrop-blur">Ocean escape</span>
                  </div>
                  <div className="flex flex-col justify-between p-6"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#F47C5C]">Room {room.room_number}</p><h3 className="mt-2 font-display text-3xl text-[#073B4C]">{room.room_type}</h3><p className="mt-3 text-sm leading-6 text-[#6c8188]">A calm, comfortable base for beach days and slow mornings.</p></div><div className="mt-8 flex items-end justify-between"><p className="text-xl font-bold text-[#073B4C]">₦{room.price_per_night.toLocaleString()}<span className="text-xs font-normal text-[#6c8188]"> / night</span></p><ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" /></div></div>
                </Link>
              ))}
            </div>
          ) : <div className="mt-12 rounded-3xl bg-white p-12 text-center text-[#52717b]">Our rooms are being prepared for your next escape. Please check back shortly.</div>}
        </div>
      </section>

      <section className="relative bg-[#073B4C] px-5 py-24 text-white sm:px-8 lg:py-32">
        <div className="absolute right-0 top-0 h-full w-1/2 opacity-15 [background:radial-gradient(circle_at_center,#51C5C1,transparent_65%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div className="relative min-h-[600px] overflow-hidden rounded-[2.5rem]"><Image src="/images/banner2.jpeg" alt="A relaxing day at Atican Beach" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 45vw" /><div className="absolute inset-0 bg-gradient-to-t from-[#073B4C]/60 to-transparent" /><div className="absolute bottom-7 left-7 right-7 flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-lg"><Sparkles className="h-5 w-5 text-[#E8B44F]" /><p className="text-sm">Every hour feels a little longer by the ocean.</p></div></div>
          <div><p className="text-xs font-bold uppercase tracking-[.24em] text-[#51C5C1]">From sunrise to starlight</p><h2 className="mt-4 font-display text-4xl sm:text-5xl">One beautiful day.<br />A lifetime of stories.</h2><div className="mt-10 space-y-7">{dayPlan.map((item) => <div key={item.time} className="grid grid-cols-[64px_1fr] gap-4 border-b border-white/10 pb-7"><p className="flex items-center gap-1 text-sm font-bold text-[#E8B44F]"><Clock3 className="h-3.5 w-3.5" />{item.time}</p><div><h3 className="font-display text-xl">{item.title}</h3><p className="mt-2 text-sm leading-6 text-white/60">{item.copy}</p></div></div>)}</div><Link href="/experiences" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#F47C5C] px-6 py-3 text-sm font-bold">Plan your beach day <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-6xl text-center"><div className="flex justify-center gap-1 text-[#E8B44F]">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className="h-5 w-5 fill-current" />)}</div><blockquote className="mx-auto mt-8 max-w-4xl font-display text-3xl leading-snug text-[#073B4C] sm:text-5xl">“The kind of place where you arrive for the view and leave with a new favourite memory.”</blockquote><p className="mt-6 text-sm font-bold uppercase tracking-[.16em] text-[#6c8188]">The Atican feeling</p></div>
        <div className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-[#F4E6CC]/55 p-5 text-center"><ShieldCheck className="mx-auto h-6 w-6 text-[#0F766E]" /><p className="mt-3 text-sm font-bold">Secure Paystack payment</p></div><div className="rounded-2xl bg-[#F4E6CC]/55 p-5 text-center"><MapPin className="mx-auto h-6 w-6 text-[#0F766E]" /><p className="mt-3 text-sm font-bold">Okun-Ajah, Lagos</p></div><div className="rounded-2xl bg-[#F4E6CC]/55 p-5 text-center"><Waves className="mx-auto h-6 w-6 text-[#0F766E]" /><p className="mt-3 text-sm font-bold">Oceanfront leisure</p></div></div>
      </section>

      <section className="px-5 pb-24 sm:px-8 lg:pb-32"><div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#F47C5C] px-6 py-16 text-center text-white sm:px-12 lg:py-20"><div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#E8B44F]/30 blur-3xl" /><div className="relative"><p className="text-xs font-bold uppercase tracking-[.24em] text-white/75">Your beach is waiting</p><h2 className="mx-auto mt-4 max-w-3xl font-display text-4xl sm:text-6xl">Trade the rush for waves, warmth and wonder.</h2><Link href="/rooms" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#073B4C] px-7 py-4 text-sm font-bold shadow-xl">Book your escape <ArrowRight className="h-4 w-4" /></Link></div></div></section>
    </div>
  )
}
