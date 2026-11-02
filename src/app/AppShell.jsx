import { useRef, useState } from 'react'
import { Clock3, Menu, PanelsTopLeft, X } from 'lucide-react'
import { matchPath, NavLink, Outlet, useLocation } from 'react-router'
import { navigation } from '@/app/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/useAuth'

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const { profile, signOut } = useAuth()
  const menuButton = useRef(null)
  const { pathname } = useLocation()
  const currentPage = navigation.find((item) => matchPath({ path: item.path, end: false }, pathname))?.label ?? 'Page not found'

  function closeMenuOnEscape(event) {
    if (event.key === 'Escape') {
      setMenuOpen(false)
      menuButton.current?.focus()
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    setSignOutError('')
    try { await signOut() }
    catch (error) { setSignOutError(error.message) }
    finally { setSigningOut(false) }
  }

  return (
    <div className="min-h-svh bg-background md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <a href="#main-content" className="sr-only z-50 rounded-md bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>

      <aside className="border-b border-border bg-card md:sticky md:top-0 md:h-svh md:border-r md:border-b-0">
        <div className="flex h-20 items-center justify-between px-5">
          <NavLink to="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" aria-label="Barndos Project Tracker dashboard">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <PanelsTopLeft className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-base font-semibold tracking-tight">BARNDOS</span>
              <span className="block text-xs text-muted-foreground">Project Tracker</span>
            </span>
          </NavLink>
          <Button ref={menuButton} variant="ghost" size="icon" className="md:hidden" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="workspace-navigation" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>

        <div id="workspace-navigation" className={cn('flex-col gap-6 px-3 pb-5 md:flex md:h-[calc(100svh-5rem)]', menuOpen ? 'flex' : 'hidden')} onKeyDown={closeMenuOnEscape}>
          <nav aria-label="Main navigation" className="space-y-1">
            <p className="px-3 pt-3 pb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">Workspace</p>
            {navigation.map(({ path, label, icon: Icon }) => (
              <NavLink key={path} to={path} onClick={() => setMenuOpen(false)} className={({ isActive }) => cn('flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}>
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-sm font-medium">Local prototype</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Shared projects, independent workstreams, and Tennessee deadlines.</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-5 py-4 sm:px-8">
          <p className="text-sm text-muted-foreground">Workspace <span className="mx-2 text-border" aria-hidden="true">/</span> <span className="font-medium text-foreground">{currentPage}</span></p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground" title="America/Chicago — automatically follows CST/CDT">
            <Clock3 className="size-4 shrink-0" aria-hidden="true" />
            <span>Deadlines follow <span className="font-medium text-foreground">Tennessee time (CT)</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="max-w-48 truncate text-sm font-medium" title={profile.display_name}>{profile.display_name}</span>
            <Button variant="outline" onClick={handleSignOut} disabled={signingOut}>{signingOut ? 'Signing out…' : 'Sign out'}</Button>
          </div>
        </header>
        {signOutError && <p role="alert" className="px-5 pt-4 text-sm text-destructive sm:px-8">{signOutError}</p>}
        <main id="main-content" key={pathname} tabIndex={-1} className="mx-auto max-w-6xl px-5 py-8 outline-none sm:px-8 sm:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
