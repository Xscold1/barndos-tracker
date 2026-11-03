import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/features/auth/useAuth'
import { postLoginPath } from '@/features/auth/dashboardPreference'

const inputClass = 'mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring'

export default function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  if (auth.status === 'ready') return <Navigate to={postLoginPath(location.state?.from, auth.roles)} replace />

  async function submit(event) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    setBusy(true)
    setFormError('')
    try { await auth.signIn(values.get('email'), values.get('password')) }
    catch (error) { setFormError(error.message || 'Unable to sign in. Please try again.') }
    finally { setBusy(false) }
  }

  async function leaveAccount() {
    setBusy(true)
    setFormError('')
    try { await auth.signOut() }
    catch (error) { setFormError(error.message) }
    finally { setBusy(false) }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <p className="mb-2 text-xs font-semibold tracking-wider text-primary uppercase">Barndos Project Tracker</p>
        <h1 className="text-2xl font-semibold tracking-tight">Employee sign-in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to your team’s project workspace.</p>
        <Card className="mt-6">
          <CardContent>
            {!auth.configured && <p role="status" className="mb-5 text-sm text-muted-foreground">Sign-in is not configured yet. Ask the workspace owner to finish setup.</p>}
            {auth.status === 'loading' ? <p role="status" className="text-sm">Checking employee access…</p>
              : auth.session ? (
                <div>
                  <p role="alert" className="text-sm">{auth.error}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button onClick={auth.retryProfile} disabled={busy}>Retry access check</Button>
                    <Button variant="outline" onClick={leaveAccount} disabled={busy}>Sign out</Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label htmlFor="login-email" className="text-sm font-medium">Work email</label>
                    <input id="login-email" name="email" type="email" autoComplete="username" required maxLength={254} className={inputClass} disabled={!auth.configured || busy} />
                  </div>
                  <div>
                    <label htmlFor="login-password" className="text-sm font-medium">Password</label>
                    <div className="relative">
                      <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required className={`${inputClass} pr-20`} disabled={!auth.configured || busy} />
                      <button type="button" aria-controls="login-password" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} disabled={!auth.configured || busy} className="absolute inset-y-0 right-1 mt-1.5 rounded px-3 text-sm font-medium text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  {auth.error && <p role="alert" className="text-sm text-destructive">{auth.error}</p>}
                  <Button type="submit" className="w-full" disabled={!auth.configured || busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
                </form>
              )}
            {formError && <p role="alert" className="mt-4 text-sm text-destructive">{formError}</p>}
          </CardContent>
        </Card>
        <p className="mt-5 text-xs text-muted-foreground">Employee accounts are provided by the workspace owner. Deadlines follow Tennessee time (CT).</p>
      </div>
    </main>
  )
}
