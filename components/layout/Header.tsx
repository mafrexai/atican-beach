'use client'

import Link from 'next/link'
import { UserCircle, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'

export function Header() {
  const { items } = useCartStore()
  const { user, signOut } = useAuth()
  const [itemCount] = useState(items.reduce((sum, item) => sum + item.quantity, 0))
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    setMobileMenuOpen(false)
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0A3D62] to-[#082032] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-[#082032]" style={{ fontFamily: 'var(--font-playfair)' }}>
              Atican Beach
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/rooms" className="text-gray-600 hover:text-[#0A3D62] transition-colors">Rooms</Link>
            <Link href="/tents" className="text-gray-600 hover:text-[#0A3D62] transition-colors">Tents</Link>
            <Link href="/experiences" className="text-gray-600 hover:text-[#0A3D62] transition-colors">Experiences</Link>
            <Link href="/events" className="text-gray-600 hover:text-[#0A3D62] transition-colors">Events</Link>
            <Link href="/dining" className="text-gray-600 hover:text-[#0A3D62] transition-colors">Dining</Link>
          </nav>

          {/* Right side - Cart and User */}
          <div className="flex items-center gap-4">
            {/* Cart Icon */}
            <Link href="/checkout" className="relative p-2 text-gray-600 hover:text-[#0A3D62] transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#F97316] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* User Icon / Auth */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="flex items-center gap-2 text-gray-600 hover:text-[#0A3D62] transition-colors"
                >
                  <UserCircle className="w-6 h-6" />
                  <span className="hidden sm:inline text-sm font-medium">{user.email}</span>
                </button>
                
                {/* User Dropdown */}
                {mobileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2">
                    <Link 
                      href="/dashboard" 
                      className="block px-4 py-2 text-gray-700 hover:bg-[#F5F1E8] transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link 
                      href="/dashboard/my-bookings" 
                      className="block px-4 py-2 text-gray-700 hover:bg-[#F5F1E8] transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Bookings
                    </Link>
                    <Link 
                      href="/dashboard/profile" 
                      className="block px-4 py-2 text-gray-700 hover:bg-[#F5F1E8] transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="flex items-center gap-2 text-gray-600 hover:text-[#0A3D62] transition-colors">
                <UserCircle className="w-6 h-6" />
                <span className="hidden sm:inline text-sm font-medium">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}