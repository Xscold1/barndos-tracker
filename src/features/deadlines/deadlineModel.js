export const ACTIVE_DRAFTING_STATUSES = ['Waiting', 'In Progress', 'For Review', 'Revision Requested']

// Validate PostgreSQL DATE input as a calendar value, without constructing a Date
// or converting through a browser-local midnight.
export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1 || month < 1 || month > 12 || day < 1) return false
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
}

// companyToday must come from the database's company_today RPC. UI components
// consume this result; no browser clock is read, even during background refresh.
export function draftingDeadlineState(item, companyToday) {
  if (!isCalendarDate(companyToday)) throw new Error('The Tennessee company date is unavailable. Reload to retry.')
  if (item.status === 'For Client Review') return 'awaiting_client'
  if (!ACTIVE_DRAFTING_STATUSES.includes(item.status)) return 'inactive'
  if (!item.assignee_id && !item.assignee?.id) return 'unassigned'
  if (!item.due_date) return 'not_scheduled'
  if (!isCalendarDate(item.due_date)) throw new Error('A project deadline is not a valid calendar date. Contact your project manager.')
  return item.due_date < companyToday ? 'overdue' : item.due_date === companyToday ? 'due_today' : 'upcoming'
}

export function applyCompanyDate(data, companyToday) {
  if (!isCalendarDate(companyToday)) throw new Error('The Tennessee company date is unavailable. Reload to retry.')
  const project = (value) => ({ ...value, company_today: companyToday, work_items: value.work_items.map((item) => ({ ...item, deadline_state: draftingDeadlineState(item, companyToday) })) })
  return Array.isArray(data) ? data.map(project) : data ? project(data) : null
}
