import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getReceipt, type ReceiptStatus } from '../../../data/submit.ts'
import { myReceipts } from '../../../components/ReceiptForm.tsx'
import { PostCard } from '../../../components/Post.tsx'
import { CardFrame, CardIcon, FRAME_INNER, ORIGIN, mono, sans } from '../../../components/Card.tsx'
import { ToolShare } from '../../../components/ShareKit.tsx'
import { fitSize, num } from '../../../lib/captions.ts'
import { dict, fmtDate, headline, type Lang } from '../../../lib/i18n.ts'
import { langParam, useLang } from '../../../lib/lang.ts'

// Tracking page for one receipt: the link as a post, where it is in the review, what the first read found, and why
// it was not added. Rendered on request from D1 (not prerendered) and kept out of search results.
export const Route = createFileRoute('/{-$lang}/receipt/$id')({
  loader: ({ params }) => getReceipt({ data: Number(params.id) }),
  head: () => ({ meta: [{ title: 'Your receipt · Is BD banned here?' }, { name: 'robots', content: 'noindex' }] }),
  component: Receipt,
})

export const receiptWords = {
  en: { sent: 'I sent the receipt.', onPage: 'It is on the page.', share: 'Tell your group you sent it', cap: (n: string) => `I sent a receipt about ${n} to Is BD banned here? Send yours: `, title: 'Your receipt', missing: 'We could not find this receipt.', pending: 'Being checked. A new link is usually read within the hour; the page updates on its own.', verified: 'Checked and added. It is on the page now.', rejected: 'Checked, not added.', reason: 'Why', first: 'First read', mine: 'Your other receipts', from: 'From', watcher: 'watcher', reader: 'reader', live: 'Live', wait: 'Waiting', no: 'Not added', queue: 'See the whole queue' },
  bn: { sent: 'আমি প্রমাণ পাঠিয়েছি।', onPage: 'এখন পেজে আছে।', share: 'গ্রুপকে জানান যে আপনি পাঠিয়েছেন', cap: (n: string) => `${n} নিয়ে একটি প্রমাণ পাঠিয়েছি Is BD banned here?-এ। আপনারটাও পাঠান: `, title: 'আপনার প্রমাণ', missing: 'এই প্রমাণটি খুঁজে পাওয়া যায়নি।', pending: 'যাচাই চলছে। নতুন লিংক সাধারণত এক ঘণ্টার মধ্যে পড়া হয়; পেজ নিজে থেকেই বদলায়।', verified: 'যাচাই করে যোগ হয়েছে। এখন পেজে আছে।', rejected: 'যাচাই হয়েছে, যোগ হয়নি।', reason: 'কারণ', first: 'প্রাথমিক পাঠ', mine: 'আপনার অন্য প্রমাণ', from: 'পাঠিয়েছে', watcher: 'ওয়াচার', reader: 'পাঠক', live: 'পেজে', wait: 'অপেক্ষায়', no: 'যোগ হয়নি', queue: 'পুরো তালিকা দেখুন' },
} satisfies Record<Lang, unknown>

const claimed = { shut: 'shut', restricted: 'restricted', reopened: 'reopened', none: 'none' } as const
const stepOf = (r: ReceiptStatus) => (r.verdict === 'verified' ? 3 : r.verdict === 'rejected' ? 2 : 1)

/** One receipt as a post with its three steps. Shared by the tracking page and the public queue. */
export function ReceiptPost({ r, lang }: { r: ReceiptStatus; lang: Lang }) {
  const t = dict[lang], x = receiptWords[lang]
  const step = stepOf(r)
  const first = r.claimed && r.claimed in claimed ? headline[lang][r.claimed as keyof typeof claimed] : null
  return (
    <PostCard url={r.url} publisher={r.publisher ?? new URL(r.url).hostname.replace(/^www\./, '')} title={r.title} date={r.published ?? r.received.slice(0, 10)} tier={r.origin === 'watcher' ? 'watcher' : 'reader'} lang={lang} tag={`#${r.id}`}
      claim={r.verdict === 'rejected' ? `${x.rejected}${r.reason ? ` ${r.reason}` : ''}` : first ? `${x.first}: ${first}` : undefined}
      status={r.verdict === 'rejected' ? 'none' : (r.claimed as 'shut' | 'restricted' | 'reopened' | undefined) ?? undefined}>
      {r.entity && <p className="body" style={{ fontSize: 14 }}>{t.receiptFor} <a href={`${lang === 'bn' ? '/bn' : ''}${r.entity.href}`} style={{ textDecoration: 'underline' }}>{r.entity.name} →</a></p>}
      <ol className="steps"><li className="on">{t.stepReceived}</li><li className={step >= 2 ? 'on' : ''}>{t.stepChecked}</li><li className={step >= 3 ? 'on' : ''}>{t.stepLive}</li></ol>
      <p className="sen" style={{ fontSize: 14 }}>{r.verdict === 'rejected' ? x.rejected : x[r.verdict]}</p>
    </PostCard>
  )
}

