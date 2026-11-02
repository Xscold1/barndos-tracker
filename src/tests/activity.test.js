import test from 'node:test'
import assert from 'node:assert/strict'
import process from 'node:process'
import { ACTIVITY_PAGE_SIZE, createActivityService } from '../features/activity/createActivityService.js'
import { activityChanges, activityScope, activityTitle } from '../features/activity/activityModel.js'
import { formatUpdatedAt } from '../features/projects/projectModel.js'

const projectId = '20000000-0000-4000-8000-000000000001'
const event = { id: '40000000-0000-4000-8000-000000000001', occurred_at: '2026-11-02T06:01:02.123456+00:00' }

test('activity pagination preserves precise timestamp/ID cursor and scopes every page to the project', async () => {
  const calls = []
  const service = createActivityService({ rpc(name, args) {
    calls.push({ name, args })
    return Promise.resolve({ data: calls.length === 1 ? Array.from({ length: ACTIVITY_PAGE_SIZE + 1 }, (_, i) => ({ ...event, id: `${event.id.slice(0,-3)}${String(i).padStart(3,'0')}` })) : [], error: null })
  } })
  const first = await service.listActivity(projectId)
  assert.equal(first.events.length, 20)
  assert.equal(first.cursor.id, first.events.at(-1).id)
  assert.equal(first.cursor.occurred_at, event.occurred_at)
  const next = await service.listActivity(projectId, { cursor: first.cursor })
  assert.deepEqual(next, { events: [], cursor: null })
  assert.equal(calls[1].args.p_before_at, event.occurred_at)
  assert.equal(calls[1].args.p_before_id, first.cursor.id)
  assert.equal(calls[1].args.p_project_id, projectId)
  assert.equal(calls[0].args.p_limit, 21)
})

test('activity reads carry cancellation, reject bad project IDs and never fabricate history on failure', async () => {
  const controller = new AbortController()
  let passedSignal
  const service = createActivityService({ rpc() {
    const query = { abortSignal(signal) { passedSignal = signal; return query }, then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve) } }
    return query
  } })
  await service.listActivity(projectId, { signal: controller.signal })
  assert.equal(passedSignal, controller.signal)
  await assert.rejects(service.listActivity('missing'), /Reload the project/)
  await assert.rejects(createActivityService(null).listActivity(projectId), /could not be loaded/)
  const denied = createActivityService({ rpc() { return Promise.resolve({ data: null, error: { code: '42501', message: 'private backend message' } }) } })
  await assert.rejects(denied.listActivity(projectId), /employee access/)
})

test('project worknotes contain only scope and trimmed text, with no assignment/version/actor payload', async () => {
  let sent
  const service = createActivityService({ rpc(name, args) { sent = { name, args }; return { single: async () => ({ data: { ...event, worknote: args.p_worknote }, error: null }) } } })
  await service.addProjectNote(projectId, '  Coordinate without reassignment\nSecond line  ')
  assert.deepEqual(sent, { name: 'add_project_note', args: { p_project_id: projectId, p_worknote: 'Coordinate without reassignment\nSecond line' } })
  await assert.rejects(service.addProjectNote(projectId, '  '), /worknote/)
  await assert.rejects(service.addProjectNote(projectId, 'x'.repeat(2001)), /2,000/)
  const offline = createActivityService({ rpc() { return { single: async () => ({ data: null, error: { message: 'private' } }) } } })
  await assert.rejects(offline.addProjectNote(projectId, 'Note'), /Reload activity before retrying/)
})

test('activity changes resolve employees, retain calendar dates and hide internal acknowledgement hashes', () => {
  const changes = activityChanges({ employee_names: { employee: 'Ellis Rowan' }, changes: {
    assignee_id: { old: null, new: 'employee' }, due_date: { old: null, new: '2026-11-01' },
    status: { old: 'Waiting', new: 'In Progress' }, queue_position: { old: null, new: 2 },
    workload_acknowledgement: { new: { token: 'internal-marker', items: [{ id: 'other' }] } },
    unrecognized_internal_field: { new: 'private backend value' },
  } })
  assert.equal(changes[0].before, 'Unassigned')
  assert.equal(changes[0].after, 'Ellis Rowan')
  assert.equal(changes[1].after, 'Nov 1, 2026')
  assert.equal(changes[3].after, '2')
  assert.match(changes[4].summary, /1 other assignments/)
  assert.ok(!JSON.stringify(changes).includes('internal-marker'))
  assert.ok(!JSON.stringify(changes).includes('private backend value'))
})

test('timeline distinguishes project/workstream scope and independent working/issued revisions', () => {
  assert.equal(activityTitle({ operation: 'revision_issued' }), 'Revision issued')
  assert.equal(activityTitle({ operation: 'work_item_updated' }), 'Workstream updated')
  assert.equal(activityScope({ workstream_type: 'kitchen' }), 'Kitchen Plan')
  assert.equal(activityScope({ work_item_id: null }), 'Project')
  assert.equal(activityChanges({ changes: { revision: { old: 'K-3', new: 'K-4' } } })[0].label, 'Own revision')
})

test('timeline timestamps remain CT across browser/process zones and handle CDT/CST', () => {
  const previous = process.env.TZ
  try {
    for (const zone of ['Asia/Manila','America/Chicago','UTC']) {
      process.env.TZ = zone
      assert.match(formatUpdatedAt('2026-11-02T06:01:00Z'), /Nov 2, 2026, 12:01 AM CST/)
      assert.match(formatUpdatedAt('2026-07-02T05:01:00Z'), /Jul 2, 2026, 12:01 AM CDT/)
    }
  } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
})
