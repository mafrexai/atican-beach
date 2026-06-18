import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Check Supabase environment variables early
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase not configured - admin routes will not be protected')
}

// Wrap a promise with a timeout to prevent hanging on network issues
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Supabase timeout')), ms)
    promise.then(
      (val) => { clearTimeout(timer); resolve(val) },
      (err) => { clearTimeout(timer); reject(err) }
    )
  })
}

async function isAdmin(supabase: ReturnType<typeof createServerClient>, userId: string): Promise<boolean> {
  try {
    // Check user_roles table first (with timeout)
    const roleResult = await withTimeout(
      supabase.from('user_roles').select('role').eq('user_id', userId).single(),
      3000
    ) as { data: { role: string } | null; error: any }

    if (!roleResult.error && roleResult.data?.role === 'admin') return true

    // Fallback: check profiles table for role column (with timeout)
    const profileResult = await withTimeout(
      supabase.from('profiles').select('role').eq('id', userId).single(),
      3000
    ) as { data: { role: string } | null; error: any }

    if (!profileResult.error && profileResult.data?.role === 'admin') return true

    return false
  } catch {
    // If any error occurs (table doesn't exist, timeout, etc.), deny access
    return false
  }
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  const pathname = request.nextUrl.pathname
  const isAdminRoute = pathname.startsWith('/admin')
  const isAdminLoginRoute = pathname === '/admin/login'
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isCheckoutRoute = pathname.startsWith('/checkout')

  // Skip all Supabase calls for admin login page — it's public
  if (isAdminLoginRoute) {
    return response
  }

  // For non-admin, non-dashboard, non-checkout routes, skip Supabase entirely
  if (!isAdminRoute && !isDashboardRoute && !isCheckoutRoute) {
    return response
  }

  // If Supabase is not configured, allow access to admin routes (for development)
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase not configured - allowing access to protected route:', pathname)
    return response
  }

  // Auth protection for admin and dashboard routes
  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Get session with timeout and retry to prevent false negatives
  let session = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data } = await withTimeout(
        supabase.auth.getSession(),
        5000
      )
      session = data.session
      break
    } catch {
      if (attempt === 0) {
        // Wait briefly before retry
        await new Promise((r) => setTimeout(r, 500))
      }
    }
  }

  // Protect admin routes
  if (isAdminRoute) {
    if (!session) {
      const redirectUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(redirectUrl)
    }

    const admin = await isAdmin(supabase, session.user.id)
    if (!admin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Protect dashboard routes - redirect to login if not authenticated
  if (isDashboardRoute && !session) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Protect checkout route - redirect to login if not authenticated
  if (isCheckoutRoute && !session) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}