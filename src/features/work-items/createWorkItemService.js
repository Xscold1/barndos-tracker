import { STATUSES, WORKSTREAMS } from '../projects/projectModel.js'
import { isCalendarDate } from '../deadlines/deadlineModel.js'
import { transitionNeedsReason } from './workflowModel.js'

export function workItemFields(item, values) {
  const fields = {
    status: values.status, assignee_id: values.assignee_id || null, required: values.required,
    priority_level: values.priority_level, revision: (values.revision ?? '').trim() || null,
    notes: values.notes ?? '', clear_schedule: values.clear_schedule === true,
    due_date: values.due_date === undefined ? item.due_date ?? null : values.due_date || null,
    queue_position: values.queue_position === undefined ? item.queue_position ?? null : values.queue_position === '' || values.queue_position === null ? null : Number(values.queue_position),
    change_note: (values.change_note ?? '').trim() || null,
  }
  if (!STATUSES.includes(fields.status)) throw new Error('Choose a valid workstream status.')
  if (!['High','Medium','Low'].includes(fields.priority_level)) throw new Error('Choose High, Medium, or Low priority.')
  if (![true, false, null].includes(fields.required) || (fields.required === null && item.workstream_type !== 'quotation')) throw new Error('Choose whether this workstream is required.')
  if (fields.status === 'Not Needed' && fields.required !== false) throw new Error('A Not Needed workstream cannot be required.')
  if ((fields.revision?.length ?? 0) > 40 || fields.notes.length > 2000 || (fields.change_note?.length ?? 0) > 2000) throw new Error('Use up to 40 characters for revision and 2,000 for notes.')
  if (transitionNeedsReason(item.workstream_type, item.status, fields.status) && !fields.change_note) throw new Error('Add a reason for reopening this workstream or returning it to drafting.')
  if (fields.due_date && !isCalendarDate(fields.due_date)) throw new Error('Choose a valid Tennessee calendar date (YYYY-MM-DD).')
  if (fields.queue_position !== null && (!Number.isInteger(fields.queue_position) || fields.queue_position < 1 || fields.queue_position > 2147483647)) throw new Error('Queue position must be a whole number from 1 to 2,147,483,647, or blank.')
  if (!fields.assignee_id) {
    const wasScheduled = Boolean(item.due_date || item.queue_position)
    if (wasScheduled && !fields.clear_schedule) throw new Error('Confirm clearing the existing deadline and queue position before unassigning.')
    if (fields.due_date && !(wasScheduled && fields.clear_schedule)) throw new Error('Assign an employee before setting a deadline.')
    fields.due_date = null
    if (fields.queue_position && !(wasScheduled && fields.clear_schedule)) throw new Error('Assign an employee and deadline before setting a queue position.')
    fields.queue_position = null
  } else if (!fields.due_date && item.queue_position && !fields.clear_schedule) {
    throw new Error('Confirm clearing the queue position when removing this deadline.')
  }
  if (!fields.due_date && item.queue_position && fields.clear_schedule) fields.queue_position = null
  if (fields.queue_position && !fields.due_date) throw new Error('Set a Tennessee deadline before setting a queue position.')
  return fields
}

