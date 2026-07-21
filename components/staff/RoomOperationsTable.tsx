'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export interface OperationalRoom {
  id: string
  roomNumber: string
  roomType: string
  pricePerNight: number | null
  operationalStatus: string | null
  housekeepingStatus: 'available' | 'dirty' | 'cleaning' | 'inspected'
  guestName: string | null
  checkInDate: string | null
  checkOutDate: string | null
  occupied: boolean
}

const nextStep = {
  dirty: { status: 'cleaning', label: 'Start cleaning' },
  cleaning: { status: 'inspected', label: 'Mark inspected' },
  inspected: { status: 'available', label: 'Release room' },
} as const

export default function RoomOperationsTable({ initialRooms }: { initialRooms: OperationalRoom[] }) {
  const [rooms, setRooms] = useState(initialRooms)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function advance(room: OperationalRoom) {
    const step = nextStep[room.housekeepingStatus as keyof typeof nextStep]
    if (!step) return
    setSaving(room.id); setError('')
    const response = await fetch('/api/staff/rooms', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: room.id, nextStatus: step.status }) })
    const data = await response.json()
    if (!response.ok) setError(data.error || 'Unable to update housekeeping.')
    else setRooms((current) => current.map((item) => item.id === room.id ? { ...item, housekeepingStatus: step.status } : item))
    setSaving(null)
  }

  return <>
    {error && <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</div>}
    <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50"><tr>
      {['Room','Type','Price/Night','Occupancy','Housekeeping','Guest','Stay','Action'].map((label) => <th key={label} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{label}</th>)}
    </tr></thead><tbody className="divide-y divide-gray-100">{rooms.map((room) => {
      const step = nextStep[room.housekeepingStatus as keyof typeof nextStep]
      return <tr key={room.id} className="hover:bg-gray-50">
        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{room.roomNumber}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{room.roomType}</td>
        <td className="px-4 py-3 text-sm text-gray-600">₦{room.pricePerNight?.toLocaleString()}</td>
        <td className="px-4 py-3"><Badge value={room.occupied ? 'occupied' : room.operationalStatus || 'available'} /></td>
        <td className="px-4 py-3"><Badge value={room.housekeepingStatus} /></td>
        <td className="px-4 py-3 text-sm text-gray-600">{room.guestName || '—'}</td>
        <td className="px-4 py-3 text-xs text-gray-500">{room.checkInDate ? `${room.checkInDate} → ${room.checkOutDate}` : '—'}</td>
        <td className="px-4 py-3">{step && !room.occupied ? <button onClick={() => advance(room)} disabled={saving === room.id}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0A3D62] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {saving === room.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{step.label}</button> : <span className="text-xs text-gray-400">No action</span>}</td>
      </tr>
    })}</tbody></table></div>
  </>
}

function Badge({ value }: { value: string }) {
  const color = value === 'available' ? 'bg-green-100 text-green-700' : value === 'occupied' ? 'bg-blue-100 text-blue-700'
    : value === 'dirty' ? 'bg-red-100 text-red-700' : value === 'cleaning' ? 'bg-amber-100 text-amber-700'
      : value === 'inspected' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${color}`}>{value.replace(/_/g, ' ')}</span>
}
