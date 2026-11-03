import { ArrowLeft } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import ProjectState from '@/components/projects/ProjectState'
import WorkstreamPanel from '@/components/projects/WorkstreamPanel'
import { formatUpdatedAt, WORKSTREAMS } from '@/features/projects/projectModel'
import { useProjectData } from '@/features/projects/useProjectData'
import { useState } from 'react'
import ProjectFormDialog from '@/components/projects/ProjectFormDialog'
import ArchiveProjectDialog from '@/components/projects/ArchiveProjectDialog'
import ProjectFeedback from '@/components/projects/ProjectFeedback'
import CompanyDateStatus from '@/components/projects/CompanyDateStatus'
import ActivityTimeline from '@/components/projects/ActivityTimeline'
import ProjectWorkflowSummary from '@/components/projects/ProjectWorkflowSummary'
import { useRevisionData } from '@/features/revisions/useRevisionData'
import { myWorkReturnPath } from '@/features/my-work/myWorkQuery'
import { useAuth } from '@/features/auth/useAuth'
import { hasAdminRole } from '@/features/auth/dashboardPreference'

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const { search, state } = useLocation()
  const { roles } = useAuth()
  const myWorkReturn = hasAdminRole(roles) ? null : myWorkReturnPath(state?.myWorkReturn)
  const { data: project, loading, error, reload, companyToday, clockError, refreshCompanyDate } = useProjectData(projectId)
  const [dialog, setDialog] = useState(null)
  const [notice, setNotice] = useState(null)
  const [activityRevision, setActivityRevision] = useState(0)
  const revisions = useRevisionData(projectId)

  function saved(result) {
    const message = dialog === 'edit' ? 'Project updated.' : result.archived_at ? 'Project archived.' : 'Project restored.'
    setDialog(null)
    setNotice({ message })
    reload()
  }

  return (
    <section aria-label="Project detail">
      <Button asChild variant="ghost" className="mb-5 -ml-3">
        <Link to={myWorkReturn ?? `/projects${search}`}><ArrowLeft className="size-4" aria-hidden="true" />{myWorkReturn ? 'Back to My Work' : 'Back to Projects'}</Link>
      </Button>
      <ProjectFeedback notice={notice} onDismiss={() => setNotice(null)} />
      <CompanyDateStatus companyToday={companyToday} error={clockError} onRetry={refreshCompanyDate} />
      {loading ? <ProjectState loading title="Loading project…">Preparing the project’s workstreams.</ProjectState>
        : error ? <ProjectState error title="Unable to load project">{error}<div className="mt-4"><Button variant="outline" onClick={reload}>Try again</Button></div></ProjectState>
          : !project ? <ProjectState title="Project not found">This project is unavailable. Use the back link to choose another.</ProjectState>
            : (
              <>
                <div className="mt-4 mb-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold tracking-wider text-primary uppercase">{project.project_no}{project.archived_at && <span className="ml-3 rounded-full bg-muted px-2 py-1 text-muted-foreground">Archived</span>}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => { reload(); revisions.reload() }}>Reload project</Button>
                    <Button variant="outline" onClick={() => setDialog('edit')}>Edit project</Button>
                    <Button variant="outline" onClick={() => setDialog('archive')}>{project.archived_at ? 'Restore project' : 'Archive project'}</Button>
                  </div>
                </div>
                <h1 id="project-detail-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{project.client_name}</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{project.notes}</p>
                <ProjectWorkflowSummary workflow={project.workflow} />
                <p className="mt-2 text-xs text-muted-foreground">Updated {formatUpdatedAt(project.updated_at)}</p>
                {project.archived_at && <p className="mt-3 text-sm text-muted-foreground">Archived {formatUpdatedAt(project.archived_at)}. Workstreams and history are retained.</p>}

                <h2 className="mt-8 mb-4 text-lg font-semibold">Workstreams</h2>
                {revisions.loading && <p role="status" className="mb-4 text-sm text-muted-foreground">Loading revision history…</p>}
                {revisions.error && <div role="alert" className="mb-4 rounded-md border p-3 text-sm">{revisions.error}<Button variant="outline" className="mt-2 block" onClick={revisions.reload}>Retry revision history</Button></div>}
                <div className="grid gap-4 lg:grid-cols-2">
                  {WORKSTREAMS.map((stream) => (
                    <WorkstreamPanel key={stream.type} stream={stream} item={project.work_items.find((item) => item.workstream_type === stream.type)} revisions={revisions} onRevisionSaved={() => { setNotice({ message: `${stream.label} revision record saved.` }); reload(); revisions.reload() }} onUpdated={(updatedStream) => { setNotice({ message: `${updatedStream.label} updated.` }); reload() }} onWorknoteAdded={(updatedStream) => { setNotice({ message: `Worknote added to ${updatedStream.label}.` }); setActivityRevision((value) => value + 1) }} />
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">Each workstream keeps its own progress and revision. Issue revision records an issued deliverable; working-label edits remain separate. Quotation’s completion requirement remains to be confirmed.</p>
                <ActivityTimeline key={project.id} projectId={project.id} revision={activityRevision} />
                {dialog === 'edit' && <ProjectFormDialog project={project} onSaved={saved} onClose={() => setDialog(null)} />}
                {dialog === 'archive' && <ArchiveProjectDialog project={project} onSaved={saved} onClose={() => setDialog(null)} />}
              </>
            )}
    </section>
  )
}
