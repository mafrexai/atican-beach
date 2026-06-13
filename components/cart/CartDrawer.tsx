'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingBag, Trash2, Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'

export function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const items = useCartStore((s) => s.items)
  const itemCount = useCartStore((s) => s.getItemCount())
  const total = useCartStore((s) => s.getTotal())
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)

  // Only render cart-dependent UI after hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-600 hover:text-[#0A3D62] transition-colors"
        aria-label="Open cart"
      >
        <ShoppingBag className="w-6 h-6" />
        {mounted && itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#F97316] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {itemCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-bold text-[#082032]" style={{ fontFamily: 'var(--font-playfair)' }}>
                  Your Cart
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4">
                {items.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                    <p className="text-gray-500">Your cart is empty</p>
                    <Link
                      href="/rooms"
                      onClick={() => setIsOpen(false)}
                      className="inline-block mt-4 text-[#0A3D62] font-medium hover:underline"
                    >
                      Browse Rooms
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="bg-[#F5F1E8] rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-[#082032]">{item.name}</h3>
                            <p className="text-xs text-gray-500 capitalize">{item.type.replace('_', ' ')}</p>
                            {item.metadata.checkIn && (
                              <p className="text-xs text-gray-400 mt-1">
                                {item.metadata.checkIn} → {item.metadata.checkOut}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-7 h-7 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-7 h-7 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="font-bold text-[#0A3D62]">
                            ₦{(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="border-t p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total</span>
                    <span className="text-xl font-bold text-[#0A3D62]">₦{total.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={clearCart}
                      className="px-4 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition text-sm"
                    >
                      Clear
                    </button>
                    <Link
                      href="/checkout"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 bg-[#0A3D62] text-white py-3 rounded-lg font-semibold text-center hover:bg-[#08324f] transition"
                    >
                      Checkout
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}