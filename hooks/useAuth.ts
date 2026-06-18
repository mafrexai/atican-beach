import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, UserRole } from '@/types/database'

export interface User extends Profile {
  email: string
  role: UserRole
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authResolved, setAuthResolved] = useState(false)
  const supabaseRef = useRef(createClient())

  const fetchProfile = useCallback(async (userId: string, email: string) => {
    try {
      const supabase = supabaseRef.current

      // Try to fetch profile — table may not exist in all environments
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      // If profiles table doesn't exist, use a minimal fallback
      if (profileError) {
        console.warn('profiles table not available, using fallback profile')
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single()

        const role: UserRole = userRole?.role || 'guest'
        setUser({ id: userId, email, role } as User)
        return
      }

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()

      const role: UserRole = userRole?.role || profile?.role || 'guest'

      setUser({
        ...(profile as Profile),
        email,
        role,
      })
    } catch (err) {
      console.error('Error fetching profile:', err)
      setUser({ id: userId, email, role: 'guest' } as User)
    }
  }, [])

  // Retry reading session with delay — handles the timing gap between
  // login (cookie set) and onAuthStateChange firing
  const getSessionWithRetry = useCallback(async (maxRetries = 3, delayMs = 300) => {
    const supabase = supabaseRef.current
    for (let i = 0; i < maxRetries; i++) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) return session
      if (i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, delayMs))
      }
    }
    return null
  }, [])

  useEffect(() => {
    const supabase = supabaseRef.current

    const fetchInitialSession = async () => {
      try {
        const session = await getSessionWithRetry()
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email || '')
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('Error fetching session:', err)
        setUser(null)
      } finally {
        setLoading(false)
        setAuthResolved(true)
      }
    }

    fetchInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          // On sign-in, retry reading session to ensure cookie is set
          const retrySession = await getSessionWithRetry()
          if (retrySession?.user) {
            await fetchProfile(retrySession.user.id, retrySession.user.email || '')
          } else if (session?.user) {
            await fetchProfile(session.user.id, session.user.email || '')
          }
        } else if (session?.user) {
          await fetchProfile(session.user.id, session.user.email || '')
        } else {
          setUser(null)
        }
        setLoading(false)
        setAuthResolved(true)
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile, getSessionWithRetry])

  const signOut = async () => {
    const supabase = supabaseRef.current
    await supabase.auth.signOut()
    setUser(null)
    setAuthResolved(true)
  }

  return { user, loading, authResolved, signOut }
}