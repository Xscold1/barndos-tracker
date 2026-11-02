import { Button } from '@/components/ui/button'
import { STATUSES, WORKSTREAMS } from '@/features/projects/projectModel'
import { PRIORITIES } from '@/features/my-work/myWorkQuery'

export default function MyWorkFilters({ query, onChange, onClear }) {
  const selectClass = 'mt-1 h-9 w-full min-w-0 rounded-md border bg-card px-2 text-sm'
  return (
    <div className="mt-6 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-60"><label htmlFor="my-work-search" className="text-sm font-medium">Search your assignments</label><input id="my-work-search" type="search" value={query.search} maxLength={120} onChange={(event) => onChange('q', event.target.value)} placeholder="Client or project number" className="mt-1 h-9 w-full rounded-md border px-3 text-sm" /></div>
        <Button variant="ghost" onClick={onClear}>Clear filters</Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0"><label htmlFor="my-work-stream" className="text-xs font-medium">Workstream</label><select id="my-work-stream" value={query.workstream} onChange={(event) => onChange('stream', event.target.value)} className={selectClass}><option value="">All workstreams</option>{WORKSTREAMS.map((stream) => <option key={stream.type} value={stream.type}>{stream.label}</option>)}</select></div>
        <div className="min-w-0"><label htmlFor="my-work-status" className="text-xs font-medium">Status</label><select id="my-work-status" value={query.status} onChange={(event) => onChange('status', event.target.value)} className={selectClass}><option value="pending">All unfinished</option><option value="all">All statuses</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div>
        <div className="min-w-0"><label htmlFor="my-work-priority" className="text-xs font-medium">Priority</label><select id="my-work-priority" value={query.priority} onChange={(event) => onChange('priority', event.target.value)} className={selectClass}><option value="">All priorities</option>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></div>
        <div className="min-w-0"><label htmlFor="my-work-deadline" className="text-xs font-medium">Deadline (Tennessee CT)</label><select id="my-work-deadline" value={query.deadline} onChange={(event) => onChange('deadline', event.target.value)} className={selectClass}><option value="all">Any deadline</option><option value="due_today">Due today</option><option value="overdue">Overdue</option><option value="upcoming">Upcoming</option><option value="undated">No deadline</option></select></div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Due today, Overdue and Upcoming include active drafting work only. Work awaiting client review remains unfinished. Archived projects are available in Projects.</p>
    </div>
  )
}
