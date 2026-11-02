import { isCalendarDate } from '../deadlines/deadlineModel.js'
import { STATUSES, WORKSTREAMS, WORKFLOW_FILTERS } from './projectModel.js'

const employeeId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function projectQueryFromParams(params) {
  const pick = (key, allowed) => allowed.includes(params.get(key)) ? params.get(key) : ''
  const page = Number(params.get('page') ?? 1)
  return {
    search: params.get('q') ?? '', archive: pick('view', ['active','archived','all']) || 'active',
    workstream: pick('stream', WORKSTREAMS.map(({ type }) => type)), status: pick('status', STATUSES),
    workflow: pick('workflow', WORKFLOW_FILTERS.map(({ value }) => value)),
    assignee: params.get('assignee') ?? '', unassigned: params.get('unassigned') === '1',
    priority: pick('priority', ['High','Medium','Low']), dueFrom: params.get('from') ?? '', dueTo: params.get('to') ?? '',
    needsBpReview: params.get('bp_review') === '1',
    page: Number.isInteger(page) && page > 0 && page <= 1000000 ? page : 1,
    pageSize: [10,20,50].includes(Number(params.get('size'))) ? Number(params.get('size')) : 20,
  }
}

export function projectSearchArgs(query = {}) {
  const { search = '', archive = 'active', workstream = '', status = '', workflow = '', assignee = '',
    unassigned = false, priority = '', dueFrom = '', dueTo = '', needsBpReview = false, page = 1, pageSize = 20 } = query
  if (search.length > 120) throw new Error('Search with up to 120 characters.')
  if ((dueFrom && !isCalendarDate(dueFrom)) || (dueTo && !isCalendarDate(dueTo))) throw new Error('Enter valid Tennessee calendar dates.')
  if (dueFrom && dueTo && dueFrom > dueTo) throw new Error('The Tennessee start date must be on or before the end date.')
  if (assignee && !employeeId.test(assignee)) throw new Error('Choose a valid employee filter.')
  if (assignee && unassigned) throw new Error('Choose an employee or Unassigned, rather than both.')
  if (!Number.isInteger(page) || page < 1 || page > 1000000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) throw new Error('Choose a valid project page and page size.')
  return { p_query: search.trim(), p_archive: archive, p_workstream: workstream || null, p_status: status || null,
    p_workflow: workflow || null, p_assignee_id: assignee || null, p_unassigned: unassigned === true,
    p_priority: priority || null, p_due_from: dueFrom || null, p_due_to: dueTo || null,
    p_needs_bp_review: needsBpReview === true, p_page: page, p_page_size: pageSize }
}
