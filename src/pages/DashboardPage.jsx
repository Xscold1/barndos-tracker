import PlaceholderPage from './PlaceholderPage'
import { useAuth } from '@/features/auth/useAuth'
import { dashboardPreference } from '@/features/auth/dashboardPreference'

export default function DashboardPage() {
  const { roles } = useAuth()
  const preference = dashboardPreference(roles)
  return <PlaceholderPage title={`${preference.label} dashboard`} description={preference.scope === 'mine' ? `Your default view: My Work · ${preference.label}.` : 'Your default view: All Team.'} placeholder="Workstream summaries will appear here when dashboard data is connected. Open Projects to view and manage project records." />
}
