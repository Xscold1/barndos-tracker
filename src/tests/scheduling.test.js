import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkItemService, workItemError, workItemFields } from '../features/work-items/createWorkItemService.js'

const item = { id: 'item', workstream_type: 'bp', row_version: 1, status: 'Waiting', due_date: null, queue_position: null }
const fields = { status: 'In Progress', assignee_id: 'employee', required: true, priority_level: 'High', revision: 'B', notes: '', due_date: '2026-11-05', queue_position: '2' }
const warning = { kind: 'workload_warning', token: 'a'.repeat(32), due_date: '2026-11-05', assignee_id: 'employee', items: [{ id: 'other', project_no: 'OTHER', client_name: 'Fictional client', workstream_type: 'cp', assignee_name: 'Aria', queue_position: 1 }] }

test('queue positions accept blank or positive PostgreSQL integers and require schedule coordinates', () => {
  assert.equal(workItemFields(item, fields).queue_position, 2)
  assert.equal(workItemFields(item, { ...fields, queue_position: '' }).queue_position, null)
  assert.equal(workItemFields(item, { ...fields, queue_position: '2147483647' }).queue_position, 2147483647)
  for (const queue_position of ['0','-1','1.5','abc','2147483648']) assert.throws(() => workItemFields(item, { ...fields, queue_position }), /whole number/)
  assert.throws(() => workItemFields(item, { ...fields, due_date: '' }), /deadline before/)
  assert.throws(() => workItemFields(item, { ...fields, assignee_id: '', due_date: '' }), /employee and deadline/)
})

test('confirmed clearing of an existing schedule clears queue and retains optional assignment', () => {
  const scheduled = { ...item, due_date: fields.due_date, queue_position: 1 }
  const cleared = workItemFields(scheduled, { ...fields, due_date: '', clear_schedule: true })
  assert.equal(cleared.queue_position, null)
  assert.equal(cleared.assignee_id, 'employee')
  const unassigned = workItemFields(scheduled, { ...fields, assignee_id: '', clear_schedule: true })
  assert.equal(unassigned.queue_position, null)
  assert.equal(unassigned.due_date, null)
})

test('a scheduling warning requires a separate explicit save with its snapshot token', async () => {
  const calls = []
  const service = createWorkItemService({ rpc(name, args) {
    calls.push({ name, args })
    return { single: async () => calls.length === 1
      ? { data: null, error: { code: 'P0001', details: JSON.stringify(warning) } }
      : { data: { ...item, ...fields, row_version: 2 }, error: null } }
  } })
  await assert.rejects(service.updateWorkItem(item, fields), (error) => {
    assert.equal(error.code, 'WORKLOAD_WARNING')
    assert.deepEqual(error.workload, warning)
    return true
  })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].name, 'schedule_work_item')
  assert.equal(calls[0].args.p_queue_position, 2)
  assert.equal(calls[0].args.p_workload_acknowledged, false)
  assert.equal(calls[0].args.p_workload_token, null)
  await service.updateWorkItem(item, { ...fields, workload_acknowledged: true, workload_token: warning.token })
  assert.equal(calls[1].args.p_workload_acknowledged, true)
  assert.equal(calls[1].args.p_workload_token, warning.token)
  assert.equal(calls[1].args.p_expected_row_version, 1)
})

test('malformed backend errors cannot become confirmable workload warnings', () => {
  for (const details of ['invalid', '{}', JSON.stringify({ ...warning, token: null }), JSON.stringify({ ...warning, items: [] })]) {
    assert.equal(workItemError({ code: 'P0001', details }).workload, undefined)
  }
})

test('unused acknowledgement tokens are omitted and notes remain independent of scheduling', async () => {
  const calls = []
  const service = createWorkItemService({ rpc(name, args) { calls.push({ name, args }); return { single: async () => ({ data: { id: 'saved' }, error: null }) } } })
  await service.updateWorkItem(item, { ...fields, workload_token: warning.token })
  assert.equal(calls[0].args.p_workload_token, null)
  await service.addWorknote(item.id, 'Coordination note')
  assert.deepEqual(calls[1].args, { p_work_item_id: item.id, p_worknote: 'Coordination note' })
})
