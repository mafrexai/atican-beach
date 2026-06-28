# Atican Beach Resort

A luxury 7-star beachfront resort management system built with Next.js 16, featuring comprehensive booking management, AI-powered receptionist, payment processing, and guest experiences.

## Project Overview

Atican Beach Resort is a full-stack hospitality management platform that handles everything from room bookings and payment processing to guest check-in verification, AI-powered concierge services, and staff management.

## Implemented Features

### Guest-Facing Pages
- **Homepage**: Hero section with featured rooms, resort amenities showcase (beachfront, events, experiences, dining), and call-to-action buttons
- **Room Listings**: Filterable room catalog by type (Standard, Deluxe, Double Bed, Family, Executive, Premium Suite, Executive Suite, Presidential Suite) and price range with search
- **Room Details**: Individual room pages with image galleries, pricing, amenity details, and add-to-cart functionality
- **Experiences**: Beach activities - Bonfire Night, Sack Race, Beach Ball, Horse Riding - with pricing and add-to-cart
- **Event Tents**: Premium tent setups for weddings and corporate events (Standard, Space, VIP, VVIP Atican Tents)
- **Event Spaces**: Beachfront venues for photo shoots, video shoots, VIP events, and custom setups
- **Dining**: Ocean-view restaurant with menu highlights and table reservation form
- **Room Service**: In-room dining menu with ordering (Breakfast, Mains, Desserts, Drinks) and room delivery
- **Gallery**: Resort photo showcase organized by category (Rooms, Tents, Dining, Experiences, Event Spaces, Beach)
- **FAQ**: Categorized questions covering bookings, check-in, rooms, payment, and policies
- **Contact**: Contact form with resort location, phone, email, and operating hours
- **About**: Resort story with stats (45 rooms, 7 event spaces, 4 experiences), values, and brand identity

### Authentication and User Dashboard
- **Login/Register**: Supabase Auth with email/password, form validation, and redirect support
- **My Bookings**: View upcoming and past bookings with status indicators, QR codes, and booking details
- **User Profile**: Personal information management with Supabase profiles integration

### Shopping Cart and Checkout
- **Zustand Cart**: Persistent cart supporting rooms, tents, experiences, and event spaces with quantity management
- **Cart Drawer**: Slide-out cart accessible from any page showing items and total
- **Checkout Flow**: Multi-step checkout with guest info, Paystack payment integration, and booking creation
- **Booking Confirmation**: Success page with booking reference, QR code generation, and booking details summary

### AI-Powered Features
- **AI Receptionist**: OpenRouter (Gemini 2.0 Flash)-powered chatbot with voice input/output (Web Speech API), Supabase knowledge base, booking intent detection, conversation history tracking, and context-aware responses about rooms, pricing, policies, experiences, dining, events, gate fees, and more
- **AI Concierge**: Smart upselling system with context-aware offers (suite upgrades, experience bundles, dining specials, sunset dinner packages) triggered by user behavior (page visits, cart contents, time on site)
- **Knowledge Base**: Admin-managed AI knowledge entries with categories, keywords, and search scoring for accurate responses
- **Booking Intent Detection**: Natural language processing to detect and guide booking requests from conversation
- **Conversation Persistence**: AI chat sessions saved to Supabase for continuity and analytics

### Admin Panel
- **Dashboard**: Overview with stats (total rooms, tents, experiences, bookings, pending bookings, revenue)
- **Bookings Management**: View and filter bookings by type (online/walk-in), status, and check-in status with admin override
- **Rooms Management**: View all rooms with image status tracking, individual room detail editing
- **Room Features**: Per-room feature management (name, value, icon, premium flag)
- **Room Media**: Per-room image upload and gallery management via Supabase Storage
- **Experiences Management**: List, edit, and manage experiences with image management
- **Tents Management**: List, edit, and manage tent inventory with image management
- **Payments Tracking**: Revenue summary, paid/pending bookings, and payment details
- **Staff Management**: Add, activate, and deactivate front desk staff with role-based access
- **Users Management**: View all registered users and their roles
- **AI Knowledge Base**: CRUD management of AI Receptionist knowledge entries (add, edit, delete, search by category/keywords)
- **Batch Image Upload**: Drag-and-drop image upload matching files to rooms by filename
- **Settings**: Resort configuration (name, email, phone)

