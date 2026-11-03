import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('seed creates Auth users before profiles and profiles before all role assignments', () => {
  const seed = readFileSync(new URL('../../supabase/seed.sql', import.meta.url), 'utf8')
  const accounts = seed.slice(0, seed.indexOf('insert into public.projects'))
  const users = new Set()
  const profiles = new Set()
  let roleCount = 0
  for (const match of accounts.matchAll(/insert into (auth\.users|public\.profiles|public\.user_roles) \(([^)]+)\)\s*values\s*([\s\S]*?);/g)) {
    const [, table, columns, values] = match
    const idIndex = columns.split(',').map(c => c.trim()).indexOf(table === 'public.user_roles' ? 'user_id' : 'id')
    for (const tuple of values.matchAll(/(?:^|\n)\s*\(([^\n]+)/g)) {
      const uuid = tuple[1].split(',')[idIndex].trim().replaceAll("'", '')
      if (table === 'auth.users') {
        assert.ok(!users.has(uuid), `Duplicate Auth user ${uuid}`)
        users.add(uuid)
      } else if (table === 'public.profiles') {
        assert.ok(users.has(uuid), `Profile ${uuid} must have an earlier Auth user`)
        profiles.add(uuid)
      } else {
        assert.ok(profiles.has(uuid), `Role ${uuid} must have an earlier profile`)
        roleCount++
      }
    }
  }
  assert.doesNotMatch(accounts, /barndos-demo\.invalid|10000000-0000-4000-8000-/)
  assert.equal(users.size, 7)
  assert.equal(profiles.size, 7)
  assert.equal(roleCount, 8)
})
