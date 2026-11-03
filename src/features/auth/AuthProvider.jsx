import { useEffect, useReducer } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { AuthContext } from './authContext.js'
import { authReducer, initialAuthState } from './authState.js'
import { signInError } from './signInError.js'

export default function AuthProvider({ children, client = supabase }) {
  const [state, dispatch] = useReducer(authReducer, Boolean(client), initialAuthState)
  const userId = state.session?.user.id

  useEffect(() => {
    if (!client) return
    let active = true
    let eventReceived = false
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      // No awaited Supabase calls inside this callback: profile reads run in a separate effect.
      eventReceived = true
      if (active) dispatch({ type: 'session', session })
    })
    client.auth.getSession().then(({ data, error }) => {
      if (!active || eventReceived) return
      if (error) dispatch({ type: 'failure', message: 'Your session could not be restored. Reload this page and try again.' })
      else dispatch({ type: 'session', session: data.session })
    }).catch(() => {
      if (active && !eventReceived) dispatch({ type: 'failure', message: 'Your session could not be restored. Reload this page and try again.' })
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [client])

  useEffect(() => {
    if (!client || !userId) return
    let active = true
    async function loadEmployee() {
      try {
        const [profileResult, rolesResult] = await Promise.all([
          client.from('profiles').select('id,display_name,is_active').eq('id', userId).maybeSingle(),
          client.from('user_roles').select('role,is_default').eq('user_id', userId).order('role'),
        ])
        if (!active) return
        if (profileResult.error || rolesResult.error) throw new Error('Profile lookup failed')
        const profile = profileResult.data
        if (!profile?.is_active || profile.id !== userId) {
          dispatch({ type: 'failure', userId, denied: true, message: 'Your account is not enabled for this workspace. Contact your project manager.' })
        } else {
          dispatch({ type: 'profile', userId, profile, roles: rolesResult.data ?? [] })
        }
      } catch {
        if (active) dispatch({ type: 'failure', userId, message: 'Employee access could not be confirmed. Check your connection and try again.' })
      }
    }
    loadEmployee()
    return () => { active = false }
  }, [client, userId, state.requestVersion])

  async function signIn(email, password) {
    if (!client) throw new Error('Sign-in is not configured. Contact the workspace owner.')
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password })
    if (error || !data.session) throw new Error(signInError(error))
    dispatch({ type: 'session', session: data.session })
  }

  async function signOut() {
    const { error } = await client.auth.signOut({ scope: 'local' })
    if (error) throw new Error('Unable to sign out. Check your connection and try again.')
    dispatch({ type: 'session', session: null })
  }

  return (
    <AuthContext.Provider value={{ ...state, configured: Boolean(client), signIn, signOut, retryProfile: () => dispatch({ type: 'retry' }) }}>
      {children}
    </AuthContext.Provider>
  )
}
