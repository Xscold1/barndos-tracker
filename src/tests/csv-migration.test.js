import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv, planMigration, migrationSql } from '../../scripts/migrate-project-list.mjs'

const source = { Projects: "O'Brien", 'Project No': '123', 'CP Status': 'Done', 'BP Status': 'On Going', 'Kitchen Status': 'Not Needed', 'Quote Status': 'Waiting' }
test('CSV supports BOM, CRLF, quoted commas, newlines and escaped quotes', () => {
  assert.deepEqual(parseCsv('\uFEFFa,b\r\n"x,y","a""b\nc"\r\n'), [{ a: 'x,y', b: 'a"b\nc' }])
  assert.throws(() => parseCsv('a,b\nx'))
  assert.throws(() => parseCsv('a\n"x'))
})
test('migration blocks duplicate/missing numbers, unknown statuses and unmapped employees', () => {
  const plan = planMigration([source, source, { ...source, 'Project No': '', 'CP Status': 'Take offs', 'Blueprint Assignee': 'a@example.com' }])
  assert.equal(plan.errors.length, 4)
  assert.throws(() => migrationSql(plan))
})
test('review decisions resolve ambiguity; generated SQL uses audited RPCs and escapes data', () => {
  const plan = planMigration([{ ...source, 'CP Status': 'Initial FP' }], { rows: { 2: { statuses: { cp: 'Waiting' } } } })
  assert.deepEqual(plan.errors, [])
  assert.equal(plan.projects[0].items[2].status, 'In Progress')
  const sql = migrationSql(plan)
  assert.match(sql, /O''Brien/)
  assert.equal((sql.match(/PERFORM public.schedule_work_item/g) ?? []).length, 5)
  assert.match(sql, /INTO STRICT project_id_var/)
  assert.match(sql, /BEGIN;/)
  assert.match(sql, /COMMIT;/)
  assert.doesNotMatch(sql, /ON CONFLICT|UPDATE public|INSERT INTO auth/)
})
