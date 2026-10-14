import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { categories, type Category } from './rows.ts'
import { get } from './index.ts'
import { normalizeUrl } from '../lib/url.ts'
import { snapVerdicts } from './snap.ts'
// Server-only helpers, used inside handlers only, so the client bundle never pulls in cloudflare:workers.
import { mentionsBangladesh, readPage, type Page } from './page.ts'

// Reader receipts. A pasted link is stored in D1 (migrations/) as pending and never changes a page on its own: the
// daily review checks the source and turns real ones into events in data/*.json. Three gates keep unrelated links out:
// the form warns on video, social and shortened links (lib/url.ts looksUnlikely); submit reads the page and refuses
// one that never mentions Bangladesh (below); the review rejects the rest with a reason.

/** The entry a receipt belongs to, for "added to <name>". */
export type Place = { key: string; name: string; href: string }
const place = (key: string | null): Place | null => {
  const [c, id] = key?.split('/') ?? []
  const item = c && id && (categories as readonly string[]).includes(c) ? get(c as Category, id) : undefined
  return item ? { key: `${c}/${id}`, name: item.name, href: item.href } : null
}

export type SubmitResult =
  | { ok: true; duplicate: boolean; id: number; url: string; entity: Place | null; title: string | null; publisher: string | null; published: string | null }
  | { ok: false; error: 'invalid' | 'busy' | 'unavailable' }
  | { ok: false; error: 'unrelated'; url: string; title: string | null; publisher: string }

const PER_DAY = 10

async function sha256(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const submitReceipt = createServerFn({ method: 'POST' })
  .validator((d: { url: string; entity?: string; note?: string }) => ({
    url: String(d.url ?? '').slice(0, 2000),
    entity: d.entity ? String(d.entity).slice(0, 120) : undefined,
    note: d.note ? String(d.note).trim().slice(0, 500) : undefined,
  }))
  .handler(async ({ data }): Promise<SubmitResult> => {
    const url = normalizeUrl(data.url)
    if (!url) return { ok: false, error: 'invalid' }
    // "category/id" of an entry that exists, else none: readers can't invent entries.
    const [c, id] = data.entity?.split('/') ?? []
    const entity = c && id && (categories as readonly string[]).includes(c) && get(c as Category, id) ? `${c}/${id}` : null

    const { env, waitUntil } = await import('cloudflare:workers')
    if (!env.DB) return { ok: false, error: 'unavailable' }
    // Salted hash, never the raw IP: enough to rate-limit, useless to identify anyone.
    const who = await sha256(`${env.IP_SALT ?? ''}|${getRequestHeader('cf-connecting-ip') ?? 'local'}`)
    if (env.SUBMIT_LIMIT && !(await env.SUBMIT_LIMIT.limit({ key: who })).success) return { ok: false, error: 'busy' }
    const today = await env.DB.prepare("SELECT count(*) AS n FROM receipts WHERE ip_hash = ?1 AND created_at > datetime('now', '-1 day')").bind(who).first<{ n: number }>()
    if ((today?.n ?? 0) >= PER_DAY) return { ok: false, error: 'busy' }

    // Already have it? Say so before reading the page again.
    const dup = await env.DB.prepare('SELECT id, entity, title, publisher, published FROM receipts WHERE url = ?1').bind(url).first<{ id: number; entity: string | null; title: string | null; publisher: string | null; published: string | null }>()
    if (dup) return { ok: true, duplicate: true, id: dup.id, url, entity: place(dup.entity ?? entity), title: dup.title, publisher: dup.publisher, published: dup.published }

    // Read the page now (a few seconds): a link that never mentions Bangladesh is answered, not queued.
    const page = await readPage(url)
    if (page && !mentionsBangladesh(page)) return { ok: false, error: 'unrelated', url, title: page.title, publisher: page.publisher }

    const added = await env.DB.prepare("INSERT OR IGNORE INTO receipts (url, entity, note, origin, ip_hash, title, publisher, published) VALUES (?1, ?2, ?3, 'reader', ?4, ?5, ?6, ?7)")
      .bind(url, entity, data.note ?? null, who, page?.title ?? null, page?.publisher ?? null, page?.published ?? null)
      .run()
    if (!added.meta.changes) return { ok: true, duplicate: true, id: 0, url, entity: place(entity), title: page?.title ?? null, publisher: page?.publisher ?? null, published: page?.published ?? null }
    if (page && env.SUBQ_API_KEY) waitUntil(precheck(env, url, page).catch((e) => console.warn('[receipts] precheck failed', url, e)))
    return { ok: true, duplicate: false, id: added.meta.last_row_id, url, entity: place(entity), title: page?.title ?? null, publisher: page?.publisher ?? null, published: page?.published ?? null }
  })

type Env = (typeof import('cloudflare:workers'))['env']

/** SubQ Snap notes what the article reports for Bangladeshis, so the review starts with a hint. It never sets the verdict. */
async function precheck(env: Env, url: string, page: Page) {
  const [verdict] = await snapVerdicts(env.SUBQ_API_KEY!, [`${page.title ?? ''}\n\n${page.text}`])
  await env.DB!.prepare('UPDATE receipts SET claimed_status = ?1 WHERE url = ?2').bind(verdict ?? null, url).run()
}

export type ReceiptStatus = { id: number; url: string; entity: Place | null; origin: string; verdict: 'pending' | 'verified' | 'rejected'; title: string | null; publisher: string | null; published: string | null; claimed: string | null; reason: string | null; received: string }

const cols = 'id, url, entity, origin, verdict, title, publisher, published, claimed_status AS claimed, reason, created_at AS received'
type Row = Omit<ReceiptStatus, 'entity'> & { entity: string | null }
const pub = (r: Row): ReceiptStatus => ({ ...r, entity: place(r.entity) })

/** Public status of one receipt for its tracking page. Never returns the reader's note or IP hash. */
export const getReceipt = createServerFn({ method: 'GET' })
  .validator((id: number) => Math.max(0, Math.floor(Number(id) || 0)))
  .handler(async ({ data: id }): Promise<ReceiptStatus | null> => {
    const { env } = await import('cloudflare:workers')
    if (!env.DB || !id) return null
    const r = await env.DB.prepare(`SELECT ${cols} FROM receipts WHERE id = ?1`).bind(id).first<Row>().catch(() => null)
    return r ? pub(r) : null
  })

/** The public queue (/receipts): newest first, with counts per verdict. Same fields as the tracking page. */
export const listReceipts = createServerFn({ method: 'GET' })
  .validator((v: string) => (v === 'verified' || v === 'rejected' ? v : 'pending'))
  .handler(async ({ data: verdict }): Promise<{ verdict: string; counts: Record<string, number>; list: ReceiptStatus[] }> => {
    const empty = { verdict, counts: { pending: 0, verified: 0, rejected: 0 }, list: [] }
    const { env } = await import('cloudflare:workers')
    if (!env.DB) return empty
    // A missing table (migrations not applied yet) reads as an empty queue, not a broken page.
    const both = await Promise.all([
      env.DB.prepare('SELECT verdict, count(*) AS n FROM receipts GROUP BY verdict').all<{ verdict: string; n: number }>(),
      env.DB.prepare(`SELECT ${cols} FROM receipts WHERE verdict = ?1 ORDER BY id DESC LIMIT 60`).bind(verdict).all<Row>(),
    ]).catch((e: unknown) => (console.warn('[receipts] list failed', e), null))
    if (!both) return empty
    const [n, rows] = both
    return { verdict, counts: { ...empty.counts, ...Object.fromEntries(n.results.map((r) => [r.verdict, r.n])) }, list: rows.results.map(pub) }
  })
