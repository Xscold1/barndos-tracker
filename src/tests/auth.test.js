import test from 'node:test'
import assert from 'node:assert/strict'
import { readSupabaseConfig } from '../lib/supabaseConfig.js'
import { authReducer, initialAuthState } from '../features/auth/authState.js'
import { dashboardPreference, defaultDashboardPath, postLoginPath } from '../features/auth/dashboardPreference.js'

test('empty configuration stays unconfigured; partial configuration is rejected', () => {
  assert.equal(readSupabaseConfig().configured, false)
  assert.ok(readSupabaseConfig('https://example.invalid').error)
})

test('frontend key validation rejects privileged and malformed inputs without echoing them', () => {
  // Synthetic format fixtures only: none is a real API key or environment value.
  const syntheticJwt = (role) => `header.${btoa(JSON.stringify({ role }))}.signature`
  for (const key of ['sb_secret_NOT_A_REAL_KEY', syntheticJwt('service_role'), 'malformed']) {
    const result = readSupabaseConfig('https://example.invalid', key)
    assert.equal(result.configured, false)
    assert.ok(result.error)
    assert.ok(!result.error.includes(key))
    assert.equal(result.key, undefined)
  }
  assert.equal(readSupabaseConfig('https://example.invalid', syntheticJwt('anon')).configured, true)
  assert.equal(readSupabaseConfig('https://example.invalid', 'sb_publishable_FORMAT_FIXTURE').configured, true)
  assert.equal(readSupabaseConfig('https://user:password@example.invalid', syntheticJwt('anon')).configured, false)
})

test('roles choose dashboard preferences, including an explicit default and no-role fallback', () => {
  for (const [role, stream] of [['cp_drafter','cp'], ['bp_drafter','bp'], ['kitchen_drafter','kitchen'], ['quotation_takeoffs','takeoffs']]) {
    assert.equal(defaultDashboardPath([{ role }]), `/dashboard?scope=mine&workstream=${stream}`)
  }
  assert.equal(defaultDashboardPath([{ role: 'admin_pm' }]), '/dashboard?scope=team')
  assert.equal(dashboardPreference([]).scope, 'team')
  assert.equal(dashboardPreference([{ role: 'admin_pm' }, { role: 'cp_drafter', is_default: true }]).scope, 'team')
  assert.equal(dashboardPreference([{ role: 'bp_drafter' }, { role: 'cp_drafter', is_default: true }]).workstream, 'cp')
})

test('post-login navigation preserves internal deep links and rejects external/login redirects', () => {
  const roles = [{ role: 'cp_drafter' }]
  assert.equal(postLoginPath('/projects/demo-1001?q=alder#workstreams', roles), '/projects/demo-1001?q=alder#workstreams')
  for (const bad of ['https://other.invalid/projects', '//other.invalid/projects', '/\\other.invalid/projects', '/login', '/', null]) {
    assert.equal(postLoginPath(bad, roles), '/dashboard?scope=mine&workstream=cp')
  }
})

test('a session alone cannot enter ready state; token refresh keeps the loaded employee', () => {
  const session = { user: { id: 'employee-a' } }
  let state = authReducer(initialAuthState(true), { type: 'session', session })
  assert.equal(state.status, 'loading')
  state = authReducer(state, { type: 'profile', userId: 'employee-a', profile: { id: 'employee-a', is_active: true }, roles: [] })
  assert.equal(state.status, 'ready')
  state = authReducer(state, { type: 'session', session: { ...session, access_token: 'synthetic-refresh-fixture' } })
  assert.equal(state.status, 'ready')
  assert.equal(state.profile.id, 'employee-a')
})

test('sign-out/account switches ignore late profile responses and clear previous access', () => {
  let state = authReducer(initialAuthState(true), { type: 'session', session: { user: { id: 'employee-a' } } })
  state = authReducer(state, { type: 'session', session: null })
  state = authReducer(state, { type: 'profile', userId: 'employee-a', profile: { id: 'employee-a' }, roles: [] })
  assert.equal(state.status, 'signedOut')
  assert.equal(state.profile, null)
  state = authReducer(state, { type: 'session', session: { user: { id: 'employee-b' } } })
  state = authReducer(state, { type: 'failure', userId: 'employee-a', message: 'Stale failure' })
  assert.equal(state.session.user.id, 'employee-b')
  assert.equal(state.error, null)
  state = authReducer(state, { type: 'failure', userId: 'employee-b', denied: true, message: 'Not an employee' })
  assert.equal(state.status, 'denied')
  assert.equal(state.profile, null)
})
