import { isCalendarDate } from '../deadlines/deadlineModel.js'
import { STATUSES, WORKSTREAMS } from '../projects/projectModel.js'
import { myWorkArgs, PRIORITIES } from './myWorkQuery.js'

const isCount = (value) => Number.isSafeInteger(value) && value >= 0
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const states = ['due_today', 'overdue', 'upcoming', 'not_scheduled', 'awaiting_client', 'inactive']

function validResponse(data, args) {
  if (!isCalendarDate(data?.company_today) || !uuid.test(data.employee_id) || !isCount(data.total) || data.page_size !== args.p_page_size) return false
  if (!['pending', 'due_today', 'overdue', 'awaiting_client'].every((key) => isCount(data.summary?.[key]) && data.summary[key] <= data.summary.pending)) return false
  if (data.summary.due_today + data.summary.overdue + data.summary.awaiting_client > data.summary.pending) return false
  const pages = Math.max(1, Math.ceil(data.total / data.page_size))
  return data.page_count === pages && data.page === Math.min(args.p_page, pages)
    && Array.isArray(data.items) && data.items.length === Math.min(data.page_size, Math.max(0, data.total - (data.page - 1) * data.page_size))
    && data.items.every((item) => item.id && item.project_id && typeof item.project_no === 'string' && typeof item.client_name === 'string'
      && item.assignee_id === data.employee_id && WORKSTREAMS.some(({ type }) => type === item.workstream_type)
      && STATUSES.includes(item.status) && PRIORITIES.includes(item.priority_level) && states.includes(item.deadline_state)
      && (item.due_date === null || isCalendarDate(item.due_date)))
}

function myWorkError(error) {
  const messages = {
    '42501': 'Your employee access could not be confirmed. Sign in again or contact your project manager.',
    PGRST301: 'Your session has expired. Sign in again.',
    PGRST202: 'My Work needs a database update. Contact the workspace owner.',
    '22023': 'Check the My Work filters and page, then retry.',
  }
  const result = new Error(messages[error?.code] ?? 'Your assignments could not be loaded. Check your connection and retry.')
  result.code = error?.code ?? 'NETWORK'
  return result
}

export function createMyWorkService(client) {
  return {
    async listMyWork({ signal, ...query } = {}) {
      const args = myWorkArgs(query)
      try {
        if (!client) throw new Error('My Work client unavailable')
        let request = client.rpc('list_my_work', args)
        if (signal) request = request.abortSignal(signal)
        const { data, error } = await request
        if (error) throw error
        if (!validResponse(data, args)) throw new Error('Invalid My Work response')
        return data
      } catch (error) { throw myWorkError(error) }
    },
  }
}
