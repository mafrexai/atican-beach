'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, LogOut, CalendarDays, UserCircle, Settings, Home } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { name: 'My Bookings', href: '/dashboard/my-bookings', icon: CalendarDays },
  { name: 'Profile', href: '/dashboard/profile', icon: UserCircle },
]

export function DashboardHeader() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-[#0A3D62] to-[#082032] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-lg font-bold text-[#082032]" style={{ fontFamily: 'var(--font-playfair)' }}>
                Atican Beach
              </span>
            </Link>

            {/* Dashboard Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#0A3D62]/10 text-[#0A3D62]'
                        : 'text-gray-600 hover:text-[#0A3D62] hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-[#0A3D62] hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Site</span>
            </Link>

            {user && (
              <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                <div className="w-8 h-8 bg-[#0A3D62] rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="hidden sm:inline text-sm text-gray-600 max-w-[150px] truncate">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex items-center gap-1 pb-3 -mx-1 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#0A3D62]/10 text-[#0A3D62]'
                    : 'text-gray-600 hover:text-[#0A3D62] hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}