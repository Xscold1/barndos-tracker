import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkItemService, workItemError, workItemFields } from '../features/work-items/createWorkItemService.js'

const item = { id: '30000000-0000-4000-8000-000000000203', workstream_type: 'bp', row_version: 2, status: 'Waiting', due_date: null, queue_position: null }
const fields = { status: 'In Progress', assignee_id: '10000000-0000-4000-8000-000000000001', required: true, priority_level: 'High', revision: ' B ', notes: 'Remarks' }

test('workstream RPC sends only its editable fields and expected version', async () => {
  let sent
  const service = createWorkItemService({ rpc(name, args) { sent = { name, args }; return { single: async () => ({ data: { id: item.id }, error: null }) } } })
  await service.updateWorkItem(item, { ...fields, due_date: '2030-01-01', actor_id: 'spoof', bp_reference_revision_id: 'spoof' })
  assert.equal(sent.name, 'schedule_work_item')
  assert.equal(sent.args.p_expected_row_version, 2)
  assert.equal(sent.args.p_revision, 'B')
  assert.equal(sent.args.p_assignee_id, fields.assignee_id)
  assert.equal(sent.args.p_due_date, '2030-01-01')
  assert.equal(sent.args.p_actor_id, undefined)
  assert.equal(sent.args.p_bp_reference_revision_id, undefined)
})

test('scope and controlled statuses cannot silently become invalid', () => {
  assert.throws(() => workItemFields(item, { ...fields, status: 'Not Needed' }), /cannot be required/)
  assert.throws(() => workItemFields(item, { ...fields, required: null }), /whether/)
  assert.throws(() => workItemFields(item, { ...fields, status: 'Unknown' }), /valid workstream status/)
  assert.equal(workItemFields({ ...item, workstream_type: 'quotation' }, { ...fields, required: null }).required, null)
  assert.equal(workItemFields(item, { ...fields, status: 'Not Needed', required: false }).required, false)
})

test('unassigning scheduled work requires explicit confirmation and reopening needs a reason', () => {
  const scheduled = { ...item, due_date: '2026-11-05', queue_position: 1 }
  assert.throws(() => workItemFields(scheduled, { ...fields, assignee_id: '' }), /Confirm clearing/)
  assert.equal(workItemFields(scheduled, { ...fields, assignee_id: '', clear_schedule: true }).assignee_id, null)
  assert.throws(() => workItemFields({ ...item, status: 'Done' }, fields), /reason for reopening/)
  assert.equal(workItemFields({ ...item, status: 'Done' }, { ...fields, change_note: ' Client changes ' }).change_note, 'Client changes')
})

test('independent note writes carry no assignment, version or actor fields', async () => {
  let sent
  const service = createWorkItemService({ rpc(name, args) { sent = { name, args }; return { single: async () => ({ data: { id: 'note-fixture' }, error: null }) } } })
  await service.addWorknote(item.id, '  Keep the assignment  ')
  assert.deepEqual(sent, { name: 'add_work_item_note', args: { p_work_item_id: item.id, p_worknote: 'Keep the assignment' } })
  assert.throws(() => service.addWorknote(item.id, '  '), /worknote/)
})

test('workstream conflicts identify the other project instead of claiming a duplicate project number', () => {
  const error = workItemError({ code: '23505', details: JSON.stringify({ project_no: 'DEMO-1003', client_name: 'Meadow Lane', workstream_type: 'bp', due_date: '2026-10-30', assignee_name: 'Ellis', queue_position: 1 }) })
  for (const text of ['DEMO-1003','Meadow Lane','Blueprint','Ellis','2026-10-30','position 1']) assert.ok(error.message.includes(text))
  assert.match(workItemError({ code: '40001' }).message, /workstream changed/)
  assert.ok(!workItemError({ message: 'private backend details' }, true).message.includes('private backend details'))
})

test('employee reads filter active profiles across departments and exhaust short keyset batches', async () => {
  const calls = []
  let batch = 0
  const service = createWorkItemService({ from(table) {
    const call = { table }; calls.push(call)
    const query = {
      select() { return query }, order() { return query }, limit() { return query },
      eq(...args) { call.filter = args; return query }, gt(...args) { call.after = args; return query },
      then(resolve) { return Promise.resolve({ data: batch++ === 0 ? [{ id: 'employee-1', display_name: 'Employee', is_active: true }] : [], error: null }).then(resolve) },
    }
    return query
  } })
  assert.equal((await service.listEmployees()).length, 1)
  assert.equal(calls.length, 2)
  assert.deepEqual(calls[0].filter, ['is_active', true])
  assert.deepEqual(calls[1].after, ['id','employee-1'])
  assert.equal(calls[0].table, 'profiles')
})
