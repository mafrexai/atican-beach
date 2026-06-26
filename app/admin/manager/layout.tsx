'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  BedDouble,
  Activity,
  BarChart3,
  MessageSquare,
  Waves,
  LogOut,
  Menu,
  X,
  UserCheck,
  Wrench,
} from 'lucide-react'

const managerNavItems = [
  { name: 'Dashboard', href: '/admin/manager/dashboard', icon: LayoutDashboard },
  { name: 'Staff Management', href: '/admin/manager/staff', icon: UserCheck },
  { name: 'Room Maintenance', href: '/admin/manager/rooms', icon: BedDouble },
  { name: 'Activity Logs', href: '/admin/manager/logs', icon: Activity },
  { name: 'Revenue Analytics', href: '/admin/manager/analytics', icon: BarChart3 },
  { name: 'Follow-ups', href: '/admin/manager/followups', icon: MessageSquare },
]

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/admin/login')
          return
        }

        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()

        if (userRole?.role === 'admin' || userRole?.role === 'manager') {
          setUserEmail(session.user.email || '')
          setLoading(false)
          return
        }

        await supabase.auth.signOut()
        router.push('/admin/login')
      } catch (error) {
        console.error('Manager layout auth error:', error)
        router.push('/admin/login')
      }
    }

    checkAuth()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0A3D62] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading manager portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-20 p-2 bg-[#0A3D62] text-white rounded-lg shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#082032] text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-[#0A3D62]">
            <div className="flex items-center justify-between">
              <Link href="/admin/manager/dashboard" className="flex items-center gap-2">
                <Waves className="w-6 h-6 text-[#D4AF37]" />
                <div>
                  <h2 className="text-lg font-bold">Atican Beach</h2>
                  <p className="text-xs text-gray-400">Manager Portal</p>
                </div>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 hover:bg-[#0A3D62] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            {managerNavItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin/manager/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${isActive ? 'bg-[#0A3D62] text-white' : 'text-gray-300 hover:bg-[#0A3D62]/50 hover:text-white'}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-[#0A3D62]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-[#F97316] rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {userEmail.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userEmail}</p>
                <p className="text-xs text-gray-400">Manager</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 md:p-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}