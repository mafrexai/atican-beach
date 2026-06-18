'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { Activity, User, Clock } from 'lucide-react'

interface ActivityLogEntry {
  id: string
  booking_id: string
  user_id: string | null
  action: string
  details: Record<string, unknown> | null
  created_at: string
}

interface ActivityLogProps {
  bookingId: string
}

const actionLabels: Record<string, { label: string; color: string }> = {
  walk_in_booking_created: { label: 'Walk-in Booking Created', color: 'bg-purple-100 text-purple-700' },
  checked_in: { label: 'Guest Checked In', color: 'bg-green-100 text-green-700' },
  checked_out: { label: 'Guest Checked Out', color: 'bg-orange-100 text-orange-700' },
  booking_confirmed: { label: 'Booking Confirmed', color: 'bg-blue-100 text-blue-700' },
  booking_cancelled: { label: 'Booking Cancelled', color: 'bg-red-100 text-red-700' },
  payment_received: { label: 'Payment Received', color: 'bg-green-100 text-green-700' },
  note_added: { label: 'Note Added', color: 'bg-gray-100 text-gray-700' },
}

export function ActivityLog({ bookingId }: ActivityLogProps) {
  const supabase = createClient()
  const [activities, setActivities] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [bookingId])

  const fetchActivities = async () => {
    try {
      const { data } = await supabase
        .from('booking_activity_log')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) setActivities(data)
    } catch (err) {
      console.error('Error fetching activities:', err)
    } finally {
      setLoading(false)
    }
  }

  const getActionInfo = (action: string) => {
    return actionLabels[action] || { label: action.replace(/_/g, ' '), color: 'bg-gray-100 text-gray-700' }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Log
        </h3>
        <p className="text-xs text-gray-500 mt-1">Recent actions on this booking</p>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="text-center py-4 text-gray-400 text-sm">Loading activities...</div>
        ) : activities.length > 0 ? (
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {activities.map((activity) => {
              const actionInfo = getActionInfo(activity.action)
              return (
                <div key={activity.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-[#0A3D62]/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-[#0A3D62]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionInfo.color}`}>
                        {actionInfo.label}
                      </span>
                    </div>
                    {activity.details && Object.keys(activity.details).length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {JSON.stringify(activity.details)}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {format(parseISO(activity.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400 text-sm">
            No activity recorded yet
          </div>
        )}
      </div>
    </div>
  )
}