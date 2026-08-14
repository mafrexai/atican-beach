'use client'
/* eslint-disable react-hooks/set-state-in-effect -- notifications are loaded from the authenticated API after mount */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'

interface StaffNotification {
  id: string
  booking_id: string | null
  title: string
  body: string | null
  created_at: string
  read: boolean
}

const POLL_INTERVAL_MS = 20_000

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<StaffNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/staff/notifications', { cache: 'no-store' })
      if (!response.ok) return
      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch {
      // Silent — this is a background poll, not a user-initiated action.
    }
  }, [])

  useEffect(() => {
    void load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function markRead(notificationId: string) {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    await fetch('/api/staff/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId }),
    }).catch(() => {})
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    await fetch('/api/staff/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    }).catch(() => {})
  }

  return (
    <div ref={containerRef} className="fixed top-4 right-4 z-30">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-full bg-[#0A3D62] p-2.5 text-white shadow-lg transition-colors hover:bg-[#08324f]"
        aria-label="Booking notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F97316] px-1 text-[11px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Booking notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-[#0A3D62] hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-400">No booking notifications yet.</p>
            )}
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => !notification.read && markRead(notification.id)}
                className={`block w-full border-b border-gray-50 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex items-start gap-2">
                  {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#F97316]" />}
                  <div className={notification.read ? 'ml-4' : ''}>
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    {notification.body && <p className="mt-0.5 text-xs text-gray-500">{notification.body}</p>}
                    <p className="mt-1 text-[11px] text-gray-400">{relativeTime(notification.created_at)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
