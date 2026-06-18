'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { MessageSquare, Send, User } from 'lucide-react'

interface BookingComment {
  id: string
  booking_id: string
  user_id: string | null
  comment: string
  is_internal: boolean
  created_at: string
}

interface ShiftNotesProps {
  bookingId: string
}

export function ShiftNotes({ bookingId }: ShiftNotesProps) {
  const supabase = createClient()
  const [comments, setComments] = useState<BookingComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    fetchComments()
  }, [bookingId])

  const fetchComments = async () => {
    try {
      const { data } = await supabase
        .from('booking_comments')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('is_internal', true)
        .order('created_at', { ascending: true })

      if (data) setComments(data)
    } catch (err) {
      console.error('Error fetching comments:', err)
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('booking_comments')
        .insert({
          booking_id: bookingId,
          user_id: session.user.id,
          comment: newComment.trim(),
          is_internal: true,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setComments([...comments, data])
        setNewComment('')
      }
    } catch (err) {
      console.error('Error adding comment:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Shift Notes
        </h3>
        <p className="text-xs text-gray-500 mt-1">Internal notes for staff handover</p>
      </div>

      <div className="p-5">
        {/* Comments List */}
        {fetching ? (
          <div className="text-center py-4 text-gray-400 text-sm">Loading notes...</div>
        ) : comments.length > 0 ? (
          <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 bg-[#0A3D62]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-[#0A3D62]" />
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700">{comment.comment}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(parseISO(comment.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400 text-sm mb-4">
            No shift notes yet
          </div>
        )}

        {/* Add Comment Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a shift note..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm"
          />
          <button
            type="submit"
            disabled={loading || !newComment.trim()}
            className="px-4 py-2 bg-[#0A3D62] text-white rounded-lg hover:bg-[#082032] transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}