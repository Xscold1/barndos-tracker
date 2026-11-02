import test from 'node:test'
import assert from 'node:assert/strict'
import { createProjectService, normalizeProject, projectError, projectFields } from '../features/projects/createProjectService.js'

const id = '20000000-0000-4000-8000-000000000001'

test('project fields trim identifiers, validate lengths and retain remarks', () => {
  assert.deepEqual(projectFields({ project_no: ' A-1 ', client_name: ' Client ', notes: 'Remarks\nSecond line' }), { project_no: 'A-1', client_name: 'Client', notes: 'Remarks\nSecond line' })
  assert.throws(() => projectFields({ project_no: ' ', client_name: 'Client' }), /project number/)
  assert.throws(() => projectFields({ project_no: 'A', client_name: ' ', notes: '' }), /client name/)
  assert.throws(() => projectFields({ project_no: 'A', client_name: 'Client', notes: 'a'.repeat(2001) }), /2,000/)
})

test('service sends one atomic create RPC with Not Needed selections and no client actor', async () => {
  const calls = []
  const service = createProjectService({ rpc(name, args) { calls.push({ name, args }); return { single: async () => ({ data: { id }, error: null }) } } })
  await service.createProject({ project_no: ' NEW-1 ', client_name: 'Client', not_needed_workstreams: ['kitchen'] })
  assert.deepEqual(calls, [{ name: 'create_project', args: { p_project_no: 'NEW-1', p_client_name: 'Client', p_notes: '', p_not_needed_workstreams: ['kitchen'] } }])
  assert.throws(() => service.createProject({ project_no: 'A', client_name: 'Client', not_needed_workstreams: ['invalid'] }), /valid workstreams/)
})

test('duplicate RPC errors are actionable and never fall back to fictional writes', async () => {
  const service = createProjectService({ rpc() { return { single: async () => ({ data: null, error: { code: '23505', message: 'internal detail' } }) } } })
  await assert.rejects(service.createProject({ project_no: 'A', client_name: 'Client' }), /already in use/)
  await assert.rejects(createProjectService(null).searchProjects(), /could not be loaded/)
  assert.match(projectError({ code: '40001' }, true).message, /reload/)
  assert.ok(!projectError({ message: 'private backend detail' }, true).message.includes('private backend detail'))
})

test('edits and archive requests carry expected versions and preserve explicit intent', async () => {
  const calls = []
  const service = createProjectService({ rpc(name, args) { calls.push({ name, args }); return { single: async () => ({ data: { id }, error: null }) } } })
  await service.updateProject(id, 3, { project_no: 'A', client_name: 'Client' })
  await service.setArchived(id, 4, true)
  await service.setArchived(id, 5, false)
  assert.equal(calls[0].args.p_expected_row_version, 3)
  assert.deepEqual(calls.slice(1).map(({ args }) => args.p_archived), [true, false])
  assert.throws(() => service.updateProject(id, undefined, { project_no: 'A', client_name: 'Client' }), /Reload/)
  assert.throws(() => service.setArchived(id, 1, 'true'), /whether/)
})

test('nested event IDs resolve to labels without changing independent revisions', () => {
  const project = normalizeProject({ id, work_items: [{ workstream_type: 'kitchen', revision: 'K-3', bp_reference: { revision_label: 'A' }, bp_reviewed: { revision_label: 'B' } }] })
  assert.equal(project.work_items[0].revision, 'K-3')
  assert.equal(project.work_items[0].bp_reference_revision, 'A')
  assert.equal(project.work_items[0].bp_reviewed_revision, 'B')
})

test('search RPC returns a bounded page and full totals; invalid detail IDs do not query', async () => {
  const calls = []
  const service = createProjectService({ rpc(name, args) {
    calls.push({ name, args })
    return Promise.resolve({ data: { projects: [{ id, work_items: [] }], total: 71, page: 2, page_size: 20, page_count: 4 }, error: null })
  } })
  const page = await service.searchProjects({ archive: 'archived', search: 'Cedar', page: 2 })
  assert.equal(page.projects.length, 1)
  assert.equal(page.total, 71)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].name, 'search_projects')
  assert.equal(calls[0].args.p_archive, 'archived')
  assert.equal(calls[0].args.p_query, 'Cedar')
  assert.equal(calls[0].args.p_page, 2)
  assert.equal(await service.getProject('old-mock-id'), null)
})