### Manager Portal
- **Manager Dashboard**: Operational overview with staff count, active rooms, and confirmed bookings
- **Staff Management**: View and manage front desk staff with active/inactive status
- **Rooms Management**: Full room inventory view with availability status
- **Maintenance Tracking**: Facility maintenance requests with status (pending, in progress, completed)
- **Activity Logs**: Staff activity and booking operation logs for audit trail
- **Analytics**: Operational analytics page (placeholder for future charts)

### Staff Portal
- **Staff Dashboard**: Today's arrivals, departures, and currently checked-in guests at a glance
- **Check-in/Check-out**: Search by booking reference, email, or phone; verify and process check-in/check-out with timestamps
- **Walk-in Booking**: Create bookings for walk-in guests with room/tent/experience selection and price calculation
- **Activity Log**: Log observations, maintenance needs, and guest notes
- **Staff Login**: Role-based authentication (admin and front_desk roles)

### API and Backend
- **Booking Creation** (POST /api/bookings/create): Create booking with QR code generation, email confirmation, and booking items
- **Payment Update** (POST /api/bookings/update-payment): Update payment status after verification
- **Paystack Initialize** (POST /api/paystack/initialize): Initialize payment with Zod validation and booking verification
- **Paystack Verify** (POST /api/paystack/verify): Verify payment with Paystack API
- **Paystack Webhook** (POST /api/paystack/webhook): HMAC signature verification for automatic booking confirmation on payment success
- **AI Receptionist** (POST /api/ai/receptionist): Gemini-powered responses with knowledge base lookup, booking intent detection, and conversation persistence
- **Admin Room CRUD** (api/admin/rooms/[id], features, images): Room data management
- **Admin Experience CRUD** (api/admin/experiences/[id], images): Experience data management
- **Admin Tent CRUD** (api/admin/tents/[id], images): Tent data management
- **Staff Creation** (POST /api/admin/staff/create): Create staff user with role assignment

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router, React 19)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 with custom brand color palette (ocean, navy, sand, gold, coral)
- **State Management**: Zustand (persistent cart store with AI concierge triggers)
- **UI Components**: Custom components with lucide-react icons
- **Animations**: Framer Motion
- **Forms**: React Hook Form with Zod validation
- **Fonts**: Playfair Display (display) + Inter (body)

### Backend
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth with role-based access (admin, manager, front_desk, guest)
- **Storage**: Supabase Storage for images (atican-media bucket)
- **API**: Next.js API Routes (App Router pattern) with Zod validation

### AI
- **Model**: Google OpenRouter (Gemini 2.0 Flash)
- **Knowledge Base**: Supabase-hosted with keyword scoring
- **Markdown Stripping**: AI responses cleaned of `**`, `*`, `#` before display and TTS for smooth voice output
- **Voice**: Female Nigerian English voice preference with emoji/bullet stripping
- **Voice**: Web Speech API (SpeechRecognition + SpeechSynthesis)
- **Fallback**: Rule-based response system when Gemini unavailable

### Integrations
- **Payments**: Paystack (Nigerian Naira) with webhook verification
- **Email**: Resend for booking confirmations with QR codes
- **QR Codes**: qrcode (server-side) + react-qr-code (client-side)

### Development Tools
- **Linting**: ESLint with Next.js config
- **Package Manager**: npm
- **Deployment**: Vercel
- **Version Control**: Git with Gitflow (main/develop/feature branches)

## Brand Colors

| Name | Hex | Usage |
|------|-----|-------|
| Ocean Blue | #0A3D62 | Primary brand color |
| Deep Navy | #082032 | Headers, dark backgrounds |
| Sunset Orange | #F97316 | CTAs, accents |
| Luxury Gold | #D4AF37 | Premium features, star rating |
| Warm Cream | #F5F1E8 | Page backgrounds |

## Project Structure

