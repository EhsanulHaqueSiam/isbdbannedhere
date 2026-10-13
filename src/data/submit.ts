import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { categories, type Category } from './rows.ts'
import { get } from './index.ts'
import { normalizeUrl } from '../lib/url.ts'
import { snapVerdicts } from './snap.ts'
import { decode } from './watcher.ts'

// Reader receipts. A pasted link is stored in D1 (migrations/0001_receipts.sql) as pending and never changes a page
// on its own: the daily review checks the source and turns real ones into events in data/*.json.

/** The entry a receipt belongs to, for "added to <name>". */
export type Place = { key: string; name: string; href: string }
const place = (key: string | null): Place | null => {
  const [c, id] = key?.split('/') ?? []
  const item = c && id && (categories as readonly string[]).includes(c) ? get(c as Category, id) : undefined
  return item ? { key: `${c}/${id}`, name: item.name, href: item.href } : null
}

export type SubmitResult = { ok: true; duplicate: boolean; id: number; url: string; entity: Place | null } | { ok: false; error: 'invalid' | 'busy' | 'unavailable' }

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

    const added = await env.DB.prepare("INSERT OR IGNORE INTO receipts (url, entity, note, origin, ip_hash) VALUES (?1, ?2, ?3, 'reader', ?4)").bind(url, entity, data.note ?? null, who).run()
    if (!added.meta.changes) {
      const row = await env.DB.prepare('SELECT id, entity FROM receipts WHERE url = ?1').bind(url).first<{ id: number; entity: string | null }>()
      return { ok: true, duplicate: true, id: row?.id ?? 0, url, entity: place(row?.entity ?? entity) }
    }
    waitUntil(precheck(env, url).catch((e) => console.warn('[receipts] precheck failed', url, e)))
    return { ok: true, duplicate: false, id: added.meta.last_row_id, url, entity: place(entity) }
  })

type Env = (typeof import('cloudflare:workers'))['env']

/**
 * Reads the article and notes its title, publisher, date and what SubQ Snap says it reports for Bangladeshis, so the
 * review starts with a hint. Runs after the reader has their answer; it never sets the verdict.
 */
async function precheck(env: Env, url: string) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; isbdbannedhere receipts)' }, redirect: 'follow', signal: AbortSignal.timeout(8000) })
  if (!res.ok || !res.headers.get('content-type')?.includes('html')) return
  const html = (await res.text()).slice(0, 400_000)
  const meta = (p: string) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']+)`, 'i'))?.[1]
  const raw = meta('og:title') ?? html.match(/<title[^>]*>([^<]+)/i)?.[1]?.trim()
  const title = raw && decode(raw)
  const publisher = decode(meta('og:site_name') ?? new URL(url).hostname)
  const published = meta('article:published_time')?.slice(0, 10)
  const text = html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 40_000)
  const [verdict] = env.SUBQ_API_KEY ? await snapVerdicts(env.SUBQ_API_KEY, [`${title ?? ''}\n\n${text}`]).catch(() => [undefined]) : [undefined]
  await env.DB!.prepare('UPDATE receipts SET title = ?1, publisher = ?2, published = ?3, claimed_status = ?4 WHERE url = ?5')
    .bind(title ?? null, publisher, published ?? null, verdict ?? null, url)
    .run()
}

export type ReceiptStatus = { id: number; url: string; entity: Place | null; origin: string; verdict: 'pending' | 'verified' | 'rejected'; title: string | null; publisher: string | null; claimed: string | null; received: string }

/** Public status of one receipt for its tracking page. Never returns the reader's note or IP hash. */
export const getReceipt = createServerFn({ method: 'GET' })
  .validator((id: number) => Math.max(0, Math.floor(Number(id) || 0)))
  .handler(async ({ data: id }): Promise<ReceiptStatus | null> => {
    const { env } = await import('cloudflare:workers')
    if (!env.DB || !id) return null
    const r = await env.DB.prepare('SELECT id, url, entity, origin, verdict, title, publisher, claimed_status AS claimed, created_at AS received FROM receipts WHERE id = ?1').bind(id).first<Omit<ReceiptStatus, 'entity'> & { entity: string | null }>()
    return r ? { ...r, entity: place(r.entity) } : null
  })
