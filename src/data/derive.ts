import { rowsByCategory, type Row } from './rows.ts'
import type { Entity, Event, Source } from './schema.ts'

export type Status = 'shut' | 'disputed' | 'restricted' | 'unclear' | 'reopened' | 'none'

// Worst first. An entity shows its worst row.
export const severity: Record<Status, number> = { shut: 5, disputed: 4, restricted: 3, unclear: 2, reopened: 1, none: 0 }

export type RowState = { status: Status; since?: string; until?: string; event?: Event }

// Active bans with no new event or check for this long turn Unclear.
const STALE_DAYS = 180

// '2025' -> '2025-01-01', '2025-12' -> '2025-12-01'
const start = (d: string) => (d.length === 4 ? `${d}-01-01` : d.length === 7 ? `${d}-01` : d)

// First day after a period: '2026-09' -> '2026-10-01'. An "until" date has passed once today reaches it.
export function after(d: string): string {
  if (d.length === 10) return d
  const [y = 0, m = 12] = d.split('-').map(Number)
  if (d.length === 4 || m === 12) return `${y + 1}-01-01`
  return `${y}-${String(m + 1).padStart(2, '0')}-01`
}

const days = (from: string, to: string) => (Date.parse(start(to)) - Date.parse(start(from))) / 86_400_000

const covers = (e: Event, row: Row) => e.rows.length === 0 || e.rows.includes(row)

/** Status of one row, replaying events up to `asOf` (inclusive). `today` drives the staleness rule. */
export function rowState(entity: Entity, row: Row, asOf: string): RowState {
  let s: RowState = { status: 'none' }
  const events = entity.events
    .map((e, i) => ({ e, i }))
    // 'unavailable' is a standing fact dated when we checked it, so it applies to every month.
    .filter(({ e }) => covers(e, row) && (e.action === 'unavailable' || start(e.date) <= asOf))
    .sort((a, b) => start(a.e.date).localeCompare(start(b.e.date)) || a.i - b.i)
  for (const { e } of events) {
    const until = e.until ?? undefined
    switch (e.action) {
      case 'unavailable':
      case 'paused':
        s = { status: 'shut', since: e.date, until, event: e }
        break
      case 'restricted':
        s = { status: 'restricted', since: e.date, until, event: e }
        break
      case 'extended':
        s = { ...s, status: s.status === 'restricted' ? 'restricted' : 'shut', until, event: e }
        break
      case 'reopened':
        s = { status: 'reopened', since: e.date, event: e }
        break
      case 'denied':
        if (s.status === 'shut' || s.status === 'restricted') s = { ...s, status: 'disputed', event: e }
        break
    }
  }
  const active = s.status === 'shut' || s.status === 'restricted'
  if (active && s.until && after(s.until) <= asOf) return { ...s, status: 'unclear' }
  if (active) {
    const last = [entity.checked, ...events.map(({ e }) => e.date)].filter(Boolean).sort().at(-1)
    if (last && days(last, asOf) > STALE_DAYS) return { ...s, status: 'unclear' }
  }
  return s
}

export type EntityState = { status: Status; rows: Partial<Record<Row, RowState>> }

export function entityState(entity: Entity, asOf: string): EntityState {
  const rows: Partial<Record<Row, RowState>> = {}
  let status: Status = 'none'
  for (const row of rowsByCategory[entity.category]) {
    const r = rowState(entity, row, asOf)
    rows[row] = r
    if (severity[r.status] > severity[status]) status = r.status
  }
  return { status, rows }
}

/** Last `n` months ending with the month of `today`, as 'YYYY-MM'. */
export function months(today: string, n = 13): string[] {
  const [y = 0, m = 1] = today.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const t = y * 12 + (m - 1) - (n - 1 - i)
    return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
  })
}

/** Entity status at the end of each month (today for the current month). */
export function monthStrip(entity: Entity, today: string, n = 13): Status[] {
  return months(today, n).map((mo) => {
    const end = after(mo)
    const asOf = end > today ? today : new Date(Date.parse(end) - 86_400_000).toISOString().slice(0, 10)
    return entityState(entity, asOf).status
  })
}

export type Confidence = { sources: number; best: Source['tier'] | null; lastSource?: string }

const tierRank = { official: 3, press: 2, community: 1 } as const

export function confidence(entity: Entity): Confidence {
  const urls = new Map<string, Source>()
  for (const e of entity.events) for (const s of e.sources) urls.set(s.url, s)
  let best: Source['tier'] | null = null
  let lastSource: string | undefined
  for (const s of urls.values()) {
    if (!best || tierRank[s.tier] > tierRank[best]) best = s.tier
    if (s.date && (!lastSource || s.date > lastSource)) lastSource = s.date
  }
  return { sources: urls.size, best, lastSource }
}
