'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UtensilsCrossed, Plus, Minus, ShoppingBag, ChevronRight, Clock, CheckCircle } from 'lucide-react'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
}

const menuItems: MenuItem[] = [
  { id: '1', name: 'Full English Breakfast', description: 'Eggs, bacon, sausage, beans, toast, and grilled tomato', price: 12000, category: 'Breakfast' },
  { id: '2', name: 'Pancake Stack', description: 'Fluffy pancakes with maple syrup and fresh berries', price: 8000, category: 'Breakfast' },
  { id: '3', name: 'Continental Breakfast', description: 'Croissant, jam, butter, fresh juice, and coffee', price: 7000, category: 'Breakfast' },
  { id: '4', name: 'Grilled Lobster', description: 'Whole lobster with lemon herb butter and sides', price: 35000, category: 'Mains' },
  { id: '5', name: 'Seafood Paella', description: 'Spanish rice with prawns, mussels, and calamari', price: 18000, category: 'Mains' },
  { id: '6', name: 'Grilled Fish', description: 'Catch of the day with plantain and salad', price: 15000, category: 'Mains' },
  { id: '7', name: 'Jollof Rice', description: 'Nigerian classic with assorted meat and plantain', price: 9000, category: 'Mains' },
  { id: '8', name: 'Caesar Salad', description: 'Crisp romaine with parmesan, croutons, and dressing', price: 7000, category: 'Mains' },
  { id: '9', name: 'Coconut Panna Cotta', description: 'Creamy coconut dessert with berry compote', price: 5000, category: 'Desserts' },
  { id: '10', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with vanilla ice cream', price: 6000, category: 'Desserts' },
  { id: '11', name: 'Fresh Fruit Platter', description: 'Seasonal tropical fruits', price: 4000, category: 'Desserts' },
  { id: '12', name: 'Chapman', description: 'Nigerian non-alcoholic cocktail', price: 3000, category: 'Drinks' },
  { id: '13', name: 'Fresh Juice', description: 'Orange, pineapple, or watermelon', price: 2500, category: 'Drinks' },
  { id: '14', name: 'Coffee / Tea', description: 'Espresso, cappuccino, or selection of teas', price: 2000, category: 'Drinks' },
  { id: '15', name: 'Bottle of Wine', description: 'Red or white, selection available', price: 15000, category: 'Drinks' },
]

const categories = ['Breakfast', 'Mains', 'Desserts', 'Drinks']

export default function RoomServicePage() {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [activeCategory, setActiveCategory] = useState('Breakfast')
  const [roomNumber, setRoomNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const addToCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
  }

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const updated = { ...prev }
      if (updated[id] && updated[id] > 1) {
        updated[id] = updated[id] - 1
      } else {
        delete updated[id]
      }
      return updated
    })
  }

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find((m) => m.id === id)
    return sum + (item ? item.price * qty : 0)
  }, 0)

  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0)

  const handleSubmitOrder = async () => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setLoading(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md mx-4">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-[#082032] mb-2">Order Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Your room service order has been sent to our kitchen. Estimated delivery: 30-45 minutes.
          </p>
          <p className="text-sm text-gray-400 mb-6">Room: {roomNumber}</p>
          <button
            onClick={() => { setSubmitted(false); setCart({}); setRoomNumber(''); setNotes('') }}
            className="bg-[#0A3D62] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#08324f] transition-colors"
          >
            Place Another Order
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Hero */}
      <section className="relative py-20 bg-gradient-to-r from-[#0A3D62] to-[#082032] text-white">
        <div className="absolute inset-0 bg-[url('/hero-beach.jpg')] bg-cover bg-center opacity-15" />
        <div className="relative max-w-7xl mx-auto px-4 text-center animate-fade-in">
          <UtensilsCrossed className="w-14 h-14 mx-auto mb-4 text-[#D4AF37]" />
          <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair)' }}>
            Room Service
          </h1>
          <p className="text-lg text-blue-200 max-w-xl mx-auto">
            Order from our menu and have it delivered to your room. Available 24 hours.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu */}
          <div className="lg:col-span-2">
            {/* Category Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat
                      ? 'bg-[#0A3D62] text-white'
                      : 'bg-white text-gray-600 hover:bg-[#0A3D62]/10 border'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu Items */}
            <div className="space-y-4">
              {menuItems
                .filter((item) => item.category === activeCategory)
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-5 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#082032] text-lg">{item.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                      <p className="text-[#0A3D62] font-bold mt-2">₦{item.price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      {cart[item.id] ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                          >
                            <Minus className="w-4 h-4 text-gray-600" />
                          </button>
                          <span className="w-8 text-center font-semibold text-[#082032]">{cart[item.id]}</span>
                          <button
                            onClick={() => addToCart(item.id)}
                            className="w-8 h-8 rounded-full bg-[#0A3D62] flex items-center justify-center hover:bg-[#08324f] transition-colors"
                          >
                            <Plus className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item.id)}
                          className="bg-[#0A3D62] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#08324f] transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" /> Add
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="w-5 h-5 text-[#0A3D62]" />
                <h2 className="text-lg font-semibold text-[#082032]">Your Order</h2>
                {cartCount > 0 && (
                  <span className="bg-[#F97316] text-white text-xs px-2 py-0.5 rounded-full">{cartCount}</span>
                )}
              </div>

              {cartCount === 0 ? (
                <div className="text-center py-8">
                  <UtensilsCrossed className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Your cart is empty</p>
                  <p className="text-gray-400 text-xs mt-1">Add items from the menu</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                    {Object.entries(cart).map(([id, qty]) => {
                      const item = menuItems.find((m) => m.id === id)
                      if (!item) return null
                      return (
                        <div key={id} className="flex justify-between items-center text-sm">
                          <div>
                            <span className="text-[#082032] font-medium">{item.name}</span>
                            <span className="text-gray-400 ml-1">× {qty}</span>
                          </div>
                          <span className="text-[#0A3D62] font-semibold">₦{(item.price * qty).toLocaleString()}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="border-t pt-4 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[#082032]">Total</span>
                      <span className="text-xl font-bold text-[#0A3D62]">₦{cartTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room Number *</label>
                      <input
                        type="text"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        placeholder="e.g. 201"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Allergies, preferences..."
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitOrder}
                    disabled={!roomNumber || loading}
                    className="w-full bg-[#F97316] text-white py-3 rounded-lg font-semibold hover:bg-[#e0650f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? 'Submitting...' : <>Place Order <ChevronRight className="w-5 h-5" /></>}
                  </button>

                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>Estimated delivery: 30-45 minutes</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}