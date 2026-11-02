import test from 'node:test'
import assert from 'node:assert/strict'
import { createDashboardService, DASHBOARD_WORKSTREAMS } from '../features/dashboard/createDashboardService.js'

function response({ scope = 'team', workstream = null, filter = 'pending', page = 1, total = 12 } = {}) {
  return {
    company_today: '2026-10-28', scope,
    cards: DASHBOARD_WORKSTREAMS.map((type) => ({ workstream_type: type, pending: 12, due_today: 3, overdue: 2, awaiting_client: 4, unassigned: 1 })),
    list: workstream === null ? null : {
      workstream_type: workstream, filter, total, page, page_size: 5, page_count: Math.max(1, Math.ceil(total / 5)),
      items: Array.from({ length: Math.min(5, Math.max(0, total - (page - 1) * 5)) }, (_, n) => ({
        id: `item-${page}-${n}`, project_id: `project-${n}`, project_no: `DEMO-${n}`, client_name: 'Fictional client',
        workstream_type: workstream, assignee_id: null, assignee_name: null, due_date: null, status: 'Waiting', deadline_state: 'unassigned',
      })),
    },
  }
}

function fakeClient(result, calls = []) {
  return { rpc(name, args) {
    const call = { name, args }
    calls.push(call)
    const request = {
      abortSignal(signal) { call.signal = signal; return request },
      then(resolve, reject) { return Promise.resolve(result).then(resolve, reject) },
    }
    return request
  } }
}

test('collapsed dashboard fetches all four authoritative totals in one read', async () => {
  const calls = [], data = response()
  const result = await createDashboardService(fakeClient({ data }, calls)).getDashboard()
  assert.equal(result, data)
  assert.deepEqual(calls, [{ name: 'dashboard_summary', args: { p_scope: 'team', p_workstream: null, p_filter: 'pending', p_page: 1 } }])
  assert.equal(result.list, null)
})

test('five-row pages preserve full totals and server CT date/states; caller identity and clock cannot be sent', async () => {
  const calls = [], controller = new AbortController()
  const data = response({ scope: 'mine', workstream: 'bp', page: 2 })
  data.list.items[0] = { ...data.list.items[0], status: 'For Client Review', due_date: '2026-10-27', deadline_state: 'awaiting_client', assignee_name: 'Ellis Rowan' }
  const result = await createDashboardService(fakeClient({ data }, calls)).getDashboard({ scope: 'mine', workstream: 'bp', page: 2, signal: controller.signal, employeeId: 'forged', companyToday: '2099-01-01', pageSize: 1000 })
  assert.deepEqual(calls[0].args, { p_scope: 'mine', p_workstream: 'bp', p_filter: 'pending', p_page: 2 })
  assert.equal(calls[0].signal, controller.signal)
  assert.equal(result.list.items.length, 5)
  assert.equal(result.list.total, 12)
  assert.equal(result.cards[0].pending, 12)
  assert.equal(result.company_today, '2026-10-28')
  assert.equal(result.list.items[0].deadline_state, 'awaiting_client')
  assert.equal(result.list.items[0].assignee_name, 'Ellis Rowan')
})

test('filtered, clamped and empty lists retain server pagination and all four cards', async () => {
  for (const [filter, total] of [['overdue', 2], ['due_today', 3], ['unassigned', 0]]) {
    const data = response({ workstream: 'kitchen', filter, total })
    const result = await createDashboardService(fakeClient({ data })).getDashboard({ workstream: 'kitchen', filter, page: 99 })
    assert.equal(result.list.page, 1)
    assert.equal(result.list.total, total)
    assert.equal(result.cards.length, 4)
    assert.equal(result.cards[2].pending, 12)
  }
})

test('invalid filters and pages fail before querying', async () => {
  const calls = [], service = createDashboardService(fakeClient({ data: response() }, calls))
  for (const query of [{ scope: 'admin' }, { scope: null }, { workstream: 'quotation' }, { filter: 'Done' }, { page: 0 }, { page: 1.5 }, { page: 1000001 }]) {
    await assert.rejects(service.getDashboard(query), /Choose/)
  }
  assert.equal(calls.length, 0)
})

test('missing or malformed responses fail instead of displaying invented zero totals', async () => {
  const good = response({ workstream: 'cp' })
  for (const data of [null, {}, { ...good, company_today: '2026-02-29' }, { ...good, cards: [] },
    { ...good, cards: good.cards.map((card) => ({ ...card, pending: -1 })) },
    { ...good, list: { ...good.list, total: '12' } }, { ...good, list: { ...good.list, items: [] } },
    { ...good, list: { ...good.list, page_size: 50 } }]) {
    await assert.rejects(createDashboardService(fakeClient({ data })).getDashboard({ workstream: 'cp' }), /could not be loaded/)
  }
})

test('safe errors explain database updates, access loss and network failures', async () => {
  for (const [code, message] of [['PGRST202', /database update/], ['42501', /employee access/], ['PGRST301', /expired/], ['NETWORK', /connection/]]) {
    await assert.rejects(createDashboardService(fakeClient({ error: { code, message: 'private server detail' } })).getDashboard(), (error) => error.code === code && message.test(error.message) && !error.message.includes('private server detail'))
  }
  await assert.rejects(createDashboardService(null).getDashboard(), /could not be loaded/)
})
