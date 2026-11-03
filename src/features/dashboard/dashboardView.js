import { dashboardPreference, hasAdminRole } from '../auth/dashboardPreference.js'
import { DASHBOARD_FILTERS, DASHBOARD_WORKSTREAMS } from './createDashboardService.js'

const pageKey = (workstream) => `${workstream}_page`
const validPage = (value) => /^\d+$/.test(value ?? '') && Number(value) >= 1 && Number(value) <= 1000000

export function dashboardViewFromParams(params, roles) {
  const preference = dashboardPreference(roles)
  const scope = hasAdminRole(roles) ? 'team' : ['team', 'mine'].includes(params.get('scope')) ? params.get('scope') : preference.scope
  const requested = params.get('workstream')
  const workstream = requested === 'none' ? null : DASHBOARD_WORKSTREAMS.includes(requested) ? requested : preference.workstream
  const filter = DASHBOARD_FILTERS.includes(params.get('filter')) ? params.get('filter') : 'pending'
  const pages = Object.fromEntries(DASHBOARD_WORKSTREAMS.map((type) => [type, validPage(params.get(pageKey(type))) ? Number(params.get(pageKey(type))) : 1]))
  return { scope, workstream, filter, pages, page: workstream ? pages[workstream] : 1 }
}

// A card retains its page until the scope/list filter changes. Explicit 'none'
// keeps a drafter's chosen collapsed state after refresh and Back navigation.
export function dashboardParamsAfter(params, view, action) {
  const next = new URLSearchParams(params)
  next.set('scope', view.scope)
  next.set('workstream', view.workstream ?? 'none')
  if (action.type === 'select' && DASHBOARD_WORKSTREAMS.includes(action.workstream)) {
    next.set('workstream', action.workstream === view.workstream ? 'none' : action.workstream)
  }
  if ((action.type === 'scope' && ['team', 'mine'].includes(action.value))
    || (action.type === 'filter' && DASHBOARD_FILTERS.includes(action.value))) {
    next.set(action.type, action.value)
    if (action.value !== view[action.type]) DASHBOARD_WORKSTREAMS.forEach((type) => next.delete(pageKey(type)))
  }
  if (action.type === 'page' && view.workstream && validPage(String(action.value))) {
    if (action.value === 1) next.delete(pageKey(view.workstream))
    else next.set(pageKey(view.workstream), String(action.value))
  }
  return next
}
