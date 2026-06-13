'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Menu, X, Waves, User, LogIn } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { useAuth } from '@/hooks/useAuth'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/rooms', label: 'Rooms' },
  { href: '/experiences', label: 'Experiences' },
  { href: '/events', label: 'Events' },
  { href: '/dining', label: 'Dining' },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const itemCount = useCartStore((s) => s.getItemCount())
  const { user, loading } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Waves className="w-8 h-8 text-[#0A3D62]" />
            <span className="text-xl font-bold text-[#082032]">Atican Beach</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className="text-[#082032]/70 hover:text-[#0A3D62] font-medium transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {/* Auth */}
            {!loading && (
              user ? (
                <Link
                  href="/dashboard"
                  className="hidden md:flex items-center gap-1.5 text-[#082032]/70 hover:text-[#0A3D62] font-medium transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm">Dashboard</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="hidden md:flex items-center gap-1.5 text-[#082032]/70 hover:text-[#0A3D62] font-medium transition-colors"
                >
                  <LogIn className="w-5 h-5" />
                  <span className="text-sm">Sign In</span>
                </Link>
              )
            )}

            {/* Cart */}
            <Link href="/checkout" className="relative">
              <svg className="w-6 h-6 text-[#082032]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              {mounted && itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#F97316] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </Link>

            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-[#082032]/70">
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden bg-white border-t">
          <nav className="flex flex-col p-4 space-y-3">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                className="text-[#082032]/70 hover:text-[#0A3D62] font-medium py-2">
                {link.label}
              </Link>
            ))}
            <div className="border-t pt-3">
              {user ? (
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 text-[#082032]/70 hover:text-[#0A3D62] font-medium py-2">
                  <User className="w-5 h-5" /> Dashboard
                </Link>
              ) : (
                <Link href="/login" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 text-[#082032]/70 hover:text-[#0A3D62] font-medium py-2">
                  <LogIn className="w-5 h-5" /> Sign In
                </Link>
              )}
            </div>
          </nav>
        </motion.div>
      )}
    </header>
  )
}