'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Mail, Lock, Shield, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'

export default function AddStaffPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'front_desk' | 'admin'>('front_desk')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null)

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
    let result = 'Staff'
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(result)
    setShowPassword(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    setCreatedCredentials(null)

    // Validate email domain
    if (!email.endsWith('@aticanbeach.com')) {
      setError('Email must end with @aticanbeach.com')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/staff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password: password || undefined,
          role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create staff account')
      }

      setSuccess('Staff account created successfully!')
      setCreatedCredentials(data.credentials)

      // Reset form
      setName('')
      setEmail('')
      setPassword('')
      setRole('front_desk')
    } catch (err: any) {
      setError(err.message || 'Failed to create staff account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Staff Member</h1>
        <p className="text-gray-500 text-sm mt-1">Create a new staff account with front desk or admin access</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700 font-medium">{success}</p>
          </div>
          {createdCredentials && (
            <div className="bg-white rounded-lg p-3 border border-green-200">
              <p className="text-xs text-gray-500 mb-1">Login Credentials:</p>
              <p className="text-sm text-gray-900"><span className="font-medium">Email:</span> {createdCredentials.email}</p>
              <p className="text-sm text-gray-900"><span className="font-medium">Password:</span> {createdCredentials.password}</p>
              <p className="text-xs text-orange-600 mt-2">⚠️ Copy this password now. It won't be shown again.</p>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <UserPlus className="w-4 h-4 inline mr-1" />
            Full Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm"
            placeholder="e.g., Emily Johnson"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Mail className="w-4 h-4 inline mr-1" />
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm"
            placeholder="emily@aticanbeach.com"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Must end with @aticanbeach.com</p>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Lock className="w-4 h-4 inline mr-1" />
            Password
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm pr-10"
                placeholder="Leave blank for auto-generated"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={generatePassword}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              Generate
            </button>
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Shield className="w-4 h-4 inline mr-1" />
            Role *
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'front_desk' | 'admin')}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm"
          >
            <option value="front_desk">Front Desk</option>
            <option value="admin">Admin</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {role === 'front_desk'
              ? 'Can manage bookings, check-ins, and walk-in guests'
              : 'Full access to all admin features'}
          </p>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#F97316] text-white py-2.5 rounded-lg hover:bg-[#e8680f] transition disabled:opacity-50 font-medium text-sm"
          >
            {loading ? 'Creating...' : 'Create Staff Account'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/staff')}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}