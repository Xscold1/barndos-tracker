import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './useAuth.js'

export default function RequireEmployee() {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'loading') return <p role="status" className="p-8 text-sm text-muted-foreground">Checking employee access…</p>
  if (auth.status !== 'ready') return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
  return <Outlet />
}
