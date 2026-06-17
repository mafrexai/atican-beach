import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/layout/DashboardHeader'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pt-24">
        {children}
      </main>
    </div>
  )
}