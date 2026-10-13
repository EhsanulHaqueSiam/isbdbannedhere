import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { buildHubs, hubs, worst } from './hubs.ts'
import { confidence, entityState, monthStrip } from './derive.ts'
import { slugOf } from './rows-slug.ts'
import type { Entity } from './schema.ts'
import type { Item } from './index.ts'

const today = '2026-10-13'
const src = [{ url: 'https://example.com/a', publisher: 'Example', tier: 'press' as const }]
const ev = (action: Entity['events'][number]['action'], rows: string[] = []) => ({ date: '2026-09-01', action, rows, summary: 's', sources: src })
const item = (e: Omit<Entity, 'aliases'>): Item => {
  const full = { aliases: [], ...e }
  return { ...full, state: entityState(full, today), strip: monthStrip(full, today), conf: confidence(full), href: `/${slugOf[e.category]}/${e.id}` }
}

test('a hub shows its worst status', () => {
  assert.equal(worst(['reopened', 'restricted', 'shut', 'unclear']), 'shut')
  assert.equal(worst(['reopened', 'unclear']), 'unclear')
  assert.equal(worst(['reopened']), 'reopened')
  assert.equal(worst([]), 'none')
})

test('hubs: visas first, then cities; entries without events left out; counts in the sentence', () => {
  const [ae, ind] = buildHubs([
    item({ id: 'uni', category: 'university', name: 'Quiet U', country: 'AE', events: [] }),
    item({ id: 'dubai', category: 'city', name: 'Dubai', country: 'AE', events: [ev('paused')] }),
    item({ id: 'uae', category: 'country', name: 'UAE', country: 'AE', events: [ev('restricted', ['work'])] }),
    item({ id: 'uae', category: 'tourism', name: 'UAE', country: 'AE', events: [ev('paused')] }),
    item({ id: 'kolkata', category: 'city', name: 'Kolkata', country: 'IN', events: [ev('paused'), { ...ev('reopened'), date: '2026-10-01' }] }),
  ])
  assert.equal(ae?.slug, 'uae')
  assert.equal(ae?.status, 'shut')
  assert.deepEqual(ae?.groups.map((g) => [g.group, g.entries.map((e) => e.category)]), [['visa', ['country', 'tourism']], ['city', ['city']]])
  assert.deepEqual(ae?.groups[0]?.entries[0]?.rows, ['work'])
  assert.equal(ae?.text.en.sentence, '3 places in UAE: 2 shut out, 1 restricted.')
  assert.equal(ind?.status, 'reopened')
})

test('every hub slug is unique and free for a short link (/uae)', () => {
  const routes = readdirSync(new URL('../routes/{-$lang}/', import.meta.url)).map((f) => f.replace(/\.tsx$/, ''))
  const files = readdirSync(new URL('../../public/', import.meta.url))
  const taken = new Set([...routes, ...files, ...Object.values(slugOf), 'bn', 'og', 'badge', 'map.svg', 'assets', 'card'])
  const slugs = hubs.map((h) => h.slug)
  assert.equal(new Set(slugs).size, slugs.length)
  assert.deepEqual(slugs.filter((s) => taken.has(s)), [])
})
