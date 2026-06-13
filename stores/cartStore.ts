import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  type: 'room' | 'tent' | 'experience' | 'event_space'
  name: string
  price: number
  quantity: number
  metadata: {
    checkIn?: string
    checkOut?: string
    guests?: number
    [key: string]: unknown
  }
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const { items } = get()
        const existingIndex = items.findIndex((i) => i.id === item.id)

        // Track for AI Concierge triggers
        if (item.type === 'room') {
          localStorage.setItem('cart_has_room', 'true')
          if (item.name.toLowerCase().includes('standard')) {
            localStorage.setItem('cart_has_standard_room', 'true')
          }
        }
        if (item.type === 'experience') {
          localStorage.setItem('cart_has_experience', 'true')
        }

        if (existingIndex > -1) {
          const updated = [...items]
          const existing = updated[existingIndex]
          if (existing) {
            existing.quantity += item.quantity
          }
          set({ items: updated })
        } else {
          set({ items: [...items, item] })
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) })
      },

      updateQuantity: (id, quantity) => {
        const { items } = get()
        const index = items.findIndex((i) => i.id === id)
        if (index > -1) {
          const updated = [...items]
          const item = updated[index]
          if (item) {
            item.quantity = Math.max(0, quantity)
            if (item.quantity === 0) {
              set({ items: updated.filter((i) => i.id !== id) })
            } else {
              set({ items: updated })
            }
          }
        }
      },

      clearCart: () => {
        set({ items: [] })
        localStorage.removeItem('cart_has_room')
        localStorage.removeItem('cart_has_standard_room')
        localStorage.removeItem('cart_has_experience')
      },

      getTotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        )
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },
    }),
    {
      name: 'atican-cart',
    }
  )
)