export function workItemError(error, writing = false) {
  if (error?.code === 'P0001') {
    try {
      const warning = JSON.parse(error.details)
      if (warning.kind === 'workload_warning' && /^[a-f0-9]{32}$/.test(warning.token) && isCalendarDate(warning.due_date)
        && Array.isArray(warning.items) && warning.items.length && warning.items.every((item) => item.id && item.project_no && item.client_name && item.workstream_type && item.assignee_name)) {
        return Object.assign(new Error('Review the other same-day assignments before confirming this schedule.'), { code: 'WORKLOAD_WARNING', workload: warning })
      }
    } catch { /* Malformed warnings cannot become an acknowledgement. */ }
  }
  let message
  if (error?.code === '23505') {
    try {
      const detail = JSON.parse(error.details ?? '{}')
      if (detail.project_no && detail.client_name && detail.workstream_type && detail.due_date && detail.assignee_name && detail.queue_position) {
        const label = WORKSTREAMS.find(({ type }) => type === detail.workstream_type)?.label ?? detail.workstream_type
        message = `Queue conflict: ${detail.project_no} · ${detail.client_name} · ${label} · ${detail.assignee_name} · ${detail.due_date} (Tennessee CT) · position ${detail.queue_position}. Coordinate another slot before retrying.`
      }
    } catch { /* Show a safe fallback when conflict details are unavailable. */ }
    message ??= 'This assignment/status conflicts with an existing queue position. Reload and coordinate another slot before retrying.'
  } else {
    message = {
      '40001': 'This workstream changed since you opened it. Cancel and reload the project before saving again.',
      '42501': 'Your employee access could not be confirmed. Sign in again or contact your project manager.',
      '23503': 'That employee or workstream is no longer available. Reload the project and employee list.',
      '23514': 'Check the workstream status, scope, priority, deadline and queue position.',
      '23502': 'Complete the required workstream fields.',
      '22023': 'Check the employee, deadline, queue position, reopening reason, and confirmation to clear the schedule.',
      '22007': 'Enter a valid Tennessee calendar date.',
      '22008': 'Enter a valid Tennessee calendar date.',
      P0002: 'Workstream not found. Cancel and reload the project.',
      PGRST202: 'The workstream service needs a database update. Contact the workspace owner.',
      PGRST301: 'Your session has expired. Sign in again.',
    }[error?.code]
  }
  const result = new Error(message ?? (writing
    ? 'The save could not be confirmed. Check your connection and reload the project before retrying.'
    : 'Employees could not be loaded. Check your connection and try again.'))
  result.code = error?.code ?? 'NETWORK'
  return result
}

export function createWorkItemService(client) {
  async function mutate(name, args) {
    try {
      if (!client) throw new Error('Not configured')
      const { data, error } = await client.rpc(name, args).single()
      if (error) throw error
      if (!data?.id) throw new Error('Missing response')
      return data
    } catch (error) { throw workItemError(error, true) }
  }
  return {
    async listEmployees({ signal, includeInactive = false } = {}) {
      const employees = []
      let lastId = null
      try {
        if (!client) throw new Error('Not configured')
        while (true) {
          let query = client.from('profiles').select('id,display_name,is_active').order('id').limit(200)
          if (!includeInactive) query = query.eq('is_active', true)
          if (lastId) query = query.gt('id', lastId)
          if (signal) query = query.abortSignal(signal)
          const { data, error } = await query
          if (error) throw error
          if (!data.length) break
          employees.push(...data)
          lastId = data.at(-1).id
        }
        return employees.sort((a, b) => a.display_name.localeCompare(b.display_name) || a.id.localeCompare(b.id))
      } catch (error) { throw workItemError(error) }
    },
    updateWorkItem(item, values) {
      if (!Number.isSafeInteger(item.row_version) || item.row_version < 1) throw new Error('Reload this project before editing the workstream.')
      const fields = workItemFields(item, values)
      return mutate('schedule_work_item', {
        p_work_item_id: item.id, p_expected_row_version: item.row_version, p_status: fields.status,
        p_assignee_id: fields.assignee_id, p_required: fields.required, p_priority_level: fields.priority_level,
        p_revision: fields.revision, p_notes: fields.notes, p_due_date: fields.due_date, p_queue_position: fields.queue_position,
        p_clear_schedule: fields.clear_schedule, p_change_note: fields.change_note,
        p_workload_acknowledged: values.workload_acknowledged === true,
        p_workload_token: values.workload_acknowledged === true ? values.workload_token ?? null : null,
      })
    },
    addWorknote(itemId, text) {
      const note = text.trim()
      if (!note || note.length > 2000) throw new Error('Enter a worknote of 1–2,000 characters.')
      return mutate('add_work_item_note', { p_work_item_id: itemId, p_worknote: note })
    },
  }
}