/** "I sent the receipt." as a post-size card with the headline, where it went, and a QR to this page. */
function ReceiptShare({ r, lang }: { r: ReceiptStatus; lang: Lang }) {
  const x = receiptWords[lang]
  const url = `${ORIGIN}${lang === 'bn' ? '/bn' : ''}/receipt/${r.id}`
  const name = r.entity?.name ?? r.publisher ?? ''
  const title = r.title ?? r.url
  const big = r.verdict === 'verified' ? `${x.sent} ${x.onPage}` : x.sent
  const card = (
    <CardFrame url={url} lang={lang} green={r.verdict === 'verified'}>
      <p style={{ ...mono(30), display: 'flex', alignItems: 'center', gap: 16 }}>{r.claimed && r.claimed !== 'none' && <CardIcon status={r.claimed as 'shut' | 'restricted' | 'reopened'} size={44} />}{x.title} · #{num(r.id, lang)} · {fmtDate(r.received.slice(0, 10), lang)}</p>
      <p className="an" style={{ fontSize: fitSize(big, FRAME_INNER, 150, { lines: 3, min: 72 }), lineHeight: lang === 'bn' ? 1.2 : 0.95 }}>{big}</p>
      <p style={sans(fitSize(title, FRAME_INNER, 46, { lines: 4, face: 'sans', min: 30 }), 1.25)}>{title}</p>
      <p style={{ ...mono(28), textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>{r.publisher ?? ''}{r.entity ? ` → ${r.entity.name}` : ''}</p>
    </CardFrame>
  )
  return <ToolShare lang={lang} id={`receipt-${r.id}`} file={`isbd-receipt-${r.id}.png`} url={url} text={{ bn: `${receiptWords.bn.cap(name)}`, en: `${receiptWords.en.cap(name)}` }} card={card} />
}

function Receipt() {
  const r = Route.useLoaderData()
  const lang = useLang()
  const x = receiptWords[lang]
  const [mine, setMine] = useState<number[]>([])
  useEffect(() => setMine(myReceipts().filter((id) => id !== r?.id)), [r?.id])
  return (
    <section className="pad narrow">
      <p className="lab">{x.title}{r ? ` · #${r.id} · ${x.from} ${r.origin === 'watcher' ? x.watcher : x.reader} · ${fmtDate(r.received.slice(0, 10), lang)}` : ''}</p>
      {!r ? <p className="body" style={{ marginTop: 10 }}>{x.missing}</p> : (
        <>
          <ReceiptPost r={r} lang={lang} />
          <h2 className="an" style={{ fontSize: 22, marginTop: 24 }}>{x.share}</h2>
          <ReceiptShare r={r} lang={lang} />
        </>
      )}
      {mine.length > 0 && (
        <>
          <h2 className="an" style={{ fontSize: 22, marginTop: 24 }}>{x.mine}</h2>
          <p className="body" style={{ marginTop: 6 }}>{mine.map((id, k) => <span key={id}>{k ? ' · ' : ''}<Link to="/{-$lang}/receipt/$id" params={{ lang: langParam(lang), id: String(id) }} style={{ textDecoration: 'underline' }}>#{id}</Link></span>)}</p>
        </>
      )}
      <p className="lab" style={{ marginTop: 20 }}><Link to="/{-$lang}/receipts" params={{ lang: langParam(lang) }}>{x.queue} →</Link></p>
    </section>
  )
}