`
atican-beach/
|-- app/                    # Next.js 16 App Router
|   |-- (auth)/            # Authentication routes (login, register)
|   |-- about/             # About page
|   |-- admin/             # Admin management interface
|   |   |-- ai/knowledge/  # AI Knowledge Base management
|   |   |-- bookings/     # Booking management
|   |   |-- rooms/         # Room management + features + media
|   |   |-- experiences/   # Experience management + media
|   |   |-- tents/         # Tent management + media
|   |   |-- payments/      # Payment tracking
|   |   |-- staff/         # Staff management + add
|   |   |-- users/         # User management
|   |   |-- batch-upload/  # Batch image upload
|   |   |-- settings/      # Resort settings
|   |   |-- manager/       # Manager sub-dashboard
|   |-- api/               # API routes
|   |   |-- ai/receptionist/ # AI Receptionist endpoint
|   |   |-- bookings/      # Booking creation + payment update
|   |   |-- paystack/      # Initialize, verify, webhook, status
|   |   |-- admin/         # Admin CRUD (rooms, experiences, tents, staff)
|   |-- booking/confirmation/ # Booking confirmation with QR code
|   |-- checkout/          # Payment checkout
|   |-- contact/           # Contact page
|   |-- dashboard/         # User dashboard (my-bookings, profile)
|   |-- dining/            # Restaurant and dining
|   |-- events/            # Event spaces
|   |-- experiences/       # Beach activities
|   |-- faq/               # FAQ section
|   |-- gallery/           # Photo gallery
|   |-- manager/           # Manager portal (dashboard, staff, rooms, maintenance, activity, analytics)
|   |-- room-service/      # In-room dining
|   |-- rooms/             # Room listings + [id] details
|   |-- staff/             # Staff portal (dashboard, check-in, book, activity-log)
|   |-- tents/             # Event tent bookings
|-- components/            # Reusable UI components
|   |-- admin/             # Admin-specific components
|   |-- ai/                # AIConcierge + VoiceReceptionist
|   |-- booking/           # Booking flow components
|   |-- cart/              # CartDrawer
|   |-- layout/            # Header + Footer + DashboardHeader
|   |-- providers/         # React providers + PageLoadTracker
|   |-- rooms/             # AddToCartButton + RoomImageGallery
|   |-- staff/             # ActivityLog + ShiftNotes
|   |-- ui/                # DatePicker
|-- hooks/                 # Custom React hooks
|   |-- useAuth.ts         # Authentication hook with session management
|-- lib/                   # Utility functions and integrations
|   |-- ai/                # receptionist.ts (Gemini + knowledge base) + responses.ts (rule-based) + concierge.ts
|   |-- api/               # responses.ts + validation.ts (Zod schemas)
|   |-- availability/      # checkAvailability.ts
|   |-- email/             # sendConfirmation.ts (Resend integration)
|   |-- images/            # imageOptimizer.ts + uploadImage.ts
|   |-- paystack/          # index.ts (Paystack SDK wrapper)
|   |-- resend/            # index.ts (Resend client)
|   |-- supabase/          # client.ts + server.ts + queries.ts
|   |-- utils/             # bookingCodes.ts + index.ts
|-- stores/                # Zustand state stores
|   |-- cart.ts            # Basic cart store
|   |-- cartStore.ts       # Enhanced cart store with AI concierge triggers
|-- types/                 # TypeScript type definitions
|   |-- database.ts        # Full database schema types (Room, Tent, Experience, Booking, etc.)
|   |-- index.ts           # General types (User, CartItem)
|   |-- paystack.d.ts      # Paystack type declarations
|-- skills/                # AI assistant skill definitions
|   |-- atican-architect.yaml + hotel-db-schema.yaml + paystack-handler.yaml + qr-verification.yaml
|-- scripts/               # Database and setup scripts
|   |-- create-admin.js    # Create admin user
|   |-- create-staff.js    # Create staff user
|   |-- seed-data.js       # Seed sample data
|   |-- setup-database.js  # Full database setup
|   |-- reset-bucket.js    # Reset Supabase storage bucket
|-- supabase/migrations/   # Database migrations (11 files)
|-- .github/               # CODEOWNERS + CONTRIBUTING.md + PR template
`

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- Supabase account
- Paystack account (for payments)
- Resend account (for emails)
- Google AI Studio API key (for Gemini AI)

### Installation

1. Clone the repository:
`ash
git clone https://github.com/mafrexai/atican-beach.git
cd atican-beach
`

2. Install dependencies:
`ash
npm install
`

3. Set up environment variables:
`ash
cp .env.local.example .env.local
# Edit .env.local with your actual values
`

4. Set up the database:
`ash
npm run seed
`

5. Run the development server:
`ash
npm run dev
`

6. Open http://localhost:3000

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL | Yes |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anonymous key | Yes |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key | Yes |
| PAYSTACK_SECRET_KEY | Paystack secret key | Yes |
| NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY | Paystack public key | Yes |
| RESEND_API_KEY | Resend API key | Yes |
| OPENROUTER_API_KEY | OpenRouter API key | Yes |
| NEXT_PUBLIC_APP_URL | App public URL | No |

