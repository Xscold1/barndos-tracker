import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import StatusChip from '@/components/projects/StatusChip'
import DeadlineBadge from '@/components/work-items/DeadlineBadge'
import { formatDeadline } from '@/features/projects/projectModel'

const filters = [['pending', 'All pending'], ['due_today', 'Due today (CT)'], ['overdue', 'Overdue (CT)'], ['unassigned', 'Needs assignment']]

function ProjectLink({ item }) {
  return <Link to={`/projects/${item.project_id}`} className="block rounded-sm break-words focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"><span className="text-xs font-medium text-primary">{item.project_no}</span><span className="mt-1 block font-medium hover:underline">{item.client_name}</span></Link>
}
function Deadline({ item }) {
  return <><span className="block">{item.due_date ? <time dateTime={item.due_date}>{formatDeadline(item.due_date)}</time> : 'No deadline'}</span><DeadlineBadge state={item.deadline_state} /></>
}
const assignee = (item) => item.assignee_name ?? (item.assignee_id ? 'Employee unavailable' : 'Unassigned')

export default function DashboardWorkList({ stream, list, filter, scope, onFilter, onPage }) {
  return (
    <Card className="mt-6 shadow-none" role="region" aria-labelledby="dashboard-list-title">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 id="dashboard-list-title" className="text-lg font-semibold">{stream.label} work</h2><p className="mt-1 text-sm text-muted-foreground">{scope === 'mine' ? 'My Work' : 'All Team'} · Unfinished work, nearest deadline first.</p></div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto"><label htmlFor="dashboard-list-filter" className="text-sm">Show</label><select id="dashboard-list-filter" value={filter} onChange={(event) => onFilter(event.target.value)} className="h-9 min-w-0 rounded-md border bg-card px-3 text-sm">{filters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        </div>
        <p className="my-4 text-sm text-muted-foreground" role="status">{list.total ? `${(list.page - 1) * 5 + 1}–${Math.min(list.page * 5, list.total)} of ${list.total} matching work items` : '0 matching work items'}</p>
        {!list.total ? <div className="rounded-lg border border-dashed px-4 py-10 text-center"><h3 className="font-medium">No matching work</h3><p className="mt-2 text-sm text-muted-foreground">{scope === 'mine' && filter === 'unassigned' ? 'Unassigned work belongs to no employee. Switch to All Team to find work that needs assignment.' : scope === 'mine' ? 'No unfinished assignments match this view. Try All Team or another list filter.' : 'Try another workstream or list filter. Done, Not Needed and archived projects are excluded.'}</p></div>
          : <>
            <div className="hidden lg:block">
              <table className="w-full table-fixed text-left text-sm">
                <caption className="sr-only">{stream.label} unfinished work. Deadlines follow Tennessee time.</caption>
                <thead className="border-b text-xs text-muted-foreground"><tr><th scope="col" className="w-[32%] py-3 pr-3 font-medium">Project / client</th><th scope="col" className="w-[24%] px-3 py-3 font-medium">Deadline (Tennessee CT)</th><th scope="col" className="w-[21%] px-3 py-3 font-medium">Assigned to</th><th scope="col" className="py-3 pl-3 font-medium">Status</th></tr></thead>
                <tbody className="divide-y divide-border">{list.items.map((item) => <tr key={item.id} className="align-top hover:bg-muted/30"><th scope="row" className="py-4 pr-3 font-normal"><ProjectLink item={item} /></th><td className="px-3 py-4"><Deadline item={item} /></td><td className="px-3 py-4 break-words">{assignee(item)}</td><td className="py-4 pl-3"><StatusChip status={item.status} /></td></tr>)}</tbody>
              </table>
            </div>
            <ul className="space-y-3 lg:hidden" aria-label={`${stream.label} unfinished work`}>{list.items.map((item) => <li key={item.id} className="rounded-lg border p-3 text-sm"><ProjectLink item={item} /><dl className="mt-4 space-y-3"><div><dt className="mb-1 text-xs text-muted-foreground">Deadline (Tennessee CT)</dt><dd><Deadline item={item} /></dd></div><div><dt className="mb-1 text-xs text-muted-foreground">Assigned to</dt><dd className="break-words">{assignee(item)}</dd></div><div><dt className="mb-1 text-xs text-muted-foreground">Status</dt><dd><StatusChip status={item.status} /></dd></div></dl></li>)}</ul>
          </>}
        <nav aria-label={`${stream.label} work pages`} className="mt-5 flex flex-wrap items-center justify-between gap-3"><Button variant="outline" disabled={list.page <= 1} onClick={() => onPage(list.page - 1)}>Previous page</Button><span className="text-sm text-muted-foreground">Page {list.page} of {list.page_count}</span><Button variant="outline" disabled={list.page >= list.page_count} onClick={() => onPage(list.page + 1)}>Next page</Button></nav>
      </CardContent>
    </Card>
  )
}
