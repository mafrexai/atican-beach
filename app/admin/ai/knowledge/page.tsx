'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, Search, RefreshCw, ChevronRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface KnowledgeEntry {
  id: string
  category: string
  question: string
  answer: string
  keywords: string[]
  is_active: boolean
}

const categories = ['rooms','pricing','tents','experiences','events','dining','policies','amenities','location','contact','gate fees','beach','kids','payment','gallery','general']

export default function KnowledgeBaseManagement() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editing, setEditing] = useState<KnowledgeEntry | null>(null)
  const [form, setForm] = useState({ category: 'general', question: '', answer: '', keywords: '', is_active: true })
  const supabase = createClient()

  useEffect(() => { fetchEntries() }, [])

  const fetchEntries = async () => {
    setLoading(true)
    const { data } = await supabase.from('ai_knowledge_base').select('*').order('category', { ascending: true })
    setEntries((data as KnowledgeEntry[]) || [])
    setLoading(false)
  }

  const handleSave = async () => {
    const entry = { ...form, keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean) }
    if (editing) {
      await supabase.from('ai_knowledge_base').update({ ...entry, updated_at: new Date().toISOString() }).eq('id', editing.id)
    } else {
      await supabase.from('ai_knowledge_base').insert(entry)
    }
    await fetchEntries()
    setShowAddModal(false)
    setEditing(null)
    setForm({ category: 'general', question: '', answer: '', keywords: '', is_active: true })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this knowledge entry?')) return
    await supabase.from('ai_knowledge_base').delete().eq('id', id)
    await fetchEntries()
  }

  const startEdit = (entry: KnowledgeEntry) => {
    setEditing(entry)
    setForm({ category: entry.category, question: entry.question, answer: entry.answer, keywords: entry.keywords.join(', '), is_active: entry.is_active })
  }

  const filteredEntries = entries.filter(e =>
    e.question.toLowerCase().includes(search.toLowerCase()) ||
    e.answer.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#0A3D62]">AI Knowledge Base</h1>
          <p className="text-gray-500 text-sm mt-1">Manage what the AI Receptionist knows about the resort</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchEntries} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link href="/admin" className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition text-sm">
            <ChevronRight className="w-4 h-4 rotate-180" /> Back
          </Link>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0A3D62] text-white rounded-lg hover:bg-[#082032] transition text-sm">
            <Plus className="w-4 h-4" /> Add Knowledge
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search knowledge base..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-[#0A3D62] text-sm" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Answer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keywords</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">{entry.category}</span></td>
                <td className="px-4 py-3 text-sm font-medium">{entry.question}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{entry.answer}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{entry.keywords.slice(0, 3).join(', ')}{entry.keywords.length > 3 ? '...' : ''}</td>
                <td className="px-4 py-3"><span className={entry.is_active ? 'text-green-600' : 'text-red-600'}>{entry.is_active ? 'Yes' : 'No'}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(entry)} className="text-blue-600 hover:text-blue-800"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(entry.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredEntries.length === 0 && !loading && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">No entries found. Add knowledge to make the AI Receptionist smarter!</div>
        )}
      </div>

      {(showAddModal || editing) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit Knowledge Entry' : 'Add Knowledge Entry'}</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#0A3D62]">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Question</label>
                <input type="text" value={form.question} onChange={(e) => setForm({...form, question: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#0A3D62]" required /></div>
              <div><label className="block text-sm font-medium mb-1">Answer</label>
                <textarea value={form.answer} onChange={(e) => setForm({...form, answer: e.target.value})} rows={4}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#0A3D62]" required /></div>
              <div><label className="block text-sm font-medium mb-1">Keywords (comma separated)</label>
                <input type="text" value={form.keywords} onChange={(e) => setForm({...form, keywords: e.target.value})}
                  placeholder="e.g., room, price, availability" className="w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-[#0A3D62]" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({...form, is_active: e.target.checked})} className="w-4 h-4" />
                <label htmlFor="is_active" className="text-sm">Active</label></div>
              <div className="flex gap-3 pt-4">
                <button onClick={handleSave} className="flex-1 bg-[#0A3D62] text-white py-2 rounded-lg hover:bg-[#082032] transition text-sm font-medium">{editing ? 'Update' : 'Add'} Knowledge</button>
                <button onClick={() => { setShowAddModal(false); setEditing(null); setForm({ category: 'general', question: '', answer: '', keywords: '', is_active: true }) }} className="flex-1 border py-2 rounded-lg hover:bg-gray-50 transition text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
