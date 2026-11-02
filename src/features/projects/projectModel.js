import { ACTIVE_DRAFTING_STATUSES } from '../deadlines/deadlineModel.js'

export const WORKSTREAMS = [
  { type: 'quotation', label: 'Quotation', shortLabel: 'Quote' },
  { type: 'cp', label: 'Concept Plan', shortLabel: 'CP' },
  { type: 'bp', label: 'Blueprint', shortLabel: 'BP' },
  { type: 'kitchen', label: 'Kitchen Plan', shortLabel: 'KP' },
  { type: 'takeoffs', label: 'Takeoffs', shortLabel: 'TO' },
]

export const STATUSES = [
  'Waiting', 'In Progress', 'For Review', 'For Client Review',
  'Revision Requested', 'Done', 'Not Needed',
]

export const WORKFLOW_FILTERS = [
  { value: 'awaiting_client', label: 'Awaiting client response' },
  { value: 'required_open', label: 'Required work open' },
  { value: 'all_required_done', label: 'All required work done' },
  { value: 'scope_unconfirmed', label: 'Scope unconfirmed' },
]

export function deriveProjectWorkflow(workItems = []) {
  const required = workItems.filter((item) => item.required === true && item.status !== 'Not Needed')
  const done = required.filter((item) => item.status === 'Done').length
  const unknown = workItems.filter((item) => item.required !== true && item.required !== false && item.status !== 'Not Needed').length
  const completeSet = workItems.length === WORKSTREAMS.length && WORKSTREAMS.every(({ type }) => workItems.filter((item) => item.workstream_type === type).length === 1)
  return {
    required_count: required.length, required_done_count: done, required_open_count: required.length - done,
    scope_unknown_count: unknown, workstreams_complete: completeSet,
    all_required_done: completeSet && unknown === 0 && required.length > 0 && done === required.length,
    awaiting_client_count: workItems.filter((item) => item.status === 'For Client Review').length,
  }
}

export function filterProjects(projects, { search = '', status = '', workflow = '' } = {}) {
  const query = search.trim().toLowerCase()
  return projects.filter((project) => {
    const state = deriveProjectWorkflow(project.work_items)
    const matchesWorkflow = !workflow || ({
      awaiting_client: state.awaiting_client_count > 0,
      required_open: state.required_open_count > 0,
      all_required_done: state.all_required_done,
      scope_unconfirmed: state.scope_unknown_count > 0 || !state.workstreams_complete,
    })[workflow]
    return (
    (!query || project.client_name.toLowerCase().includes(query) || project.project_no.toLowerCase().includes(query))
    && (!status || project.work_items.some((item) => item.status === status))
    && matchesWorkflow
    )
  })
}

export function nearestDraftingDeadline(workItems) {
  return nearestDraftingWorkItem(workItems)?.due_date ?? null
}

export function nearestDraftingWorkItem(workItems) {
  return workItems
    .filter((item) => (item.assignee_id || item.assignee?.id) && item.due_date && ACTIVE_DRAFTING_STATUSES.includes(item.status))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null
}

// Format a calendar DATE without converting it to an instant or a browser-local date.
export function formatDeadline(value) {
  if (!value) return 'No deadline'
  const [year, month, day] = value.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[Number(month) - 1]} ${Number(day)}, ${year}`
}

export function formatUpdatedAt(value) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(value))
}

