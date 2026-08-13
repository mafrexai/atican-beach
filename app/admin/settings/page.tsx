import { redirect } from 'next/navigation'
import SettingsForm from '@/components/admin/SettingsForm'
import TestPaymentCard from '@/components/admin/TestPaymentCard'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function AdminSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  return (
    <div className="space-y-6">
      <SettingsForm />
      <TestPaymentCard />
    </div>
  )
}
