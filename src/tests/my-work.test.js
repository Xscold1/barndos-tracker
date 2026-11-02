import test from 'node:test'
import assert from 'node:assert/strict'
import { createMyWorkService } from '../features/my-work/createMyWorkService.js'
import { myWorkArgs, myWorkParamsAfter, myWorkQueryFromParams, myWorkReturnPath } from '../features/my-work/myWorkQuery.js'

const employee = '10000000-0000-4000-8000-000000000001'
function response({ total = 24, page = 1, pageSize = 10 } = {}) {
  return { employee_id: employee, company_today: '2026-11-05', total, page, page_size: pageSize, page_count: Math.max(1, Math.ceil(total / pageSize)),
    summary: { pending: 24, due_today: 5, overdue: 2, awaiting_client: 2 },
    items: Array.from({ length: Math.min(pageSize, Math.max(0, total - (page - 1) * pageSize)) }, (_, n) => ({ id: `item-${page}-${n}`, project_id: 'project', project_no: 'DEMO-1', client_name: 'Fictional client', workstream_type: 'quotation', assignee_id: employee,
      status: 'Waiting', priority_level: 'Medium', queue_position: null, due_date: null, deadline_state: 'not_scheduled' })) }
}
function client(result, calls = []) {
  return { rpc(name, args) {
    const call = { name, args }; calls.push(call)
    const request = { abortSignal(signal) { call.signal = signal; return request }, then(resolve, reject) { return Promise.resolve(result).then(resolve, reject) } }
    return request
  } }
}

test('My Work URL combines all-five-workstream filters, status, priority and server deadline views', () => {
  const query = myWorkQueryFromParams(new URLSearchParams('q=Fictional&stream=quotation&status=For+Review&priority=High&deadline=overdue&page=3&size=20'))
  assert.deepEqual(myWorkArgs(query), { p_query: 'Fictional', p_workstream: 'quotation', p_status: 'For Review', p_priority: 'High', p_deadline: 'overdue', p_page: 3, p_page_size: 20 })
  const normalized = myWorkQueryFromParams(new URLSearchParams('stream=bad&status=bad&priority=admin&deadline=bad&page=-1&size=900'))
  assert.equal(normalized.workstream, '')
  assert.equal(normalized.status, 'pending')
  assert.equal(normalized.deadline, 'all')
  assert.equal(normalized.page, 1)
  assert.equal(normalized.pageSize, 10)
})

test('filter changes reset pagination and return navigation accepts only the internal My Work route', () => {
  const params = new URLSearchParams('q=Cedar&page=3&size=20')
  const changed = myWorkParamsAfter(params, 'priority', 'High')
  assert.equal(changed.get('page'), null)
  assert.equal(changed.get('q'), 'Cedar')
  assert.equal(myWorkParamsAfter(changed, 'page', 2).get('size'), '20')
  assert.equal(myWorkReturnPath('/my-work?q=Cedar&page=2'), '/my-work?q=Cedar&page=2')
  assert.equal(myWorkReturnPath('/my-work'), '/my-work')
  for (const path of ['https://outside.invalid', '//outside.invalid', '/my-work/../../login', '/projects', null, {}]) assert.equal(myWorkReturnPath(path), null)
})

test('My Work is one abortable RPC with an explicit allowlist; actor, scope and browser date cannot be sent', async () => {
  const calls = [], controller = new AbortController(), data = response()
  const result = await createMyWorkService(client({ data }, calls)).listMyWork({ signal: controller.signal, employeeId: 'forged', assignee: 'forged', scope: 'team', companyToday: '2099-01-01' })
  assert.equal(result, data)
  assert.deepEqual(calls[0].args, { p_query: '', p_workstream: null, p_status: 'pending', p_priority: null, p_deadline: 'all', p_page: 1, p_page_size: 10 })
  assert.equal(calls[0].name, 'list_my_work')
  assert.equal(calls[0].signal, controller.signal)
})

test('full totals and overview survive pagination while supplied server OLA states remain authoritative', async () => {
  const data = response({ page: 3 })
  data.items[0] = { ...data.items[0], workstream_type: 'bp', status: 'For Client Review', due_date: '2026-10-01', deadline_state: 'awaiting_client' }
  const result = await createMyWorkService(client({ data })).listMyWork({ page: 3 })
  assert.equal(result.items.length, 4)
  assert.equal(result.total, 24)
  assert.equal(result.summary.pending, 24)
  assert.equal(result.items[0].deadline_state, 'awaiting_client')
  assert.equal(result.company_today, '2026-11-05')
})

test('empty and clamped assignment pages retain full overview rather than deriving counts from the page', async () => {
  const data = response({ total: 0 })
  assert.equal((await createMyWorkService(client({ data })).listMyWork({ page: 99 })).page, 1)
  assert.equal((await createMyWorkService(client({ data })).listMyWork()).summary.pending, 24)
  const empty = { ...data, summary: { pending: 0, due_today: 0, overdue: 0, awaiting_client: 0 } }
  assert.deepEqual((await createMyWorkService(client({ data: empty })).listMyWork()).items, [])
})

test('invalid input fails before requests instead of silently changing filters', async () => {
  const calls = [], service = createMyWorkService(client({}, calls))
  for (const query of [{ workstream: 'bad' }, { status: null }, { priority: 'Urgent' }, { deadline: 'yesterday' }, { page: 0 }, { page: 1.5 }, { pageSize: 51 }, { search: 'a'.repeat(121) }]) await assert.rejects(service.listMyWork(query))
  assert.equal(calls.length, 0)
})

test('malformed, foreign-assignee and invalid-date responses fail closed without invented totals', async () => {
  const good = response({ total: 1 })
  for (const data of [null, {}, { ...good, employee_id: 'bad' }, { ...good, company_today: '2026-02-29' }, { ...good, total: '1' },
    { ...good, items: [] }, { ...good, summary: { ...good.summary, overdue: 99 } },
    { ...good, items: [{ ...good.items[0], assignee_id: '10000000-0000-4000-8000-000000000002' }] },
    { ...good, items: [{ ...good.items[0], due_date: '2026-02-30' }] }]) {
    await assert.rejects(createMyWorkService(client({ data })).listMyWork(), /could not be loaded/)
  }
})

test('access, migration and network errors are actionable and hide backend details', async () => {
  for (const [code, message] of [['42501', /employee access/], ['PGRST202', /database update/], ['PGRST301', /expired/], ['NETWORK', /connection/]]) {
    await assert.rejects(createMyWorkService(client({ error: { code, message: 'private server detail' } })).listMyWork(), (error) => error.code === code && message.test(error.message) && !error.message.includes('private server detail'))
  }
  await assert.rejects(createMyWorkService(null).listMyWork(), /could not be loaded/)
})
