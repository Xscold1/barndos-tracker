import { STATUSES, WORKSTREAMS } from '../projects/projectModel.js'

export const MY_WORK_STATUSES = ['pending', 'all', ...STATUSES]
export const MY_WORK_DEADLINES = ['all', 'due_today', 'overdue', 'upcoming', 'undated']
export const PRIORITIES = ['High', 'Medium', 'Low']

export function myWorkQueryFromParams(params) {
  const pick = (key, allowed, fallback) => allowed.includes(params.get(key)) ? params.get(key) : fallback
  const page = Number(params.get('page') ?? 1)
  return {
    search: params.get('q') ?? '', workstream: pick('stream', WORKSTREAMS.map(({ type }) => type), ''),
    status: pick('status', MY_WORK_STATUSES, 'pending'), priority: pick('priority', PRIORITIES, ''),
    deadline: pick('deadline', MY_WORK_DEADLINES, 'all'),
    page: Number.isInteger(page) && page >= 1 && page <= 1000000 ? page : 1,
    pageSize: [10, 20, 50].includes(Number(params.get('size'))) ? Number(params.get('size')) : 10,
  }
}

export function myWorkArgs({ search = '', workstream = '', status = 'pending', priority = '', deadline = 'all', page = 1, pageSize = 10 } = {}) {
  if (typeof search !== 'string' || search.length > 120) throw new Error('Search with up to 120 characters.')
  if (workstream !== '' && !WORKSTREAMS.some(({ type }) => type === workstream)) throw new Error('Choose a valid workstream.')
  if (!MY_WORK_STATUSES.includes(status) || !MY_WORK_DEADLINES.includes(deadline) || (priority !== '' && !PRIORITIES.includes(priority))) throw new Error('Choose valid status, priority and deadline filters.')
  if (!Number.isInteger(page) || page < 1 || page > 1000000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) throw new Error('Choose a valid My Work page and page size.')
  return { p_query: search.trim(), p_workstream: workstream || null, p_status: status, p_priority: priority || null,
    p_deadline: deadline, p_page: page, p_page_size: pageSize }
}

export function myWorkParamsAfter(params, key, value) {
  const next = new URLSearchParams(params)
  if (value) next.set(key, String(value)); else next.delete(key)
  if (key !== 'page') next.delete('page')
  return next
}

export function myWorkReturnPath(value) {
  return typeof value === 'string' && (value === '/my-work' || value.startsWith('/my-work?')) ? value : null
}
