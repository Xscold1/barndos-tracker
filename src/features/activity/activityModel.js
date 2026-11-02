import { formatDeadline, formatUpdatedAt, WORKSTREAMS } from '../projects/projectModel.js'

const labels = {
  project_created: 'Project created', project_updated: 'Project updated',
  project_archived: 'Project archived', project_unarchived: 'Project restored',
  work_item_created: 'Workstream created', work_item_updated: 'Workstream updated',
  revision_issued: 'Revision issued', revision_reviewed: 'Revision reviewed', worknote: 'Worknote',
}
const fields = {
  project_no: 'Project number', client_name: 'Client', notes: 'Remarks',
  status: 'Status', assignee_id: 'Assignee', required: 'Required scope', priority_level: 'Priority',
  due_date: 'Deadline (Tennessee CT)', queue_position: 'Queue position', revision: 'Own revision',
  archived_at: 'Archived at (CT)', archived_by: 'Archived by',
  bp_reference_revision_id: 'BP reference revision', bp_reviewed_revision_id: 'BP reviewed revision',
  bp_review_state: 'BP review state', initial_not_needed_workstreams: 'Initially not needed',
  issued_revision_label: 'Issued revision', bp_issue_label: 'BP issued for review',
  bp_revision_checked: 'BP revision checked', reviewer: 'Reviewer', reviewed_at: 'Reviewed at (CT)', review_scope: 'Review scope',
}
export function activityTitle(event) { return labels[event.operation] ?? 'Activity recorded' }
export function activityScope(event) { return event.workstream_type ? WORKSTREAMS.find(({ type }) => type === event.workstream_type)?.label ?? 'Workstream' : 'Project' }

function valueLabel(field, value, event) {
  if (field === 'assignee_id' && !value) return 'Unassigned'
  if (field === 'required') return value === null ? 'To confirm' : value ? 'Required' : 'Not required'
  if (field === 'due_date') return formatDeadline(value)
  if (value === null || value === undefined || value === '') return 'Not set'
  if (field === 'assignee_id' || field === 'archived_by') return event.employee_names?.[value] ?? `Employee (${String(value).slice(-6)})`
  if (field === 'archived_at' || field === 'reviewed_at') return formatUpdatedAt(value)
  if (field === 'bp_reference_revision_id' || field === 'bp_reviewed_revision_id') return event.revision_labels?.[value] ?? 'Recorded BP revision'
  if (Array.isArray(value)) return value.map((type) => WORKSTREAMS.find((stream) => stream.type === type)?.label ?? type).join(', ') || 'None'
  return String(value)
}

// Render only recognized business fields. Do not dump raw event JSON, internal
// IDs, or the scheduling acknowledgement hash into the employee interface.
export function activityChanges(event) {
  return Object.entries(event.changes ?? {}).flatMap(([field, change]) => {
    if (field === 'workload_acknowledgement') return [{ field, label: 'Workload', summary: `Same-day workload acknowledged (${change.new?.items?.length ?? 0} other assignments).` }]
    if (!fields[field] || !change || typeof change !== 'object') return []
    return [{ field, label: fields[field], before: valueLabel(field, change.old, event), after: valueLabel(field, change.new, event), long: field === 'notes' }]
  })
}
