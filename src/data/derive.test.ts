import { test } from 'node:test'
import assert from 'node:assert/strict'
import { after, entityState, monthStrip, months, rowState } from './derive.ts'
import type { Entity } from './schema.ts'

const src = [{ url: 'https://example.com/a', publisher: 'X', tier: 'press' as const }]
const uni = (events: Entity['events'], checked = '2026-10-13'): Entity => ({
  id: 'u', category: 'university', name: 'U', aliases: [], checked, events,
})

test('after() gives the first day past a period', () => {
  assert.equal(after('2026-09'), '2026-10-01')
  assert.equal(after('2026-12'), '2027-01-01')
  assert.equal(after('2026'), '2027-01-01')
})

test('a pause shuts all rows when rows is empty', () => {
  const e = uni([{ date: '2025-12', action: 'paused', rows: [], summary: '', sources: src }])
  assert.equal(entityState(e, '2026-10-13').status, 'shut')
  assert.equal(rowState(e, 'phd', '2026-10-13').status, 'shut')
})

test('a pause past its end date turns unclear, not reopened', () => {
  const e = uni([{ date: '2025-12', action: 'paused', rows: ['bachelors'], until: '2026-09', summary: '', sources: src }])
  assert.equal(rowState(e, 'bachelors', '2026-09-30').status, 'shut')
  assert.equal(rowState(e, 'bachelors', '2026-10-13').status, 'unclear')
  assert.equal(rowState(e, 'masters', '2026-10-13').status, 'none')
})

test('a denial makes an active ban disputed', () => {
  const e = uni([
    { date: '2025-09', action: 'paused', rows: [], summary: '', sources: src },
    { date: '2025-09', action: 'denied', rows: [], summary: '', sources: src },
  ])
  assert.equal(entityState(e, '2026-10-13').status, 'disputed')
})

test('reopened wins over an earlier ban', () => {
  const e = uni([
    { date: '2024-01', action: 'unavailable', rows: [], summary: '', sources: src },
    { date: '2026-03', action: 'reopened', rows: [], summary: '', sources: src },
  ])
  assert.equal(entityState(e, '2026-10-13').status, 'reopened')
})

test('stale bans turn unclear after 180 days without a check or event', () => {
  const e = uni([{ date: '2025-01', action: 'paused', rows: [], summary: '', sources: src }], '2025-01-10')
  assert.equal(entityState(e, '2026-10-13').status, 'unclear')
})

test('unavailable covers every month, not just the month it was checked', () => {
  const e = uni([{ date: '2026-10-13', action: 'unavailable', rows: [], summary: '', sources: src }])
  assert.ok(monthStrip(e, '2026-10-13', 13).every((s) => s === 'shut'))
})

test('month strip replays history', () => {
  assert.deepEqual(months('2026-10-13', 3), ['2026-08', '2026-09', '2026-10'])
  const e = uni([{ date: '2025-12', action: 'paused', rows: [], summary: '', sources: src }])
  assert.deepEqual(monthStrip(e, '2026-10-13', 13).slice(0, 3), ['none', 'none', 'shut'])
})
