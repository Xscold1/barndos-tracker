import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import ProjectFormDialog from '@/components/projects/ProjectFormDialog'
import ProjectFeedback from '@/components/projects/ProjectFeedback'
import CompanyDateStatus from '@/components/projects/CompanyDateStatus'
import ProjectsTable from '@/components/projects/ProjectsTable'
import ProjectFilters from '@/components/projects/ProjectFilters'
import ProjectState from '@/components/projects/ProjectState'
import { projectQueryFromParams } from '@/features/projects/projectQuery'
import { useProjectData } from '@/features/projects/useProjectData'

export default function ProjectsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [notice, setNotice] = useState(null)
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const query = projectQueryFromParams(params)
  const { data, pagination, loading, error, reload, companyToday, clockError, refreshCompanyDate } = useProjectData(null, { query })
  const returnedPage = !loading && !error ? pagination?.page : null
  useEffect(() => {
    if (returnedPage && returnedPage !== query.page) setParams((current) => {
      const next = new URLSearchParams(current)
      if (returnedPage === 1) next.delete('page'); else next.set('page', returnedPage)
      return next
    }, { replace: true })
  }, [returnedPage, query.page, setParams])
  function updateFilter(key, value) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value); else next.delete(key)
      if (key !== 'page') next.delete('page')
      if (key === 'assignee' && value) next.delete('unassigned')
      if (key === 'unassigned' && value) next.delete('assignee')
      return next
    }, { replace: true })
  }
  function clearFilters() { setParams(query.archive === 'active' ? {} : { view: query.archive }, { replace: true }) }
  function created(project) { setShowCreate(false); setParams({}, { replace: true }); setNotice({ message: 'Project ' + project.project_no + ' created.', projectId: project.id }); reload() }
  return (
    <section aria-labelledby="projects-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold tracking-wider text-primary uppercase">Barndos workspace</p><h1 id="projects-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Projects</h1><p className="mt-2 text-sm text-muted-foreground">Search the full project list and independent workstreams.</p></div>
        <Button onClick={() => setShowCreate(true)}><Plus className="size-4" aria-hidden="true" />New project</Button>
      </div>
      <ProjectFeedback notice={notice} onDismiss={() => setNotice(null)} />
      <CompanyDateStatus companyToday={companyToday} error={clockError} onRetry={refreshCompanyDate} />
      <ProjectFilters query={query} onChange={updateFilter} onClear={clearFilters} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><label htmlFor="archive-filter" className="text-sm">Show</label><select id="archive-filter" value={query.archive} onChange={(event) => updateFilter('view', event.target.value)} className="h-9 rounded-md border bg-card px-3 text-sm"><option value="active">Active projects</option><option value="archived">Archived projects</option><option value="all">All projects</option></select></div>
        <div className="flex items-center gap-2"><label htmlFor="page-size" className="text-sm">Per page</label><select id="page-size" value={query.pageSize} onChange={(event) => updateFilter('size', event.target.value)} className="h-9 rounded-md border bg-card px-3 text-sm">{[10,20,50].map((size) => <option key={size}>{size}</option>)}</select><Button variant="outline" onClick={reload}>Reload</Button></div>
      </div>
      {loading ? <ProjectState loading title="Loading projects…">Searching all matching records.</ProjectState>
        : error ? <ProjectState error title="Unable to load projects">{error}<div className="mt-4"><Button variant="outline" onClick={reload}>Try again</Button></div></ProjectState>
          : <>
            <p className="mt-6 mb-3 text-sm text-muted-foreground" role="status">{pagination.total ? ((pagination.page - 1) * pagination.page_size + 1) + '–' + Math.min(pagination.page * pagination.page_size, pagination.total) + ' of ' + pagination.total + ' matching projects' : '0 matching projects'}</p>
            {data.length ? <ProjectsTable projects={data} search={location.search} /> : <ProjectState title="No matching projects">Try another search/filter combination or create a project. Archived projects are available through Show.</ProjectState>}
            <nav aria-label="Project pages" className="mt-4 flex flex-wrap items-center justify-between gap-3"><Button variant="outline" disabled={pagination.page <= 1} onClick={() => updateFilter('page', String(pagination.page - 1))}>Previous page</Button><span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.page_count}</span><Button variant="outline" disabled={pagination.page >= pagination.page_count} onClick={() => updateFilter('page', String(pagination.page + 1))}>Next page</Button></nav>
          </>}
      {showCreate && <ProjectFormDialog onSaved={created} onClose={() => setShowCreate(false)} />}
    </section>
  )
}
