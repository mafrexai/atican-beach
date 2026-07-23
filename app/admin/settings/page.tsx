import { redirect } from 'next/navigation'
import SettingsForm from '@/components/admin/SettingsForm'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function AdminSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  return <SettingsForm />
}
