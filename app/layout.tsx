import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { VoiceReceptionist } from '@/components/ai/VoiceReceptionist'
import { AIConcierge } from '@/components/ai/AIConcierge'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: 'Atican Beach Resort & Hotel | Luxury Beachfront Experience',
  description: 'Experience 7-star luxury at Atican Beach Resort. Book rooms, tents, experiences, and events online.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className={inter.className}>
        <Providers>
          <Header />
          <main className="pt-16 min-h-screen">
            {children}
          </main>
          <Footer />
          <CartDrawer />
          <VoiceReceptionist />
          <AIConcierge />
        </Providers>
      </body>
    </html>
  )
}