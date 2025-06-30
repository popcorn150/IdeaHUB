import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { RoleSelector } from '../components/RoleSelector'

interface AuthContextType {
  user: User | null
  profile: any | null
  loading: boolean
  signUp: (email: string, password: string, username: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRoleSelector, setShowRoleSelector] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Enhanced premium status monitoring after payment
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === 'true' && user) {
      console.log('Payment success detected, starting aggressive profile refresh...')
      
      let attempts = 0
      const maxAttempts = 30 // 60 seconds total
      let previousPremiumStatus = profile?.is_premium
      
      const checkPremiumStatus = async () => {
        attempts++
        console.log(`Premium status check attempt ${attempts}/${maxAttempts}`)
        
        try {
          // Force refresh from database
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (error) {
            console.error('Error checking premium status:', error)
            return false
          }
          
          console.log('Current user data:', userData)
          
          // Update profile state immediately if premium status changed
          if (userData.is_premium !== previousPremiumStatus) {
            console.log('✅ Premium status changed! Updating profile...')
            setProfile(userData)
            previousPremiumStatus = userData.is_premium
            
            if (userData.is_premium) {
              console.log('🎉 User is now premium!')
              return true // Stop checking
            }
          }
          
          if (attempts >= maxAttempts) {
            console.log('❌ Max attempts reached, stopping premium status checks')
            return true // Stop checking
          }
          
          return false // Continue checking
        } catch (error) {
          console.error('Error in premium status check:', error)
          return false
        }
      }
      
      // Start checking immediately
      checkPremiumStatus()
      
      // Then check every 2 seconds
      const intervalId = setInterval(async () => {
        const shouldStop = await checkPremiumStatus()
        if (shouldStop) {
          clearInterval(intervalId)
        }
      }, 2000)
      
      // Cleanup interval on unmount
      return () => clearInterval(intervalId)
    }
  }, [user, profile?.is_premium])

  async function fetchProfile(userId: string) {
    try {
      console.log('Fetching profile for user:', userId)
      
      const { data: profileData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        setLoading(false)
        return
      }

      console.log('Profile data fetched:', profileData)

      if (profileData === null) {
        // Profile doesn't exist, create it
        const { data: userData } = await supabase.auth.getUser()
        if (userData.user) {
          const { data: newProfile } = await supabase
            .from('users')
            .insert({
              id: userData.user.id,
              email: userData.user.email!,
              username: userData.user.user_metadata?.username || userData.user.email!.split('@')[0],
              role: 'creator' // Default role
            })
            .select()
            .single()
          setProfile(newProfile)
          
          // Show role selector for new users
          if (newProfile) {
            setShowRoleSelector(true)
          }
        }
      } else {
        setProfile(profileData)
        
        // Show role selector if user doesn't have a role set
        if (!profileData.role) {
          setShowRoleSelector(true)
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      console.log('Manual profile refresh requested')
      await fetchProfile(user.id)
    }
  }

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    })
    if (error) throw error
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        // Check if the error is related to session not found or missing
        if (error.message?.includes('session_not_found') || 
            error.message?.includes('Auth session missing') ||
            error.message?.includes('Session from session_id claim in JWT does not exist')) {
          console.warn('Session already expired or invalid, proceeding with logout')
        } else {
          // Re-throw other types of errors
          throw error
        }
      }
    } catch (error) {
      console.error('Error during sign out:', error)
      // Don't re-throw the error to prevent unhandled exceptions
    } finally {
      // Always redirect to landing page regardless of signOut outcome
      window.location.href = '/'
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile
    }}>
      {children}
      {showRoleSelector && (
        <RoleSelector onComplete={() => setShowRoleSelector(false)} />
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}