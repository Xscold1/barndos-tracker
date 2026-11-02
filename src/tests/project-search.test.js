import test from 'node:test'
import assert from 'node:assert/strict'
import { projectQueryFromParams, projectSearchArgs } from '../features/projects/projectQuery.js'
import { createProjectService } from '../features/projects/createProjectService.js'

test('URL query retains combined filters, pages and Tennessee date-only ranges', () => {
  const query = projectQueryFromParams(new URLSearchParams('q=Cedar&stream=kitchen&status=For+Review&priority=High&from=2026-11-01&to=2026-11-05&bp_review=1&unassigned=1&page=3&size=10&view=all'))
  const args = projectSearchArgs(query)
  assert.equal(args.p_workstream, 'kitchen')
  assert.equal(args.p_needs_bp_review, true)
  assert.equal(args.p_due_from, '2026-11-01')
  assert.equal(args.p_page, 3)
  assert.equal(args.p_page_size, 10)
  assert.equal(args.p_archive, 'all')
})

test('date/employee conflicts reject before requests and bad page URL values normalize safely', async () => {
  assert.throws(() => projectSearchArgs({ dueFrom: '2026-02-29' }), /valid Tennessee/)
  assert.throws(() => projectSearchArgs({ dueFrom: '2026-11-05', dueTo: '2026-11-01' }), /on or before/)
  assert.throws(() => projectSearchArgs({ assignee: '10000000-0000-4000-8000-000000000001', unassigned: true }), /rather than both/)
  assert.equal(projectQueryFromParams(new URLSearchParams('page=-1&size=999&stream=bogus')).pageSize, 20)
  await assert.rejects(createProjectService(null).searchProjects({ dueFrom: 'invalid' }), /calendar dates/)
})

test('search is one abortable RPC with complete filter payload and authoritative totals', async () => {
  const controller = new AbortController()
  let sent, signal
  const service = createProjectService({ rpc(name, args) {
    sent = { name, args }
    const request = { abortSignal(value) { signal = value; return request }, then(resolve) { return Promise.resolve({ data: { projects: [], total: 0, page: 1, page_count: 1, page_size: 20 }, error: null }).then(resolve) } }
    return request
  } })
  const result = await service.searchProjects({ search: '%_', needsBpReview: true, signal: controller.signal })
  assert.equal(sent.name, 'search_projects')
  assert.equal(sent.args.p_query, '%_')
  assert.equal(sent.args.p_needs_bp_review, true)
  assert.equal(signal, controller.signal)
  assert.equal(result.total, 0)
  assert.deepEqual(result.projects, [])
})