## Database Schema

### Core Tables
- **rooms** - Room inventory (number, type, price, max_occupancy, amenities, is_active, image_url, gallery_images)
- **tents** - Event tent inventory (name, capacity, price, quantity_available, image_url)
- **experiences** - Beach activities (name, description, price, price_unit, image_url)
- **event_spaces** - Event venue bookings (space_name, capacity, price)
- **bookings** - Reservations (reference, confirmation_code, guest info, dates, status, payment_status, qr_code, booking_type)
- **booking_items** - Line items per booking (item_type: room/tent/experience/event_space/dining, quantity, price)
- **booking_comments** - Internal and guest comments on bookings
- **booking_activity_logs** - Audit trail for booking operations
- **room_features** - Per-room feature list (feature_name, value, icon, is_premium)
- **user_roles** - Role assignments (admin, manager, front_desk, guest) with staff metadata
- **profiles** - User profile information
- **dining_reservations** - Restaurant reservations
- **room_service_orders** - In-room dining orders
- **gate_entries** - Entry/exit verification logs
- **facility_maintenance** - Maintenance requests and tracking
- **staff_activity_logs** - Staff shift observations and notes
- **ai_knowledge_base** - AI Receptionist knowledge entries (category, question, answer, keywords)
- **ai_conversations** - AI chat session history (session_id, role, message, context)
- **ai_booking_intents** - AI-initiated booking tracking

## Database Migrations

1. initial_schema - Core tables (rooms, bookings, experiences, events)
2. room_images_and_features - Image storage and per-room features
3. create_user_roles - Role-based access control
4. create_missing_tables - Additional tables (comments, activity logs, dining, room service)
5. fix_storage_and_rls - Supabase Storage bucket and RLS policies
6. staff_dashboard_enhancement - Staff activity logs and front desk features
7. fix_storage_bucket + fix_rls_and_policies - Storage access fixes
8. add_manager_role - Manager role with dedicated portal
9. add_front_desk_logs_access - Front desk log access
10. ai_knowledge_base - AI tables (knowledge_base, conversations, booking_intents)
11. seed_ai_knowledge_base - Pre-populated AI knowledge entries

## Design Rules

- Use brand color CSS variables (--color-ocean-600, --color-navy-500, etc.)
- Use Playfair Display for headings (font-display), Inter for body text
- Use lucide-react for icons
- Error boundaries and loading states for all async operations
- All payments in Nigerian Naira
- Booking reference format: ATC-XXXX
- Confirmation code: 6-digit numeric

## API Endpoints

### AI Receptionist
- POST /api/ai/receptionist - Chat with AI (message, sessionId, conversationHistory)
- GET /api/ai/receptionist - Check API status and get welcome message

### Bookings
- POST /api/bookings/create - Create booking with QR code + email confirmation
- POST /api/bookings/update-payment - Update payment status

### Payments
- POST /api/paystack/initialize - Initialize Paystack payment
- POST /api/paystack/verify - Verify payment
- POST /api/paystack/webhook - Paystack webhook (auto-confirms booking on success)
- GET /api/paystack/status - Payment configuration status

### Admin CRUD
- GET/PUT /api/admin/rooms/[id] - Room management
- POST/GET /api/admin/rooms/[id]/features - Room features
- POST /api/admin/rooms/images - Room image upload
- GET/PUT /api/admin/experiences/[id] - Experience management
- POST /api/admin/experiences/images - Experience image upload
- GET/PUT /api/admin/tents/[id] - Tent management
- POST /api/admin/tents/images - Tent image upload
- POST /api/admin/staff/create - Create staff member

## Deployment

Deploy to Vercel:
`ash
vercel
`
Or connect your GitHub repository to Vercel for automatic deployments.

## Contributing

1. Fork the repository
2. Create a feature branch (git checkout -b feature/amazing-feature)
3. Commit your changes (git commit -m 'Add amazing feature')
4. Push to the branch (git push origin feature/amazing-feature)
5. Open a Pull Request

See CONTRIBUTING.md for detailed branch workflow and commit conventions.

## License

This project is proprietary software for Atican Beach Resort.

## Support

For support, email info@aticanbeachresort.com or open an issue in the repository.

---

Built with love for Atican Beach Resort
