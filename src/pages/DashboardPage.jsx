import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import ProjectState from '@/components/projects/ProjectState'
import DashboardSummaryCard from '@/components/dashboard/DashboardSummaryCard'
import DashboardWorkList from '@/components/dashboard/DashboardWorkList'
import { useAuth } from '@/features/auth/useAuth'
import { useDashboardData } from '@/features/dashboard/useDashboardData'
import { DASHBOARD_WORKSTREAMS } from '@/features/dashboard/createDashboardService'
import { dashboardParamsAfter, dashboardViewFromParams } from '@/features/dashboard/dashboardView'
import { formatDeadline, WORKSTREAMS } from '@/features/projects/projectModel'

const streams = DASHBOARD_WORKSTREAMS.map((type) => WORKSTREAMS.find((stream) => stream.type === type))

export default function DashboardPage() {
  const { roles } = useAuth()
  const [params, setParams] = useSearchParams()
  const view = dashboardViewFromParams(params, roles)
  const { data, loading, error, refreshError, reload, refresh } = useDashboardData(view)
  const selected = streams.find((stream) => stream.type === view.workstream)
  const returnedPage = data?.list?.page
  function change(action) { setParams(dashboardParamsAfter(params, view, action), { replace: true }) }
  useEffect(() => {
    if (returnedPage && returnedPage !== view.page) setParams((current) => dashboardParamsAfter(current, dashboardViewFromParams(current, roles), { type: 'page', value: returnedPage }), { replace: true })
  }, [returnedPage, view.page, roles, setParams])

  return (
    <section aria-labelledby="dashboard-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold tracking-wider text-primary uppercase">Barndos workspace</p><h1 id="dashboard-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1><p className="mt-2 text-sm text-muted-foreground">Independent workstreams, assignments and Tennessee deadlines.</p></div>
        <Button variant="outline" onClick={reload}>Reload dashboard</Button>
      </div>
      <div className="mt-6 inline-flex flex-wrap gap-1 rounded-lg border bg-card p-1" role="group" aria-label="Dashboard scope">{[['team', 'All Team'], ['mine', 'My Work']].map(([value, label]) => <Button key={value} variant={view.scope === value ? 'default' : 'ghost'} aria-pressed={view.scope === value} onClick={() => change({ type: 'scope', value })}>{label}</Button>)}</div>
      {data && <p className="mt-4 text-xs text-muted-foreground">Company date: <span className="font-medium">{formatDeadline(data.company_today)}</span> · Tennessee time (CT). Counts and deadlines use this date.</p>}
      {refreshError && <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"><p>Dashboard refresh failed. Counts and deadlines still reflect the last verified response for {formatDeadline(data.company_today)}. {refreshError}</p><Button variant="outline" onClick={refresh}>Retry refresh</Button></div>}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Workstream summaries" aria-busy={loading}>
        {streams.map((stream) => <DashboardSummaryCard key={stream.type} stream={stream} summary={data?.cards.find((card) => card.workstream_type === stream.type)} selected={view.workstream === stream.type} onSelect={() => change({ type: 'select', workstream: stream.type })} />)}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Pending includes work awaiting client review and unassigned work. Client review is excluded from drafting due-today and overdue counts. Select a card to {selected ? 'switch or close its list' : 'open its list'}.</p>
      <div id="dashboard-workstream-list">
        {loading ? <ProjectState loading title="Loading dashboard…">Loading full workstream totals{selected ? ' and five-row list' : ''}.</ProjectState>
          : error ? <ProjectState error title="Unable to load dashboard">{error}<div className="mt-4"><Button variant="outline" onClick={reload}>Try again</Button></div></ProjectState>
            : selected ? <DashboardWorkList stream={selected} list={data.list} filter={view.filter} scope={view.scope} onFilter={(value) => change({ type: 'filter', value })} onPage={(value) => change({ type: 'page', value })} />
              : <p className="mt-6 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Choose BP, CP, KP or Takeoffs to see five work items at a time.</p>}
      </div>
    </section>
  )
}
