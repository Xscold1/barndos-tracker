import test from 'node:test'
import assert from 'node:assert/strict'
import process from 'node:process'
import { applyCompanyDate, draftingDeadlineState, isCalendarDate } from '../features/deadlines/deadlineModel.js'
import { createProjectService } from '../features/projects/createProjectService.js'
import { workItemFields } from '../features/work-items/createWorkItemService.js'
import { formatDeadline } from '../features/projects/projectModel.js'

const item = { id: 'fixture', assignee_id: 'employee-fixture', status: 'In Progress', due_date: '2026-10-28', queue_position: null, workstream_type: 'bp', row_version: 2 }

test('calendar DATE validation handles leap years and rejects timestamps/overflow dates', () => {
  for (const value of ['2024-02-29','2000-02-29','2026-11-01','0001-01-01','9999-12-31']) assert.equal(isCalendarDate(value), true)
  for (const value of ['1900-02-29','2026-02-29','2026-04-31','2026-00-01','0000-01-01','2026-1-1','2026-11-01T00:00:00Z','infinity']) assert.equal(isCalendarDate(value), false)
})

test('due/overdue depends on database company date, including PH midnight and winter dates', () => {
  assert.equal(draftingDeadlineState(item, '2026-10-28'), 'due_today')
  assert.equal(draftingDeadlineState(item, '2026-10-29'), 'overdue')
  assert.equal(draftingDeadlineState(item, '2026-10-27'), 'upcoming')
  const previousTZ = process.env.TZ
  try {
    for (const zone of ['Asia/Manila','America/Chicago','UTC','Pacific/Honolulu']) {
      process.env.TZ = zone
      assert.equal(draftingDeadlineState(item, '2026-10-28'), 'due_today')
      assert.equal(draftingDeadlineState({ ...item, due_date: '2026-11-01' }, '2026-11-01'), 'due_today')
      assert.equal(formatDeadline('2026-11-01'), 'Nov 1, 2026')
    }
  } finally {
    if (previousTZ === undefined) delete process.env.TZ
    else process.env.TZ = previousTZ
  }
})

test('only assigned active drafting work can have due/overdue states', () => {
  for (const status of ['Waiting','In Progress','For Review','Revision Requested']) assert.equal(draftingDeadlineState({ ...item, status }, '2026-10-29'), 'overdue')
  assert.equal(draftingDeadlineState({ ...item, status: 'For Client Review' }, '2026-10-29'), 'awaiting_client')
  for (const status of ['Done','Not Needed']) assert.equal(draftingDeadlineState({ ...item, status }, '2026-10-29'), 'inactive')
  assert.equal(draftingDeadlineState({ ...item, assignee_id: null }, '2026-10-29'), 'unassigned')
  assert.equal(draftingDeadlineState({ ...item, due_date: null }, '2026-10-29'), 'not_scheduled')
  assert.throws(() => draftingDeadlineState(item, undefined), /company date is unavailable/)
})

test('clock refresh changes only derived fields and preserves row versions/assignments', () => {
  const original = { id: 'project-fixture', row_version: 3, work_items: [{ ...item, revision: 'B' }] }
  const due = applyCompanyDate(original, '2026-10-28')
  const late = applyCompanyDate(due, '2026-10-29')
  assert.equal(due.work_items[0].deadline_state, 'due_today')
  assert.equal(late.work_items[0].deadline_state, 'overdue')
  assert.equal(late.work_items[0].row_version, 2)
  assert.equal(late.row_version, 3)
  assert.equal(late.work_items[0].assignee_id, item.assignee_id)
  assert.equal(original.work_items[0].deadline_state, undefined)
})

test('company-date RPC uses no client clock argument and fails closed on invalid responses', async () => {
  const calls = []
  const service = createProjectService({ rpc(...args) { calls.push(args); return Promise.resolve({ data: '2026-10-28', error: null }) } })
  assert.equal(await service.getCompanyToday(), '2026-10-28')
  assert.deepEqual(calls, [['company_today']])
  const bad = createProjectService({ rpc() { return Promise.resolve({ data: null, error: null }) } })
  await assert.rejects(bad.getCompanyToday(), /company date could not be loaded/)
})

test('deadline editing respects no-assignee rule and confirms queue clearing', () => {
  const fields = { status: item.status, required: true, priority_level: 'Medium', notes: '', revision: 'B', assignee_id: item.assignee_id }
  assert.equal(workItemFields(item, { ...fields, due_date: '' }).due_date, null)
  assert.throws(() => workItemFields({ ...item, due_date: null }, { ...fields, assignee_id: '', due_date: '2026-11-01' }), /Assign an employee/)
  assert.throws(() => workItemFields(item, { ...fields, due_date: '2026-02-29' }), /valid Tennessee calendar date/)
  assert.throws(() => workItemFields({ ...item, queue_position: 1 }, { ...fields, due_date: '' }), /clearing the queue/)
  assert.equal(workItemFields({ ...item, queue_position: 1 }, { ...fields, due_date: '', clear_schedule: true }).due_date, null)
})
