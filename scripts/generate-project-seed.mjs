import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

// Regenerate from the original export without adding a CSV dependency.
const input = process.argv[2]
if (!input) throw new Error('Usage: node scripts/generate-project-seed.mjs <Project_List.csv>')
const csv = readFileSync(input, 'utf8').replace(/^\uFEFF/, '')
const records = []
let row = [], value = '', quoted = false
for (let i = 0; i < csv.length; i++) {
  const c = csv[i]
  if (c === '"') {
    if (quoted && csv[i + 1] === '"') { value += '"'; i++ }
    else quoted = !quoted
  } else if (!quoted && (c === ',' || c === '\n' || c === '\r')) {
    row.push(value); value = ''
    if (c !== ',') {
      if (row.some(Boolean)) records.push(row)
      row = []
      if (c === '\r' && csv[i + 1] === '\n') i++
    }
  } else value += c
}
if (quoted) throw new Error('Unclosed CSV quote')
if (value || row.length) { row.push(value); records.push(row) }
const headers = records.shift()
const rows = records.map(r => {
  if (r.length !== headers.length) throw new Error('CSV column count mismatch')
  return Object.fromEntries(headers.map((h, i) => [h, r[i]]))
})
const sql = value => value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const id = key => {
  const h = createHash('sha256').update(`barndos-project-list:${key}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
}
const employees = [
  ['patricia', 'Patricia', ['kitchen_drafter']],
  ['camille', 'Camille', ['bp_drafter']],
  ['emerson', 'Emerson', ['kitchen_drafter', 'cp_drafter']],
  ['bud', 'Bud', ['admin_pm']],
  ['shudneysantos', 'Shudney Santos', ['bp_drafter']],
  ['agnes', 'Agnes', ['cp_drafter']],
  ['angelo', 'Angelo', ['admin_pm']],
].map(([name, display, roles]) => ({ email: `${name}@barndosdirect.com`, display, roles, id: id(name) }))
const aliases = { 'agnesnabung11@gmail.com': 'agnes@barndosdirect.com', 'shudneysantos24@gmail.com': 'shudneysantos@barndosdirect.com' }
function assignee(email) {
  if (!email) return null
  const user = employees.find(e => e.email === (aliases[email] ?? email))
  if (!user) throw new Error(`Unknown employee: ${email}`)
  return user.id
}
const actor = employees.find(e => e.email === 'angelo@barndosdirect.com').id
const target = new URL('../supabase/seed.sql', import.meta.url)
let out = `-- Project_List.csv seed for a fresh local/development Supabase database after migrations.
-- Contains actual client data. Do not publish or apply to an existing production database.
-- Seven email/password accounts: temporary password Barndos123! (change before real use).
-- Only the seven requested actual users and their roles are seeded.
begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
set local search_path = public, extensions;

`
for (const e of employees) {
  out += `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', ${sql(e.id)}, 'authenticated', 'authenticated', ${sql(e.email)}, crypt('Barndos123!', gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('display_name', ${sql(e.display)}), now(), now());
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (${sql(id(`identity:${e.email}`))}, ${sql(e.id)}, ${sql(e.id)}, jsonb_build_object('sub', ${sql(e.id)}, 'email', ${sql(e.email)}, 'email_verified', true, 'phone_verified', false), 'email', now(), now(), now());
insert into public.profiles (id, display_name) values (${sql(e.id)}, ${sql(e.display)});
insert into public.user_roles (user_id, role, is_default) values
${e.roles.map((r, i) => `  (${sql(e.id)}, ${sql(r)}, ${i === 0})`).join(',\n')};

`
}
const statusMap = { '': 'Waiting', Waiting: 'Waiting', Done: 'Done', 'On Going': 'In Progress', 'For Revision': 'Revision Requested', 'Not Needed': 'Not Needed', 'Initial FP': 'In Progress', 'Take offs': 'Waiting' }
const numbers = new Set()
for (const r of rows) {
  const sourceNumber = r['Project No'].trim()
  const duplicated = sourceNumber && rows.filter(other => other['Project No'].trim() === sourceNumber).length > 1
  const suffix = duplicated ? `-${r.Projects.split(' - ').at(-1).trim().toUpperCase()}` : ''
  const number = sourceNumber ? `${sourceNumber}${suffix}` : `CSV-${r.Projects.toUpperCase().replaceAll(/[^A-Z0-9]+/g, '-')}`
  if (numbers.has(number.toLowerCase())) throw new Error(`Duplicate project number: ${number}`)
  numbers.add(number.toLowerCase())
  if (!r.Projects.trim()) throw new Error('Missing client name')
  if (r['Due Date']) throw new Error('Review deadline mapping before importing dated rows')
  const projectId = id(`project:${number}`)
  out += `-- ${number}: ${r.Projects.replaceAll(/[\r\n]/g, ' ')}
insert into public.projects (id, project_no, client_name, notes, created_by, updated_by)
values (${sql(projectId)}, ${sql(number)}, ${sql(r.Projects)}, ${sql(`Imported from Project_List.csv. Original row: ${JSON.stringify(r)}`)}, ${sql(actor)}, ${sql(actor)});
`
  const streams = [
    ['quotation', r['Quote Status'], null, null],
    ['cp', r['CP Status'], r['Concept Plan Assignee'], r['Rev - CP']],
    ['bp', r['BP Status'], r['Blueprint Assignee'], r['Rev - BP']],
    ['kitchen', r['Kitchen Status'], null, null],
    ['takeoffs', 'Waiting', null, null],
  ]
  for (const [stream, rawStatus, email, revision] of streams) {
    const status = statusMap[rawStatus]
    if (!status) throw new Error(`Unknown status: ${rawStatus}`)
    const required = status === 'Not Needed' ? 'false' : stream === 'quotation' ? 'null' : 'true'
    out += `insert into public.work_items (id, project_id, workstream_type, status, required, assignee_id, revision, notes, created_by, updated_by)
values (${sql(id(`work:${number}:${stream}`))}, ${sql(projectId)}, ${sql(stream)}, ${sql(status)}, ${required}, ${sql(assignee(email))}, ${sql(revision || null)}, ${sql(stream === 'takeoffs' ? 'No independent Takeoffs status or assignment in source; needs confirmation.' : `Source status: ${rawStatus || '(blank)'}`)}, ${sql(actor)}, ${sql(actor)});
`
  }
  out += `insert into public.activity_logs (project_id, actor_id, operation, changes, worknote)
values (${sql(projectId)}, ${sql(actor)}, 'project_created', jsonb_build_object('source', 'Project_List.csv'), 'Imported source snapshot; original editor/time and all source fields are preserved in project notes.');

`
}
out += 'commit;\n'
writeFileSync(target, out)
console.log(`Generated seed: ${rows.length} projects, ${rows.length * 5} work items, ${employees.length} new accounts; only actual users included.`)
