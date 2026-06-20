# Atican Beach Resort

A luxury 7-star beachfront resort management system built with Next.js 14, featuring comprehensive booking management, payment processing, and guest experiences.

## 🏖️ Project Overview

Atican Beach Resort is a full-stack hospitality management platform that handles everything from room bookings and payment processing to guest check-in verification and staff management.

## ✨ Implemented Features

### Core Functionality
- **Room Management**: Dynamic room listings with real-time availability from Supabase
- **Booking System**: Complete reservation flow with date selection and guest details
- **Payment Integration**: Paystack payment gateway integration for secure transactions
- **QR Code Verification**: Automated QR code generation for booking confirmations and gate access
- **Email Notifications**: Automated confirmation emails with booking details and QR codes
- **Shopping Cart**: Zustand-powered cart for multi-item bookings
- **User Authentication**: Secure login system for guests and staff

### Guest-Facing Features
- **Homepage**: Hero section with featured rooms, amenities showcase, and call-to-action
- **Room Listings**: Filterable room catalog with pricing and availability
- **Room Details**: Individual room pages with image galleries and booking options
- **Experiences**: Beach activities, bonfire nights, horse riding, and more
- **Dining**: Restaurant menus and reservation system
- **Events & Tents**: Event space booking for weddings, conferences, and celebrations
- **Gallery**: Photo gallery showcasing resort amenities
- **FAQ**: Frequently asked questions section
- **Contact**: Contact form and resort information

### Admin & Staff Features
- **Admin Dashboard**: Comprehensive management interface for bookings, rooms, and staff
- **Staff Portal**: Dedicated interface for gate staff and management
- **Booking Management**: View, edit, and manage all reservations
- **Check-in/Check-out**: QR code scanning and manual code entry for guest verification
- **Room Management**: Add, edit, and manage room inventory

### API & Backend
- **RESTful API**: Next.js API routes for all data operations
- **Supabase Integration**: Real-time database with PostgreSQL
- **Database Migrations**: Version-controlled schema changes
- **Email Service**: Resend integration for transactional emails
- **Image Management**: Optimized image handling and storage

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom brand colors
- **State Management**: Zustand (cart, global state)
- **UI Components**: shadcn/ui with custom components
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Forms**: React Hook Form with Zod validation

### Backend
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage for images
- **API**: Next.js API Routes (App Router pattern)

### Integrations
- **Payments**: Paystack (Nigerian Naira - ₦)
- **Email**: Resend
- **QR Codes**: qrcode (server) + react-qr-code (client)

### Development Tools
- **Linting**: ESLint with Next.js config
- **Package Manager**: npm
- **Deployment**: Vercel
- **Version Control**: Git

## 🎨 Brand Colors

- **Primary Blue**: `#0A3D62` (deep ocean blue)
- **Secondary Blue**: `#082032` (dark navy)
- **Accent Orange**: `#F97316` (sunset orange)
- **Gold**: `#D4AF37` (luxury gold)
- **Cream**: `#F5F1E8` (warm cream)

## 📁 Project Structure

```
atican-beach/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # Authentication routes (login)
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── about/             # About page
│   ├── admin/             # Admin management interface
│   ├── api/               # API routes
│   ├── booking/           # Booking flow & confirmation
│   ├── checkout/          # Payment checkout
│   ├── contact/           # Contact page
│   ├── dashboard/         # User dashboard
│   ├── dining/            # Restaurant & dining
│   ├── events/            # Events & celebrations
│   ├── experiences/       # Beach activities
│   ├── faq/               # FAQ section
│   ├── gallery/           # Photo gallery
│   ├── room-service/      # In-room services
│   ├── rooms/             # Room listings & details
│   ├── staff/             # Staff portal
│   └── tents/             # Event tent bookings
├── components/            # Reusable UI components
│   ├── admin/             # Admin-specific components
│   ├── ai/                # AI-powered features
│   ├── booking/           # Booking flow components
│   ├── cart/              # Shopping cart components
│   ├── layout/            # Layout components (nav, footer)
│   ├── providers/         # Context providers
│   ├── rooms/             # Room-related components
│   ├── staff/             # Staff-specific components
│   └── ui/                # Base UI components (shadcn)
├── hooks/                 # Custom React hooks
│   └── useAuth.ts         # Authentication hook
├── lib/                   # Utility functions & integrations
│   ├── ai/                # AI integration utilities
│   ├── api/               # API utilities
│   ├── availability/      # Room availability logic
│   ├── email/             # Email service (Resend)
│   ├── images/            # Image utilities
│   ├── paystack/          # Paystack payment integration
│   ├── resend/            # Resend email client
│   ├── supabase/          # Supabase client & queries
│   └── utils/             # General utilities
├── stores/                # Zustand state stores
│   ├── cart.ts            # Cart store
│   └── cartStore.ts       # Cart store implementation
├── types/                 # TypeScript type definitions
│   ├── database.ts        # Database schema types
│   ├── index.ts           # General types
│   └── paystack.d.ts      # Paystack types
├── skills/                # AI assistant skill definitions
│   ├── atican-architect.yaml    # Frontend architecture rules
│   ├── hotel-db-schema.yaml     # Database schema rules
│   ├── paystack-handler.yaml    # Payment processing rules
│   └── qr-verification.yaml     # QR code verification rules
├── scripts/               # Database & setup scripts
│   ├── create-admin.js    # Create admin user
│   ├── create-staff.js    # Create staff user
│   ├── seed-data.js       # Seed sample data
│   └── setup-database.js  # Database setup
└── supabase/              # Supabase configuration
    └── migrations/        # Database migrations
```

