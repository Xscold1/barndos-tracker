import { isCalendarDate } from '../deadlines/deadlineModel.js'

export const DASHBOARD_WORKSTREAMS = ['bp', 'cp', 'kitchen', 'takeoffs']
export const DASHBOARD_FILTERS = ['pending', 'due_today', 'overdue', 'unassigned']

function dashboardArgs({ scope = 'team', workstream = null, filter = 'pending', page = 1 }) {
  if (!['team', 'mine'].includes(scope)) throw new Error('Choose All Team or My Work.')
  if (workstream !== null && !DASHBOARD_WORKSTREAMS.includes(workstream)) throw new Error('Choose BP, CP, Kitchen or Takeoffs.')
  if (!DASHBOARD_FILTERS.includes(filter)) throw new Error('Choose a valid dashboard list filter.')
  if (!Number.isInteger(page) || page < 1 || page > 1000000) throw new Error('Choose a valid dashboard page.')
  return { p_scope: scope, p_workstream: workstream, p_filter: filter, p_page: page }
}

const isCount = (value) => Number.isSafeInteger(value) && value >= 0

function validResponse(data, args) {
  if (!isCalendarDate(data?.company_today) || data.scope !== args.p_scope || !Array.isArray(data.cards) || data.cards.length !== 4) return false
  if (!DASHBOARD_WORKSTREAMS.every((type) => data.cards.filter((card) => card.workstream_type === type).length === 1)) return false
  if (!data.cards.every((card) => ['pending', 'due_today', 'overdue', 'awaiting_client', 'unassigned'].every((key) => isCount(card[key]) && card[key] <= card.pending))) return false
  const list = data.list
  if (args.p_workstream === null) return list === null
  if (list?.workstream_type !== args.p_workstream || list.filter !== args.p_filter || !isCount(list.total) || list.page_size !== 5) return false
  const pages = Math.max(1, Math.ceil(list.total / 5))
  return list.page_count === pages && list.page === Math.min(args.p_page, pages)
    && Array.isArray(list.items) && list.items.length === Math.min(5, Math.max(0, list.total - (list.page - 1) * 5))
    && list.items.every((item) => item.workstream_type === args.p_workstream && item.project_id && item.id
      && (item.due_date === null || isCalendarDate(item.due_date)))
}

function dashboardError(error) {
  const messages = {
    '42501': 'Your employee access could not be confirmed. Sign in again or contact your project manager.',
    PGRST301: 'Your session has expired. Sign in again.',
    PGRST202: 'The dashboard service needs a database update. Contact the workspace owner.',
    '22023': 'Check the dashboard scope, workstream, filter and page, then retry.',
  }
  const result = new Error(messages[error?.code] ?? 'The dashboard could not be loaded. Check your connection and retry.')
  result.code = error?.code ?? 'NETWORK'
  return result
}

// Data layer only. Counts and deadline states are returned by SQL, never inferred
// from one page or recomputed using a browser-local clock.
export function createDashboardService(client) {
  return {
    async getDashboard({ signal, ...query } = {}) {
      const args = dashboardArgs(query)
      try {
        if (!client) throw new Error('Dashboard client unavailable')
        let request = client.rpc('dashboard_summary', args)
        if (signal) request = request.abortSignal(signal)
        const { data, error } = await request
        if (error) throw error
        if (!validResponse(data, args)) throw new Error('Invalid dashboard response')
        return data
      } catch (error) { throw dashboardError(error) }
    },
  }
}
