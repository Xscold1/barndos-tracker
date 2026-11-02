import { Link } from 'react-router'
import { formatDeadline, formatUpdatedAt, nearestDraftingWorkItem, WORKSTREAMS } from '@/features/projects/projectModel'
import StatusChip from './StatusChip'
import DeadlineBadge from '@/components/work-items/DeadlineBadge'
import ProjectWorkflowSummary from './ProjectWorkflowSummary'

const tableStreams = WORKSTREAMS.filter(({ type }) => type !== 'quotation')

export default function ProjectsTable({ projects, search }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card focus-visible:outline-2 focus-visible:outline-ring" role="region" aria-label="Projects table, scroll horizontally for all columns" tabIndex={0}>
      <table className="w-full min-w-[58rem] text-left text-sm">
        <caption className="sr-only">Projects and independent drafting workstream statuses</caption>
        <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Project / client</th>
            {tableStreams.map(({ type, label, shortLabel }) => (
              <th key={type} scope="col" className="px-3 py-3 font-medium"><abbr title={label} className="cursor-help no-underline">{shortLabel}</abbr></th>
            ))}
            <th scope="col" className="px-3 py-3 font-medium">Next active deadline (CT)</th>
            <th scope="col" className="px-4 py-3 font-medium">Updated (CT)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((project) => {
            const nearest = nearestDraftingWorkItem(project.work_items)
            return (
            <tr key={project.id} className="hover:bg-muted/30">
              <th scope="row" className="px-4 py-4 font-normal">
                <Link to={`/projects/${project.id}${search}`} className="block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
                  <span className="text-xs font-medium text-primary">{project.project_no}</span>
                  {project.archived_at && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Archived</span>}
                  <span className="mt-1 block font-medium hover:underline">{project.client_name}</span>
                </Link>
                <ProjectWorkflowSummary compact workflow={project.workflow} />
              </th>
              {tableStreams.map(({ type }) => (
                <td key={type} className="px-3 py-4">
                  {project.work_items.find((item) => item.workstream_type === type)
                    ? <StatusChip status={project.work_items.find((item) => item.workstream_type === type).status} />
                    : <span className="text-xs text-muted-foreground">Not initialized</span>}
                </td>
              ))}
              <td className="px-3 py-4 whitespace-nowrap"><span className="block">{formatDeadline(nearest?.due_date)}</span><DeadlineBadge state={nearest?.deadline_state} /></td>
              <td className="px-4 py-4 text-xs whitespace-nowrap text-muted-foreground">{formatUpdatedAt(project.updated_at)}</td>
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  )
}
