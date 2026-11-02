import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveProjectWorkflow, filterProjects, WORKSTREAMS } from '../features/projects/projectModel.js'
import { normalizeProject } from '../features/projects/createProjectService.js'
import { draftingDeadlineState } from '../features/deadlines/deadlineModel.js'
import { clientReviewActions, transitionNeedsReason } from '../features/work-items/workflowModel.js'
import { workItemFields } from '../features/work-items/createWorkItemService.js'

const finished = () => WORKSTREAMS.map(({ type }) => ({ workstream_type: type, status: type === 'quotation' ? 'Not Needed' : 'Done', required: type !== 'quotation' }))

test('required completion derives from current work and immediately disappears when BP reopens', () => {
  const items = finished()
  assert.equal(deriveProjectWorkflow(items).all_required_done, true)
  const reopened = items.map((item) => item.workstream_type === 'bp' ? { ...item, status: 'Revision Requested' } : item)
  const state = deriveProjectWorkflow(reopened)
  assert.equal(state.all_required_done, false)
  assert.equal(state.required_open_count, 1)
  assert.equal(state.required_done_count, 3)
  assert.equal(deriveProjectWorkflow(items).all_required_done, true)
})

test('client review stays unfinished and distinct from independent drafting overdue work', () => {
  const items = finished().map((item) => ({ ...item, assignee_id: 'employee', due_date: '2026-11-01', status: item.workstream_type === 'bp' ? 'For Client Review' : item.workstream_type === 'kitchen' ? 'In Progress' : item.status }))
  const state = deriveProjectWorkflow(items)
  assert.equal(state.all_required_done, false)
  assert.equal(state.awaiting_client_count, 1)
  assert.equal(state.required_open_count, 2)
  assert.equal(draftingDeadlineState(items.find((item) => item.workstream_type === 'bp'), '2026-11-02'), 'awaiting_client')
  assert.equal(draftingDeadlineState(items.find((item) => item.workstream_type === 'kitchen'), '2026-11-02'), 'overdue')
})

test('Not Needed and explicitly optional work do not block required completion', () => {
  const items = finished().map((item) => item.workstream_type === 'kitchen' ? { ...item, required: false, status: 'Not Needed' } : item.workstream_type === 'takeoffs' ? { ...item, required: false, status: 'For Client Review' } : item)
  const state = deriveProjectWorkflow(items)
  assert.equal(state.all_required_done, true)
  assert.equal(state.required_count, 2)
  assert.equal(state.awaiting_client_count, 1)
})

test('unknown quotation scope, missing workstreams and empty required scope never claim completion', () => {
  const unknown = finished().map((item) => item.workstream_type === 'quotation' ? { ...item, required: null, status: 'Done' } : item)
  assert.equal(deriveProjectWorkflow(unknown).all_required_done, false)
  assert.equal(deriveProjectWorkflow(unknown).scope_unknown_count, 1)
  assert.equal(deriveProjectWorkflow(unknown.map((item) => ({ ...item, required: true }))).all_required_done, true)
  assert.equal(deriveProjectWorkflow(finished().slice(1)).all_required_done, false)
  assert.equal(deriveProjectWorkflow(finished().map((item) => ({ ...item, required: false, status: 'Not Needed' }))).all_required_done, false)
  assert.equal(deriveProjectWorkflow([]).all_required_done, false)
})

test('normalization recomputes workflow instead of trusting an incoming completed flag', () => {
  const project = normalizeProject({ id: 'fixture', workflow: { all_required_done: true }, work_items: finished().map((item) => item.workstream_type === 'cp' ? { ...item, status: 'For Client Review' } : item) })
  assert.equal(project.workflow.all_required_done, false)
  assert.equal(project.workflow.awaiting_client_count, 1)
})

test('workflow filters combine with search/status without conflating client waiting and completion', () => {
  const projects = [
    { id: 'done', project_no: 'P-1', client_name: 'Fictional Cedar', work_items: finished() },
    { id: 'waiting', project_no: 'P-2', client_name: 'Fictional Cedar', work_items: finished().map((item) => item.workstream_type === 'bp' ? { ...item, status: 'For Client Review' } : item) },
  ]
  assert.deepEqual(filterProjects(projects, { workflow: 'all_required_done' }).map(({ id }) => id), ['done'])
  assert.deepEqual(filterProjects(projects, { search: 'Cedar', status: 'For Client Review', workflow: 'awaiting_client' }).map(({ id }) => id), ['waiting'])
  assert.equal(filterProjects(projects, { search: 'P-1', workflow: 'awaiting_client' }).length, 0)
  assert.deepEqual(filterProjects(projects, { workflow: 'required_open' }).map(({ id }) => id), ['waiting'])
})

test('CP/BP return-to-drafting actions require a note and keep all other edit fields intact', () => {
  for (const type of ['cp', 'bp']) {
    for (const status of ['Waiting','In Progress','For Review','Revision Requested']) assert.equal(transitionNeedsReason(type, 'For Client Review', status), true)
    const item = { workstream_type: type, status: 'For Client Review', assignee_id: 'employee', due_date: '2026-11-01', queue_position: 1 }
    const draft = { status: 'Revision Requested', assignee_id: 'employee', required: true, priority_level: 'High', revision: 'B', notes: '', due_date: item.due_date, queue_position: 1 }
    assert.throws(() => workItemFields(item, draft), /reason/)
    const fields = workItemFields(item, { ...draft, change_note: 'Client requested a revised entry' })
    assert.equal(fields.revision, 'B')
    assert.equal(fields.assignee_id, 'employee')
    assert.equal(fields.due_date, item.due_date)
  }
  assert.equal(transitionNeedsReason('bp', 'For Client Review', 'Done'), false)
  assert.equal(transitionNeedsReason('kitchen', 'For Client Review', 'In Progress'), false)
  assert.equal(transitionNeedsReason('bp', 'Done', 'Revision Requested'), true)
})

test('client-review shortcuts support repeat cycles and do not introduce Kitchen/Takeoffs coupling', () => {
  assert.deepEqual(clientReviewActions('bp', 'For Client Review').map(({ status }) => status), ['Revision Requested','Done'])
  assert.deepEqual(clientReviewActions('cp', 'Revision Requested').map(({ status }) => status), ['In Progress','For Client Review'])
  assert.equal(clientReviewActions('bp', 'Done')[0].status, 'Revision Requested')
  assert.deepEqual(clientReviewActions('kitchen', 'Done'), [])
  assert.deepEqual(clientReviewActions('takeoffs', 'For Client Review'), [])
})
