'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, Star, Save, Loader2,
  Wind, Eye, Wifi, Tv, Martini, Armchair, Sparkles,
  Coffee, Briefcase, Bath, Droplets, Check, X
} from 'lucide-react'

const FEATURE_ICONS = [
  { name: 'Wind', icon: Wind },
  { name: 'Eye', icon: Eye },
  { name: 'Wifi', icon: Wifi },
  { name: 'Tv', icon: Tv },
  { name: 'Martini', icon: Martini },
  { name: 'Armchair', icon: Armchair },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Coffee', icon: Coffee },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Bath', icon: Bath },
  { name: 'Shower', icon: Droplets },
  { name: 'Check', icon: Check },
]

const DEFAULT_FEATURES = [
  { name: 'Air Conditioning', icon: 'Wind', value: '' },
  { name: 'Ocean View', icon: 'Eye', value: '' },
  { name: 'WiFi', icon: 'Wifi', value: '' },
  { name: 'TV', icon: 'Tv', value: '' },
  { name: 'Mini Bar', icon: 'Martini', value: '' },
  { name: 'Safe', icon: 'Check', value: '' },
  { name: 'Balcony', icon: 'Armchair', value: '' },
  { name: 'Bathtub', icon: 'Bath', value: '' },
  { name: 'Shower', icon: 'Shower', value: '' },
  { name: 'Coffee Machine', icon: 'Coffee', value: '' },
  { name: 'Workspace', icon: 'Briefcase', value: '' },
  { name: 'Jacuzzi', icon: 'Sparkles', value: '' },
]

interface Feature {
  id?: string
  feature_name: string
  feature_value: string
  feature_icon: string
  display_order: number
  is_premium: boolean
  is_active: boolean
  isNew?: boolean
}

export default function RoomFeaturesPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [room, setRoom] = useState<{ room_number: string; room_type: string } | null>(null)
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`/api/admin/rooms/${roomId}`)
      if (res.ok) {
        const data = await res.json()
        setRoom(data.room)
        if (data.features && data.features.length > 0) {
          setFeatures(data.features)
        } else {
          // Initialize with defaults
          setFeatures(DEFAULT_FEATURES.map((f, i) => ({
            feature_name: f.name,
            feature_value: f.value,
            feature_icon: f.icon,
            display_order: i,
            is_premium: false,
            is_active: true,
            isNew: true,
          })))
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [roomId])

  function toggleFeature(index: number) {
    setFeatures((prev) => prev.map((f, i) =>
      i === index ? { ...f, is_active: !f.is_active } : f
    ))
    setSaved(false)
  }

  function togglePremium(index: number) {
    setFeatures((prev) => prev.map((f, i) =>
      i === index ? { ...f, is_premium: !f.is_premium } : f
    ))
    setSaved(false)
  }

  function updateValue(index: number, value: string) {
    setFeatures((prev) => prev.map((f, i) =>
      i === index ? { ...f, feature_value: value } : f
    ))
    setSaved(false)
  }

  function updateIcon(index: number, iconName: string) {
    setFeatures((prev) => prev.map((f, i) =>
      i === index ? { ...f, feature_icon: iconName } : f
    ))
    setSaved(false)
  }

  function addCustomFeature() {
    setFeatures((prev) => [...prev, {
      feature_name: '',
      feature_value: '',
      feature_icon: 'Check',
      display_order: prev.length,
      is_premium: false,
      is_active: true,
      isNew: true,
    }])
    setSaved(false)
  }

  function removeFeature(index: number) {
    setFeatures((prev) => prev.filter((_, i) => i !== index))
    setSaved(false)
  }

  async function saveFeatures() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/features`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: features.filter((f) => f.feature_name.trim()) }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error('Save failed:', err)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Room Features — {room?.room_type} #{room?.room_number}
            </h1>
            <p className="text-gray-500 text-sm">{features.filter((f) => f.is_active).length} active features</p>
          </div>
        </div>
        <button
          onClick={saveFeatures}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Features'}
        </button>
      </div>

      {/* Features List */}
      <div className="space-y-3">
        {features.map((feature, index) => {
          const IconComponent = FEATURE_ICONS.find((i) => i.name === feature.feature_icon)?.icon || Check
          return (
            <div
              key={index}
              className={`bg-white rounded-xl border p-4 transition-colors ${
                feature.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Toggle */}
                <button
                  onClick={() => toggleFeature(index)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    feature.is_active ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      feature.is_active ? 'left-5' : 'left-1'
                    }`}
                  />
                </button>

                {/* Icon selector */}
                <div className="relative group">
                  <button className="w-10 h-10 rounded-lg bg-gray-50 border flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <IconComponent className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 hidden group-hover:grid grid-cols-4 gap-1 z-10">
                    {FEATURE_ICONS.map((icon) => (
                      <button
                        key={icon.name}
                        onClick={() => updateIcon(index, icon.name)}
                        className={`w-8 h-8 rounded flex items-center justify-center hover:bg-blue-50 transition-colors ${
                          feature.feature_icon === icon.name ? 'bg-blue-100' : ''
                        }`}
                        title={icon.name}
                      >
                        <icon.icon className="w-4 h-4 text-gray-600" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <input
                  type="text"
                  value={feature.feature_name}
                  onChange={(e) => {
                    setFeatures((prev) => prev.map((f, i) =>
                      i === index ? { ...f, feature_name: e.target.value } : f
                    ))
                    setSaved(false)
                  }}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Feature name"
                />

                {/* Value/Description */}
                <input
                  type="text"
                  value={feature.feature_value}
                  onChange={(e) => updateValue(index, e.target.value)}
                  className="w-48 px-3 py-2 border rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Description (optional)"
                />

                {/* Premium toggle */}
                <button
                  onClick={() => togglePremium(index)}
                  className={`p-2 rounded-lg transition-colors ${
                    feature.is_premium ? 'bg-amber-100 text-amber-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                  title="Premium feature"
                >
                  <Star className={`w-4 h-4 ${feature.is_premium ? 'fill-current' : ''}`} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => removeFeature(index)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Feature */}
      <button
        onClick={addCustomFeature}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 font-medium"
      >
        <Plus className="w-5 h-5" />
        Add Custom Feature
      </button>
    </div>
  )
}