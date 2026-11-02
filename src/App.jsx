import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import AppShell from '@/app/AppShell'
import PlaceholderPage from '@/pages/PlaceholderPage'
import ProjectsPage from '@/pages/ProjectsPage'
import ProjectDetailPage from '@/pages/ProjectDetailPage'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import MyWorkPage from '@/pages/MyWorkPage'
import AuthProvider from '@/features/auth/AuthProvider'
import RequireEmployee from '@/features/auth/RequireEmployee'
import { useAuth } from '@/features/auth/useAuth'
import { defaultDashboardPath } from '@/features/auth/dashboardPreference'

function DefaultDashboard() {
  const { roles } = useAuth()
  return <Navigate to={defaultDashboardPath(roles)} replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireEmployee />}>
        <Route element={<AppShell />}>
          <Route index element={<DefaultDashboard />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/my-work" element={<MyWorkPage />} />
          <Route
            path="*"
            element={
              <PlaceholderPage
                title="Page not found"
                description="This address does not match a page in the tracker."
                placeholder="Use the navigation to return to your workspace."
              />
            }
          />
        </Route>
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider><AppRoutes /></AuthProvider>
    </BrowserRouter>
  )
}
