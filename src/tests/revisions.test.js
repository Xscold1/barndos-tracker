import test from 'node:test'
import assert from 'node:assert/strict'
import { createRevisionService } from '../features/revisions/createRevisionService.js'
import { activityChanges } from '../features/activity/activityModel.js'

const item = { id: '30000000-0000-4000-8000-000000000104', row_version: 4, workstream_type: 'kitchen' }
const impact = { id: '50000000-0000-4000-8000-000000000001', row_version: 2 }
const basis = '40000000-0000-4000-8000-000000000002'

test('issuing sends only an explicit label, basis, note and expected version, without status/actor fields', async () => {
  let sent
  const service = createRevisionService({ rpc(name, args) { sent = { name, args }; return { single: async () => ({ data: { id: 'issued' }, error: null }) } } })
  await service.issueRevision(item, { revision_label: ' K-4 ', based_on_bp_revision_id: basis, notes: ' Issued drawing ', confirm_issued: true, status: 'Done', actor_id: 'spoof' })
  assert.deepEqual(sent, { name: 'issue_work_item_revision', args: { p_work_item_id: item.id, p_expected_row_version: 4, p_revision_label: 'K-4', p_based_on_bp_revision_id: basis, p_notes: 'Issued drawing' } })
  assert.throws(() => service.issueRevision(item, { revision_label: 'K-4', notes: 'Note' }), /Confirm this deliverable/)
  assert.throws(() => service.issueRevision(item, { revision_label: '', confirm_issued: true, notes: 'Note' }), /revision label/)
})

test('review carries independent impact and work-item versions, outcome and observations', async () => {
  let sent
  const service = createRevisionService({ rpc(name, args) { sent = { name, args }; return { single: async () => ({ data: { id: impact.id }, error: null }) } } })
  await service.reviewImpact(item, impact, { decision: 'No Changes Needed', notes: ' Checked BP B ', reviewed_by: 'spoof', revision: 'B', status: 'Done' })
  assert.deepEqual(sent, { name: 'review_bp_impact', args: { p_impact_id: impact.id, p_expected_impact_version: 2, p_expected_work_item_version: 4, p_decision: 'No Changes Needed', p_notes: 'Checked BP B' } })
  assert.throws(() => service.reviewImpact(item, impact, { decision: 'Needs Review', notes: 'Note' }), /outcome/)
  assert.throws(() => service.reviewImpact(item, impact, { decision: 'Changes Required', notes: ' ' }), /note/)
  assert.throws(() => service.reviewImpact({ ...item, row_version: 0 }, impact, { decision: 'Changes Required', notes: 'Note' }), /Reload/)
})

test('history read supports abort and returns all revision/impact records without fake fallbacks', async () => {
  const controller = new AbortController()
  let signal, sent
  const data = { events: Array.from({ length: 1001 }, (_, id) => ({ id })), impacts: [] }
  const service = createRevisionService({ rpc(name, args) { sent = { name, args }; const query = { abortSignal(value) { signal = value; return query }, then(resolve) { return Promise.resolve({ data, error: null }).then(resolve) } }; return query } })
  assert.equal((await service.listProjectRevisions('20000000-0000-4000-8000-000000000001', { signal: controller.signal })).events.length, 1001)
  assert.equal(sent.name, 'list_project_revisions')
  assert.equal(signal, controller.signal)
  await assert.rejects(createRevisionService(null).listProjectRevisions('missing'), /could not be loaded/)
})

test('duplicate/stale issue errors are actionable and do not expose backend messages', async () => {
  for (const [code, expected] of [['23505', /already been issued/], ['40001', /Cancel and reload/], ['42501', /employee access/]]) {
    const service = createRevisionService({ rpc() { return { single: async () => ({ data: null, error: { code, message: 'private backend value' } }) } } })
    await assert.rejects(service.issueRevision(item, { revision_label: 'K-4', notes: 'Note', confirm_issued: true }), expected)
  }
})

test('audit presentation distinguishes issued revisions, checked BP, reviewer and current/historical review scope', () => {
  const changes = activityChanges({ changes: {
    issued_revision_label: { old: null, new: 'B' }, bp_revision_checked: { old: null, new: 'B' },
    reviewer: { old: null, new: 'Aria Bennett' }, review_scope: { old: null, new: 'Current BP review' },
  } })
  assert.deepEqual(changes.map(({ label }) => label), ['Issued revision','BP revision checked','Reviewer','Review scope'])
  assert.equal(changes[2].after, 'Aria Bennett')
})
