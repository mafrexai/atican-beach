import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { User, Mail, Phone, MapPin, Calendar, Save, Shield } from 'lucide-react'

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-[#082032]" style={{ fontFamily: 'var(--font-playfair)' }}>
          My Profile
        </h1>
        <p className="text-gray-600 mt-2">Manage your personal information and preferences</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-[#0A3D62] to-[#082032] p-8 text-white">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
              <User className="w-12 h-12" />
            </div>
            <div>
              <h2 className="text-3xl font-semibold">{profile?.full_name || 'Guest'}</h2>
              <p className="text-blue-100 mt-1">{user.email}</p>
              <div className="flex items-center gap-2 mt-3">
                <Shield className="w-4 h-4" />
                <span className="text-sm opacity-90">Verified Member</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-10">
          <form className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    defaultValue={profile?.full_name || ''}
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#0A3D62] transition"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 bg-gray-50 rounded-2xl text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">Email cannot be changed</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    defaultValue={profile?.phone || ''}
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#0A3D62]"
                    placeholder="+234 801 234 5678"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    defaultValue={profile?.date_of_birth || ''}
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#0A3D62]"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Residential Address</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-6 w-5 h-5 text-gray-400" />
                <textarea
                  defaultValue={profile?.address || ''}
                  rows={4}
                  className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-3xl focus:outline-none focus:border-[#0A3D62] resize-y"
                  placeholder="Enter your full address"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-6 border-t">
              <button
                type="button"
                className="flex items-center gap-3 bg-[#0A3D62] text-white px-10 py-4 rounded-2xl font-semibold hover:bg-[#08324f] transition-all duration-200 shadow-lg shadow-[#0A3D62]/30 hover:shadow-xl"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Security Note */}
      <p className="text-center text-gray-500 text-sm mt-8">
        Your information is secured and used only for booking purposes.
      </p>
    </div>
  )
}