# Database Seeding for Atican Beach Resort

This document explains how to seed your Supabase database with the initial data for rooms, tents, experiences, and event spaces.

## Prerequisites

1. Ensure you have the `.env.local` file with the correct Supabase credentials
2. Make sure you have Node.js installed

## Seeding the Database

You can seed the database using either of the following methods:

### Method 1: Using npm script (Recommended)

```bash
npm run seed
```

### Method 2: Direct Node.js execution

```bash
node scripts/seed-data.js
```

## What This Script Does

The seeding script will populate your database with:

- **45 Rooms** across all categories (Standard, Deluxe, Double Bed, Family, Executive, Premium Suite, Executive Suite, Presidential Suite)
- **4 Tent Types** with their capacities and pricing
- **4 Experiences** (Bonfire, Sack Race, Beach Ball, Horse Riding)
- **7 Event Spaces** (Small Setup, Medium Setup, Large Setup, XL Setup, Photo Shoot, Video Shoot, VIP Event Space)

## Verification

After running the script, you can verify the data was seeded correctly by:

1. Going to your Supabase dashboard
2. Running queries like:
   ```sql
   SELECT COUNT(*) FROM rooms; -- Should return 45
   SELECT COUNT(*) FROM tents; -- Should return 4
   SELECT COUNT(*) FROM experiences; -- Should return 4
   SELECT COUNT(*) FROM event_spaces; -- Should return 7
   ```

## Troubleshooting

If you encounter any issues:

1. **Check your .env.local file** - Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correctly set
2. **Verify Supabase credentials** - Ensure the service role key has the necessary permissions
3. **Check for network issues** - Ensure you can connect to your Supabase instance

## Safety

This script uses `upsert` operations, which means:
- If data already exists, it will be updated
- If data doesn't exist, it will be inserted
- No existing data will be deleted

This makes the script safe to run multiple times.