import { useState, useEffect, useCallback } from 'react'
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

  const fetchProfile = useCallback(async (userId: string, email: string) => {
    try {
      const supabase = createClient()
      
      // Fetch profile from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      // Fetch role from user_roles table
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
      // Still set user with email even if profile fetch fails
      setUser({ id: userId, email, role: 'guest' } as User)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Fetch initial session on mount
    const fetchInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
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

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email || '')
        } else {
          setUser(null)
        }
        setLoading(false)
        setAuthResolved(true)
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setAuthResolved(true)
  }

  return { user, loading, authResolved, signOut }
}