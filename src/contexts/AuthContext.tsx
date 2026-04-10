import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  activeClubId: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Public routes that should bypass the Auth Airlock entirely.
// These can be viewed by anonymous visitors with no session at all.
const PUBLIC_ROUTE_PATTERNS: RegExp[] = [
  /^\/login$/,
  /^\/availability\/[^/]+$/,
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTE_PATTERNS.some((re) => re.test(pathname))
}

function AlertIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-full h-full"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
      />
    </svg>
  )
}

function AirlockScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="w-16 h-16 mb-4 text-red-500">
        <AlertIcon />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Not Linked</h1>
      <p className="text-gray-600 mb-4 text-center">Your account is not associated with any club.</p>
      <p className="text-gray-500 text-sm mb-6 text-center">Please contact your administrator.</p>
      <button
        onClick={() => supabase.auth.signOut()}
        className="px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition"
      >
        Sign Out
      </button>
    </div>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeClubId, setActiveClubId] = useState<string | null>(null)
  // Tracks whether we've finished the initial profile lookup for the current
  // session. Needed so the airlock only renders AFTER the profile fetch
  // settles, never during the in-flight gap.
  const [profileResolved, setProfileResolved] = useState(false)

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('club_id')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('fetchProfile error:', error.message)
      setActiveClubId(null)
      setProfileResolved(true)
      return
    }

    if (profile?.club_id) {
      setActiveClubId(profile.club_id)
    } else {
      console.error('fetchProfile: club_id is null or profile missing for user', userId)
      setActiveClubId(null)
    }
    setProfileResolved(true)
  }, [])

  useEffect(() => {
    let cancelled = false

    // Fetch current session on mount
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      if (data.session?.user) {
        fetchProfile(data.session.user.id).finally(() => {
          if (!cancelled) setLoading(false)
        })
      } else {
        setProfileResolved(true)
        setLoading(false)
      }
    })

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        setProfileResolved(false)
        fetchProfile(newSession.user.id)
      } else {
        setActiveClubId(null)
        setProfileResolved(true)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  // Multi-tab sync: when this tab regains focus, re-fetch the session and
  // profile so changes in another tab (sign-in, sign-out, club switch) are
  // picked up without a manual refresh.
  useEffect(() => {
    function handleFocus() {
      supabase.auth.getSession().then(({ data }) => {
        const newSession = data.session
        setSession((prev) => {
          // Only re-fetch profile if the user actually changed (cheap compare
          // on access_token keeps us from hammering the DB on every tab focus).
          const prevToken = prev?.access_token ?? null
          const newToken = newSession?.access_token ?? null
          if (prevToken !== newToken) {
            if (newSession?.user) {
              setProfileResolved(false)
              fetchProfile(newSession.user.id)
            } else {
              setActiveClubId(null)
              setProfileResolved(true)
            }
          }
          return newSession
        })
      })
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchProfile])

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  // ── Auth Airlock ────────────────────────────────────────────
  // Block protected routes if the authenticated user has no club_id.
  // Public routes (login, availability form) MUST render normally so
  // anonymous visitors and admins signing out can still reach them.
  const onPublicRoute = isPublicRoute(location.pathname)
  const airlockActive =
    !onPublicRoute &&
    !loading &&
    profileResolved &&
    session?.user != null &&
    activeClubId == null

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, activeClubId, signIn, signOut }}
    >
      {airlockActive ? <AirlockScreen /> : children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