## 🔧 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Paystack account (for payments)
- Resend account (for emails)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mafrexai/atican-beach.git
cd atican-beach
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Paystack
PAYSTACK_SECRET_KEY=your_paystack_secret_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
```

5. Set up the database:
```bash
npm run setup-database
npm run seed-data
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run setup-database` - Initialize database schema
- `npm run seed-data` - Seed sample data
- `npm run create-admin` - Create admin user
- `npm run create-staff` - Create staff user

## 🎯 Coding Standards & Rules

### Architecture Rules
- **Always use Next.js 14 App Router** (app/ directory, not pages/)
- **TypeScript strict mode** — no 'any' types, use proper type definitions from types/database.ts
- **Add 'use client' directive** at the top of any component using useState, useEffect, event handlers, or browser APIs
- **Add 'use client' directive** for any component using Framer Motion (motion.div, AnimatePresence, etc.)
- **Use Zustand (stores/)** for global state — cartStore.ts pattern with persistence
- **Use Zod schemas** for all form validation with @hookform/resolvers
- **Use Server Components by default** — only use Client Components when interactivity is needed
- **API routes** go in app/api/route.ts pattern
- **Use path aliases**: @/components/, @/lib/, @/stores/, @/types/, @/hooks/
- **Tailwind CSS** for styling — use the blue/orange brand color palette
- **Use lucide-react** for icons
- **Error boundaries and loading states** for all async operations

### Database Schema Rules
- All tables use UUID primary keys
- Timestamps: created_at, updated_at for all tables
- Soft deletes via status fields
- Booking reference format: ATC-XXXX (uppercase alphanumeric, 4 chars)
- Confirmation code: 6-digit numeric code
- Room types: standard, deluxe, suite, presidential
- Booking statuses: pending, confirmed, checked_in, checked_out, cancelled

### Payment Processing Rules
- All payments in Nigerian Naira (₦)
- Paystack integration for card payments
- Webhook verification for payment confirmation
- Automatic booking confirmation on successful payment
- Email confirmation with QR code after payment

### QR Verification Rules
- QR data format: JSON with booking_reference, confirmation_code, guest_name, check_in, check_out
- QR codes generated after successful payment
- Gate staff can verify by scanning QR or entering confirmation code manually
- Verification checks: booking exists, status is 'confirmed', dates are valid
- Check-in updates booking status to 'checked_in' and logs timestamp

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | Yes |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key | Yes |
| `RESEND_API_KEY` | Resend API key | Yes |

## 📊 Database Schema

### Core Tables
- **rooms** - Room inventory with type, number, price, amenities
- **bookings** - Reservation details with guest info and dates
- **guests** - Guest profiles and contact information
- **payments** - Payment transactions and status
- **staff** - Staff accounts and roles
- **check_ins** - Check-in/check-out logs
- **experiences** - Available activities and pricing
- **events** - Event bookings and details

## 🚀 Deployment

The application is configured for deployment on Vercel:

```bash
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

## 📝 API Endpoints

### Rooms
- `GET /api/rooms` - List all rooms
- `GET /api/rooms/[id]` - Get room details
- `GET /api/rooms/available` - Check availability

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/[id]` - Get booking details
- `PUT /api/bookings/[id]` - Update booking
- `POST /api/bookings/[id]/confirm` - Confirm booking

### Payments
- `POST /api/payments/initialize` - Initialize Paystack payment
- `POST /api/payments/verify` - Verify payment
- `POST /api/payments/webhook` - Paystack webhook

### QR Verification
- `POST /api/qr/generate` - Generate QR code
- `POST /api/qr/verify` - Verify QR code or confirmation code

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software for Atican Beach Resort.

## 👥 Support

For support, email support@aticanbeach.com or open an issue in the repository.

---

Built with ❤️ for Atican Beach Resort