import test from 'node:test'
import assert from 'node:assert/strict'
import { dashboardParamsAfter, dashboardViewFromParams } from '../features/dashboard/dashboardView.js'

const cp = [{ role: 'cp_drafter', is_default: true }]
const read = (query = '', roles = cp) => dashboardViewFromParams(new URLSearchParams(query), roles)

test('dashboard opens collapsed All Team for PM/no role and the relevant My Work card for every drafter', () => {
  for (const roles of [[], [{ role: 'admin_pm' }]]) {
    assert.equal(read('', roles).scope, 'team')
    assert.equal(read('', roles).workstream, null)
  }
  for (const [role, stream] of [['cp_drafter', 'cp'], ['bp_drafter', 'bp'], ['kitchen_drafter', 'kitchen'], ['quotation_takeoffs', 'takeoffs']]) {
    const view = read('', [{ role }])
    assert.equal(view.scope, 'mine')
    assert.equal(view.workstream, stream)
  }
  assert.equal(read('', [{ role: 'admin_pm' }, ...cp]).workstream, null)
  assert.equal(read('scope=mine&workstream=bp', [{ role: 'admin_pm' }, ...cp]).scope, 'team')
})

test('URL selections override preferences without restricting workstreams, and malformed values normalize', () => {
  assert.equal(read('scope=team&workstream=takeoffs').workstream, 'takeoffs')
  assert.equal(read('scope=team&workstream=takeoffs').scope, 'team')
  assert.equal(read('scope=mine&workstream=none').workstream, null)
  const view = read('scope=bad&workstream=quotation&filter=Done&cp_page=0&bp_page=1.5&takeoffs_page=99999999999')
  assert.equal(view.scope, 'mine')
  assert.equal(view.workstream, 'cp')
  assert.equal(view.filter, 'pending')
  assert.deepEqual(view.pages, { bp: 1, cp: 1, kitchen: 1, takeoffs: 1 })
})

test('card switching preserves independent pages and explicit collapse across refresh/detail return', () => {
  let params = new URLSearchParams('scope=team&workstream=bp&bp_page=3&kitchen_page=2')
  function change(action) { params = dashboardParamsAfter(params, dashboardViewFromParams(params, cp), action) }
  change({ type: 'select', workstream: 'kitchen' })
  assert.equal(dashboardViewFromParams(params, cp).page, 2)
  change({ type: 'select', workstream: 'bp' })
  assert.equal(dashboardViewFromParams(params, cp).page, 3)
  change({ type: 'select', workstream: 'bp' })
  assert.equal(dashboardViewFromParams(new URLSearchParams(params.toString()), cp).workstream, null)
  change({ type: 'select', workstream: 'bp' })
  change({ type: 'page', value: 1 })
  assert.equal(params.has('bp_page'), false)
  assert.equal(params.get('kitchen_page'), '2')
})

test('scope/filter changes reset pages without changing the selected card; server page correction affects only its card', () => {
  let params = new URLSearchParams('scope=team&workstream=cp&cp_page=4&bp_page=2')
  let view = dashboardViewFromParams(params, cp)
  params = dashboardParamsAfter(params, view, { type: 'scope', value: 'mine' })
  view = dashboardViewFromParams(params, cp)
  assert.equal(view.workstream, 'cp')
  assert.deepEqual(view.pages, { bp: 1, cp: 1, kitchen: 1, takeoffs: 1 })
  params.set('cp_page', '4'); params.set('bp_page', '2')
  params = dashboardParamsAfter(params, dashboardViewFromParams(params, cp), { type: 'page', value: 2 })
  assert.equal(params.get('cp_page'), '2')
  assert.equal(params.get('bp_page'), '2')
  params = dashboardParamsAfter(params, dashboardViewFromParams(params, cp), { type: 'filter', value: 'unassigned' })
  assert.equal(dashboardViewFromParams(params, cp).filter, 'unassigned')
  assert.equal(dashboardViewFromParams(params, cp).page, 1)
  assert.equal(params.has('bp_page'), false)
})
