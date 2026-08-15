'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeleteBookingButton({ bookingId, bookingReference }: { bookingId: string; bookingReference: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm(`Delete booking ${bookingReference}? This permanently removes the record. Its room will become available again automatically.`)) {
      return
    }
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to delete this booking.')
      router.refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to delete this booking.')
      setDeleting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      {deleting ? 'Deleting…' : 'Delete'}
    </button>
  )
}
