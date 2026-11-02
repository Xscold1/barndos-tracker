import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { STATUSES, WORKSTREAMS, WORKFLOW_FILTERS } from '@/features/projects/projectModel'
import { useEmployees } from '@/features/work-items/useEmployees'

const control = 'mt-1.5 h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring'
export default function ProjectFilters({ query, onChange, onClear }) {
  const activeAdvanced = Boolean(query.workstream || query.assignee || query.unassigned || query.priority || query.dueFrom || query.dueTo || query.needsBpReview)
  const [expanded, setExpanded] = useState(activeAdvanced)
  const employees = useEmployees({ includeInactive: true })
  const select = (id, label, value, key, options) => <div><label htmlFor={id} className="text-sm font-medium">{label}</label><select id={id} className={control} value={value} onChange={(event) => onChange(key, event.target.value)}><option value="">All {label.toLowerCase()}</option>{options.map(({ value: optionValue, label: optionLabel }) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></div>
  return <div className="mt-6 space-y-4">
    <div className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_12rem_13rem_auto]">
      <div><label htmlFor="project-search" className="text-sm font-medium">Search projects</label><input id="project-search" type="search" maxLength={120} className={control} value={query.search} onChange={(event) => onChange('q', event.target.value)} placeholder="Client name or project number" /></div>
      {select('status-filter', 'Workstream status', query.status, 'status', STATUSES.map((value) => ({ value, label: value })))}
      {select('workflow-filter', 'Project workflow', query.workflow, 'workflow', WORKFLOW_FILTERS)}
      <Button variant="outline" onClick={onClear}>Clear filters</Button>
    </div>
    <details open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)} className="rounded-lg border bg-card p-4">
      <summary className="cursor-pointer text-sm font-medium">Advanced filters{activeAdvanced ? ' · Active' : ''}</summary>
      <p className="mt-3 text-xs text-muted-foreground">Workstream, status, employee, priority, date and BP-review filters must match the same work item. Workflow describes the whole project.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {select('workstream-filter', 'Workstream', query.workstream, 'stream', WORKSTREAMS.map(({ type, label }) => ({ value: type, label })))}
        <div><label htmlFor="assignee-filter" className="text-sm font-medium">Assigned employee</label><select id="assignee-filter" className={control} value={query.assignee} disabled={employees.loading || Boolean(employees.error)} onChange={(event) => onChange('assignee', event.target.value)}><option value="">All employees</option>{query.assignee && !employees.data.some(({ id }) => id === query.assignee) && <option value={query.assignee}>Selected employee</option>}{employees.data.map((employee) => <option key={employee.id} value={employee.id}>{employee.display_name}{!employee.is_active && ' (inactive)'}</option>)}</select>{employees.error && <div role="alert" className="mt-2 text-xs">{employees.error}<Button variant="outline" className="mt-2" onClick={employees.reload}>Retry employees</Button></div>}</div>
        {select('priority-filter', 'Priority', query.priority, 'priority', ['High','Medium','Low'].map((value) => ({ value, label: value })))}
        <div><label htmlFor="due-from-filter" className="text-sm font-medium">Deadline from (Tennessee CT)</label><input id="due-from-filter" type="date" min="0001-01-01" max="9999-12-31" className={control} value={query.dueFrom} onChange={(event) => onChange('from', event.target.value)} /></div>
        <div><label htmlFor="due-to-filter" className="text-sm font-medium">Deadline through (Tennessee CT)</label><input id="due-to-filter" type="date" min="0001-01-01" max="9999-12-31" className={control} value={query.dueTo} onChange={(event) => onChange('to', event.target.value)} /></div>
        <div className="flex flex-col justify-center gap-3 text-sm"><label className="flex items-center gap-2"><input id="unassigned-filter" type="checkbox" checked={query.unassigned} onChange={(event) => onChange('unassigned', event.target.checked ? '1' : '')} />Unassigned work</label><label className="flex items-center gap-2"><input id="bp-review-filter" type="checkbox" checked={query.needsBpReview} onChange={(event) => onChange('bp_review', event.target.checked ? '1' : '')} />Needs BP review (Kitchen/Takeoffs)</label></div>
      </div>
    </details>
  </div>
}
