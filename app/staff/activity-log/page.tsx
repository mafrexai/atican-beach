'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ClipboardList, Plus, User, Calendar, MessageSquare, Wrench, Eye } from 'lucide-react'

interface ActivityLog {
  id: string
  user_id: string
  action: string
  details: string | null
  created_at: string
  user_email?: string
}

export default function ActivityLogPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newLog, setNewLog] = useState({
    action: 'observation',
    details: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')

  const actionTypes = [
    { value: 'observation', label: 'General Observation', icon: Eye },
    { value: 'maintenance', label: 'Maintenance Need', icon: Wrench },
    { value: 'note', label: 'Guest Note', icon: MessageSquare },
  ]

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('staff_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSuccess('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const { error } = await supabase
        .from('staff_activity_logs')
        .insert({
          user_id: session.user.id,
          action: newLog.action,
          details: newLog.details || null,
        })

      if (error) throw error

      setSuccess('Log entry added successfully!')
      setNewLog({ action: 'observation', details: '' })
      setShowForm(false)
      fetchLogs()
    } catch (err: any) {
      console.error('Error creating log:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const getActionIcon = (action: string) => {
    const type = actionTypes.find((t) => t.value === action)
    return type ? type.icon : ClipboardList
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'maintenance':
        return 'bg-orange-100 text-orange-700'
      case 'observation':
        return 'bg-blue-100 text-blue-700'
      case 'note':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-500 text-sm mt-1">View and add observations, maintenance notes, and more</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A3D62] text-white rounded-lg hover:bg-[#082032] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Entry
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Add Entry Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Log Entry</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div className="flex gap-2">
                {actionTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setNewLog({ ...newLog, action: type.value })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      newLog.action === type.value
                        ? 'bg-[#0A3D62] text-white border-[#0A3D62]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#0A3D62]'
                    }`}
                  >
                    <type.icon className="w-4 h-4" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
              <textarea
                value={newLog.details}
                onChange={(e) => setNewLog({ ...newLog, details: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm text-gray-900"
                placeholder="Enter your observation, maintenance note, or guest note..."
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || !newLog.details.trim()}
                className="px-4 py-2 bg-[#0A3D62] text-white rounded-lg hover:bg-[#082032] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Adding...' : 'Add Entry'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Logs List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No activity logs yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => {
              const Icon = getActionIcon(log.action)
              return (
                <div key={log.id} className="px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      {log.details && (
                        <p className="text-sm text-gray-700">{log.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}