import { useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import ProjectState from '@/components/projects/ProjectState'
import CompanyDateStatus from '@/components/projects/CompanyDateStatus'
import MyWorkFilters from '@/components/my-work/MyWorkFilters'
import MyWorkList from '@/components/my-work/MyWorkList'
import { useMyWorkData } from '@/features/my-work/useMyWorkData'
import { myWorkParamsAfter, myWorkQueryFromParams } from '@/features/my-work/myWorkQuery'
import { useAuth } from '@/features/auth/useAuth'

const metrics = [['pending', 'Pending'], ['due_today', 'Due today (CT)'], ['overdue', 'Overdue (CT)'], ['awaiting_client', 'Awaiting client']]

export default function MyWorkPage() {
  const { profile } = useAuth()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const query = myWorkQueryFromParams(params)
  const { data, loading, error, refreshError, reload, refresh } = useMyWorkData(query)
  const returnedPage = data?.page
  function change(key, value) { setParams((current) => myWorkParamsAfter(current, key, value), { replace: true }) }
  useEffect(() => {
    if (returnedPage && returnedPage !== query.page) setParams((current) => myWorkParamsAfter(current, 'page', returnedPage), { replace: true })
  }, [returnedPage, query.page, setParams])

  return (
    <section aria-labelledby="my-work-title">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-xs font-semibold tracking-wider text-primary uppercase">Barndos workspace</p><h1 id="my-work-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">My Work</h1><p className="mt-2 text-sm text-muted-foreground">Assignments for {profile.display_name}, across all five workstreams.</p></div><Button variant="outline" onClick={reload}>Reload assignments</Button></div>
      <CompanyDateStatus companyToday={data?.company_today} />
      {refreshError && <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"><p>Assignments could not be refreshed. Counts and deadlines still reflect the last verified response. {refreshError}</p><Button variant="outline" onClick={refresh}>Retry refresh</Button></div>}
      <h2 className="mt-6 text-sm font-medium">Your unfinished work</h2><p className="mt-1 text-xs text-muted-foreground">All active projects, before list filters. Client review is excluded from drafting due-today and overdue counts.</p>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Your unfinished work overview" aria-busy={loading}>{metrics.map(([key, label]) => <div key={key} className="rounded-xl border bg-card p-4"><dt className="text-xs text-muted-foreground">{label}</dt><dd data-my-work-count={key} className="mt-2 text-2xl font-semibold tabular-nums">{data?.summary[key] ?? '—'}</dd></div>)}</dl>
      <MyWorkFilters query={query} onChange={change} onClear={() => setParams({}, { replace: true })} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Nearest deadline first; undated assignments appear last. Open a project to edit or add worknotes.</p><div className="flex items-center gap-2"><label htmlFor="my-work-page-size" className="text-sm">Per page</label><select id="my-work-page-size" value={query.pageSize} onChange={(event) => change('size', event.target.value)} className="h-9 rounded-md border bg-card px-3 text-sm">{[10, 20, 50].map((size) => <option key={size}>{size}</option>)}</select></div></div>
      {loading ? <ProjectState loading title="Loading your assignments…">Searching your full assignment list.</ProjectState>
        : error ? <ProjectState error title="Unable to load My Work">{error}<div className="mt-4"><Button variant="outline" onClick={reload}>Try again</Button></div></ProjectState>
          : <>
            <p role="status" className="mt-6 mb-3 text-sm text-muted-foreground">{data.total ? `${(data.page - 1) * data.page_size + 1}–${Math.min(data.page * data.page_size, data.total)} of ${data.total} matching assignments` : '0 matching assignments'}</p>
            {data.items.length ? <MyWorkList items={data.items} returnPath={location.pathname + location.search} /> : <ProjectState title="No matching assignments">Try another search or filter. This page shows work assigned to you on active projects. Use Projects to find team or unassigned work.</ProjectState>}
            <nav aria-label="My Work pages" className="mt-4 flex flex-wrap items-center justify-between gap-3"><Button variant="outline" disabled={data.page <= 1} onClick={() => change('page', data.page - 1)}>Previous page</Button><span className="text-sm text-muted-foreground">Page {data.page} of {data.page_count}</span><Button variant="outline" disabled={data.page >= data.page_count} onClick={() => change('page', data.page + 1)}>Next page</Button></nav>
          </>}
    </section>
  )
}
