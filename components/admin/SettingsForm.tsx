'use client'
/* eslint-disable react-hooks/set-state-in-effect -- settings are loaded from the authenticated API after mount */

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface ResortSettings {
  resortName: string
  contactEmail: string
  phone: string
  currency: 'NGN' | 'USD'
  paystackMode: 'test' | 'live'
  checkInTime: string
  checkOutTime: string
  cancellationPolicyHours: number
  emailNewBooking: boolean
  emailCancellation: boolean
  dailyBookingSummary: boolean
  paymentConfirmation: boolean
}

const defaultSettings: ResortSettings = {
  resortName: 'Atican Beach Resort & Hotel',
  contactEmail: 'aticanbeachresort716@gmail.com',
  phone: '+2349029622583',
  currency: 'NGN',
  paystackMode: 'test',
  checkInTime: '14:00',
  checkOutTime: '12:00',
  cancellationPolicyHours: 24,
  emailNewBooking: true,
  emailCancellation: true,
  dailyBookingSummary: false,
  paymentConfirmation: true,
}

export default function SettingsForm() {
  const [settings, setSettings] = useState(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load settings.')
      setSettings(data.settings)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save settings.')
      setSettings(data.settings)
      setSuccess('Settings saved successfully.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#0A3D62]" /><span className="sr-only">Loading settings</span></div>
  }

  return (
    <form onSubmit={saveSettings} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Configure resort settings and preferences</p>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div role="status" className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" />{success}</div>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SettingsCard title="General">
          <Field label="Resort Name"><input required minLength={2} maxLength={120} value={settings.resortName} onChange={(event) => setSettings({ ...settings, resortName: event.target.value })} className={inputClass} /></Field>
          <Field label="Contact Email"><input required type="email" value={settings.contactEmail} onChange={(event) => setSettings({ ...settings, contactEmail: event.target.value })} className={inputClass} /></Field>
          <Field label="Phone"><input required type="tel" maxLength={30} value={settings.phone} onChange={(event) => setSettings({ ...settings, phone: event.target.value })} className={inputClass} /></Field>
        </SettingsCard>

        <SettingsCard title="Payment">
          <Field label="Currency"><select value={settings.currency} onChange={(event) => setSettings({ ...settings, currency: event.target.value as ResortSettings['currency'] })} className={inputClass}><option value="NGN">₦ Nigerian Naira (NGN)</option><option value="USD">$ US Dollar (USD)</option></select></Field>
          <Field label="Paystack Mode"><select value={settings.paystackMode} onChange={(event) => setSettings({ ...settings, paystackMode: event.target.value as ResortSettings['paystackMode'] })} className={inputClass}><option value="test">Test Mode</option><option value="live">Live Mode</option></select></Field>
          <div className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">This records the intended operating mode. Paystack keys remain securely controlled through Vercel environment variables.</div>
        </SettingsCard>

        <SettingsCard title="Booking">
          <Field label="Default Check-in Time"><input required type="time" value={settings.checkInTime} onChange={(event) => setSettings({ ...settings, checkInTime: event.target.value })} className={inputClass} /></Field>
          <Field label="Default Check-out Time"><input required type="time" value={settings.checkOutTime} onChange={(event) => setSettings({ ...settings, checkOutTime: event.target.value })} className={inputClass} /></Field>
          <Field label="Cancellation Policy (hours)"><input required type="number" min="0" max="8760" value={settings.cancellationPolicyHours} onChange={(event) => setSettings({ ...settings, cancellationPolicyHours: Number(event.target.value) })} className={inputClass} /></Field>
        </SettingsCard>

        <SettingsCard title="Notifications">
          <Toggle label="Email on new booking" checked={settings.emailNewBooking} onChange={(checked) => setSettings({ ...settings, emailNewBooking: checked })} />
          <Toggle label="Email on cancellation" checked={settings.emailCancellation} onChange={(checked) => setSettings({ ...settings, emailCancellation: checked })} />
          <Toggle label="Daily booking summary" checked={settings.dailyBookingSummary} onChange={(checked) => setSettings({ ...settings, dailyBookingSummary: checked })} />
          <Toggle label="Payment confirmation" checked={settings.paymentConfirmation} onChange={(checked) => setSettings({ ...settings, paymentConfirmation: checked })} />
        </SettingsCard>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-lg bg-[#0A3D62] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#08324f] disabled:cursor-not-allowed disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}

const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0A3D62]'

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"><h2 className="mb-4 text-lg font-semibold text-gray-900">{title}</h2><div className="space-y-4">{children}</div></section>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700">{label}{children}</label>
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#0A3D62] focus:ring-[#0A3D62]" /><span className="text-sm text-gray-700">{label}</span></label>
}
