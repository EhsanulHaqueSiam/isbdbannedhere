import { Link, createFileRoute } from '@tanstack/react-router'
import { listReceipts } from '../../data/submit.ts'
import { ReceiptForm } from '../../components/ReceiptForm.tsx'
import { ReceiptPost } from './receipt/$id.tsx'
import { num } from '../../lib/captions.ts'
import type { Lang } from '../../lib/i18n.ts'
import { langParam, useLang } from '../../lib/lang.ts'

// The public queue: every link readers and the watcher sent, as posts, newest first. Pending, added, not added.
// Links that never mention Bangladesh are refused at send (submit.ts) and never appear here. Rendered on request
// from D1, not prerendered (vite.config.ts filter), and kept out of search results.
export const Route = createFileRoute('/{-$lang}/receipts')({
  validateSearch: (s: Record<string, unknown>): { v?: 'verified' | 'rejected' } => (s.v === 'verified' || s.v === 'rejected' ? { v: s.v } : {}),
  loaderDeps: ({ search }) => ({ v: search.v ?? 'pending' }),
  loader: ({ deps }) => listReceipts({ data: deps.v }),
  head: () => ({ meta: [{ title: 'Receipts queue · Is BD banned here?' }, { name: 'robots', content: 'noindex' }] }),
  component: Receipts,
})

const words = {
  en: { title: 'Receipts', intro: 'Every link sent in, in the open. Someone reads each one; only real ones become events with a source.', pending: 'Pending', verified: 'Added', rejected: 'Not added', empty: 'Nothing here yet.' },
  bn: { title: 'প্রমাণ', intro: 'পাঠানো প্রতিটি লিংক, খোলাখুলি। প্রতিটি কেউ পড়ে; শুধু আসলগুলো সূত্রসহ ঘটনা হয়।', pending: 'অপেক্ষায়', verified: 'যোগ হয়েছে', rejected: 'যোগ হয়নি', empty: 'এখনও কিছু নেই।' },
} satisfies Record<Lang, unknown>

function Receipts() {
  const d = Route.useLoaderData()
  const lang = useLang()
  const w = words[lang]
  return (
    <section className="pad narrow">
      <h1 className="an" style={{ fontSize: 'clamp(40px, 11vw, 72px)' }}>{w.title}</h1>
      <p className="body" style={{ marginTop: 8 }}>{w.intro}</p>
      <div className="chips" style={{ marginTop: 14 }} role="tablist">
        {(['pending', 'verified', 'rejected'] as const).map((v) => (
          <Link key={v} to="/{-$lang}/receipts" params={{ lang: langParam(lang) }} search={v === 'pending' ? {} : { v }} role="tab" aria-selected={d.verdict === v} className={`chip${d.verdict === v ? ' on' : ''}`} style={{ margin: 0 }}>{w[v]} {num(d.counts[v] ?? 0, lang)}</Link>
        ))}
      </div>
      {d.list.length === 0 && <p className="body" style={{ marginTop: 14 }}>{w.empty}</p>}
      {d.list.map((r) => <ReceiptPost key={r.id} r={r} lang={lang} />)}
      <div style={{ marginTop: 28 }}><ReceiptForm lang={lang} /></div>
    </section>
  )
}
