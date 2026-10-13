import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { type } from 'arktype'
import { Entity, VisaFree } from './schema.ts'
import { rowsByCategory } from './rows.ts'

// The app skips invalid entries with a warning; here they fail loudly, so a bad row never ships silently.
const dir = new URL('../../data/', import.meta.url)
const files = readdirSync(dir).filter((f) => f.endsWith('.json'))

test('every data file validates, ids are unique, rows exist for their category', () => {
  const problems: string[] = []
  const seen = new Set<string>()
  for (const f of files) {
    const json: unknown = JSON.parse(readFileSync(new URL(f, dir), 'utf8'))
    if (f === 'visa-free.json') {
      const v = VisaFree(json)
      if (v instanceof type.errors) problems.push(`${f}: ${v.summary}`)
      continue
    }
    for (const raw of json as unknown[]) {
      const e = Entity(raw)
      if (e instanceof type.errors) { problems.push(`${f} ${(raw as { id?: string }).id}: ${e.summary}`); continue }
      const key = `${e.category}/${e.id}`
      if (seen.has(key)) problems.push(`${f}: duplicate ${key}`)
      seen.add(key)
      const rows: readonly string[] = rowsByCategory[e.category]
      for (const ev of e.events) for (const r of ev.rows) if (!rows.includes(r)) problems.push(`${f} ${key}: unknown row "${r}" (has ${rows.join(', ')})`)
    }
  }
  assert.deepEqual(problems, [])
})

test('the app loads every data file (index.ts imports them by name)', async () => {
  const { items } = await import('./index.ts')
  const onDisk = files.filter((f) => f !== 'visa-free.json').flatMap((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as unknown[])
  assert.equal(items.length, onDisk.length)
})
