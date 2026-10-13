import { test } from 'node:test'
import assert from 'node:assert/strict'
import { statusAfter, statusFor, verdict, week } from './tools.ts'
import type { Status } from './derive.ts'
import type { FeedEntry, Item } from './index.ts'

const it = (category: Item['category'], name: string, status: Status, rows: Item['state']['rows'] = {}, country = 'GB') =>
  ({ id: name.toLowerCase(), category, name, country, href: `/${category}/${name}`, state: { status, rows }, events: [] }) as unknown as Item

const items = [
  it('university', 'A', 'shut'),
  it('university', 'B', 'shut'),
  it('university', 'C', 'restricted'),
  it('university', 'D', 'none'),
  it('country', 'UK visas', 'restricted', { student: { status: 'none' }, work: { status: 'restricted' } }),
  it('city', 'London', 'shut', { visit: { status: 'shut' }, study: { status: 'none' } }),
  it('tourism', 'UK tourist visa', 'none'),
  it('university', 'Elsewhere', 'shut', {}, 'AU'),
]

test('a purpose only counts the rows it touches', () => {
  assert.equal(statusFor(items[4]!, 'study'), 'none')
  assert.equal(statusFor(items[4]!, 'work'), 'restricted')
  assert.equal(statusFor(items[5]!, 'visit'), 'shut')
  assert.equal(statusFor(items[6]!, 'work'), null)
})

test('study in the UK: universities plus the student visa and city study rows, other countries excluded', () => {
  const v = verdict(items, 'GB', 'study')
  assert.equal(v.total, 6)
  assert.deepEqual([v.worst, v.counts.shut, v.counts.restricted, v.counts.none], ['shut', 2, 1, 3])
  assert.equal(v.kind, 'university')
  assert.deepEqual(v.top.map((t) => t.name), ['A', 'B', 'C'])
})

test('visit the UK mixes a city and a visa, so the noun is "places"', () => {
  const v = verdict(items, 'GB', 'visit')
  assert.deepEqual([v.worst, v.total, v.kind], ['shut', 2, 'place'])
  assert.equal(verdict(items, 'FR', 'visit').total, 0)
})

const ev = (date: string, action: Item['events'][number]['action'], item: Item): FeedEntry => ({ item, event: { date, action, rows: [], summary: 's', sources: [{ url: 'https://x.test', publisher: 'P', tier: 'press' }] } })

test('the week keeps the last 7 days with a day, and groups same-day same-effect events by category', () => {
  const feed = [
    ev('2026-10-13', 'restricted', items[0]!),
    ev('2026-10-13', 'restricted', items[1]!),
    ev('2026-10-12', 'reopened', items[2]!),
    ev('2026-10-07', 'paused', items[3]!),
    ev('2026-10-06', 'paused', items[4]!),
    ev('2026-10', 'paused', items[5]!),
  ]
  const w = week(feed, '2026-10-13')
  assert.equal(w.from, '2026-10-07')
  assert.deepEqual(w.counts, { banned: 1, extended: 0, restricted: 2, reopened: 1 })
  assert.deepEqual(w.stories.map((s) => [s.date, s.status, s.items.length]), [['2026-10-13', 'restricted', 2], ['2026-10-12', 'reopened', 1], ['2026-10-07', 'shut', 1]])
})

test('an extended restriction stays restricted on the week slide', () => {
  const src = [{ url: 'https://x.test', publisher: 'P', tier: 'press' as const }]
  const events: Item['events'] = [
    { date: '2026-01-10', action: 'restricted', rows: ['student'], summary: '', sources: src },
    { date: '2026-09-30', action: 'extended', rows: ['student'], summary: '', sources: src },
  ]
  const au = { ...it('country', 'Australia', 'restricted'), events, aliases: [] } as Item
  assert.equal(statusAfter(au, events[1]!), 'restricted')
})
