import Link from 'next/link'
import { Camera, Check, ChevronRight, ShieldCheck, Video, Waves } from 'lucide-react'
import { getEventSpaces } from '@/lib/supabase/queries'

export const dynamic = 'force-dynamic'

export default async function BeachAccessPage() {
  const eventSpaces = await getEventSpaces()
  const productionAccess = eventSpaces.filter((space) => /photo shoot|video shoot/i.test(space.space_name))

  return <main className="min-h-screen bg-[#f7fbfa] text-[#073B4C]">
    <section className="relative overflow-hidden bg-[#073B4C] px-5 py-28 text-white sm:px-8">
      <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_75%_20%,#51C5C1,transparent_40%)]" />
      <div className="relative mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[.24em] text-[#51C5C1]">Day visits & productions</p><h1 className="mt-4 max-w-4xl font-display text-5xl leading-none sm:text-7xl">Your access to the Atican beachfront.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">Plan a relaxed beach day or secure permission for a professional photo or video production.</p></div>
    </section>
    <section className="px-5 py-20 sm:px-8"><div className="mx-auto max-w-7xl">
      <div className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-[2rem] bg-[#0F766E] p-8 text-white"><Waves className="h-9 w-9 text-[#f8cf6a]" /><h2 className="mt-5 font-display text-3xl">Beach Gate Access</h2><p className="mt-3 text-sm leading-7 text-white/70">Enjoy the private beach and pool during your day visit. Current gate prices are confirmed by the front desk before arrival.</p><ul className="mt-6 space-y-3 text-sm"><li className="flex gap-2"><Check className="h-5 w-5 text-[#f8cf6a]" />Private beachfront access</li><li className="flex gap-2"><Check className="h-5 w-5 text-[#f8cf6a]" />Pool and leisure areas</li><li className="flex gap-2"><Check className="h-5 w-5 text-[#f8cf6a]" />Family-friendly day visit</li></ul></article>
        {productionAccess.map((item) => {
          const Icon = /video/i.test(item.space_name) ? Video : Camera
          return <article key={item.id} className="rounded-[2rem] border border-[#d8ebe7] bg-white p-8 shadow-[0_18px_50px_rgba(7,59,76,.08)]"><Icon className="h-9 w-9 text-[#F47C5C]" /><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-[#0F766E]">Production access</p><h2 className="mt-2 font-display text-3xl">{item.space_name}</h2><p className="mt-3 min-h-20 text-sm leading-7 text-[#52717b]">{item.description}</p><p className="mt-6 text-2xl font-bold">₦{Number(item.price).toLocaleString('en-NG')}</p></article>
        })}
      </div>
      <div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-[2rem] bg-[#FFF2E4] p-8 sm:flex-row"><div className="flex gap-4"><ShieldCheck className="h-7 w-7 shrink-0 text-[#0F766E]" /><div><h3 className="font-bold">Planning a commercial shoot?</h3><p className="mt-1 text-sm text-[#52717b]">Tell us the date, crew size and equipment requirements so the resort team can prepare access.</p></div></div><Link href="/contact" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#F47C5C] px-6 py-3 text-sm font-bold text-white">Request access <ChevronRight className="h-4 w-4" /></Link></div>
    </div></section>
  </main>
}
