const preferences = {
  admin_pm: { label: 'Team', scope: 'team', workstream: null },
  cp_drafter: { label: 'Concept Plan', scope: 'mine', workstream: 'cp' },
  bp_drafter: { label: 'Blueprint', scope: 'mine', workstream: 'bp' },
  kitchen_drafter: { label: 'Kitchen Plan', scope: 'mine', workstream: 'kitchen' },
  quotation_takeoffs: { label: 'Takeoffs', scope: 'mine', workstream: 'takeoffs' },
}

export function hasAdminRole(roles = []) {
  return roles.some(({ role }) => role === 'admin_pm')
}

// This module chooses a view only. It is never used to authorize CRUD.
export function dashboardPreference(roles = []) {
  if (hasAdminRole(roles)) return preferences.admin_pm
  const supported = roles.filter(({ role }) => preferences[role])
  const chosen = supported.find(({ is_default }) => is_default) ?? supported[0]
  return preferences[chosen?.role] ?? preferences.admin_pm
}

export function defaultDashboardPath(roles) {
  const preference = dashboardPreference(roles)
  const params = new URLSearchParams({ scope: preference.scope })
  if (preference.workstream) params.set('workstream', preference.workstream)
  return `/dashboard?${params}`
}

export function postLoginPath(from, roles) {
  if (typeof from === 'string') {
    try {
      const url = new URL(from, 'https://internal.invalid')
      if (url.origin === 'https://internal.invalid' && /^\/(dashboard|my-work|projects(?:\/[^/]+)?)\/?$/.test(url.pathname)) {
        return `${url.pathname}${url.search}${url.hash}`
      }
    } catch { /* Fall back to the employee's dashboard. */ }
  }
  return defaultDashboardPath(roles)
}
