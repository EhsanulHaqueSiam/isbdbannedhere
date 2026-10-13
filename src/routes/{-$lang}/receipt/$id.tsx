import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getReceipt } from '../../../data/submit.ts'
import { myReceipts } from '../../../components/ReceiptForm.tsx'
import { dict, fmtDate, headline } from '../../../lib/i18n.ts'
import { langParam, useLang } from '../../../lib/lang.ts'

// Tracking page for one receipt: where it is in the review, what the first read found, and where it goes live.
// Rendered on request from D1 (not prerendered) and kept out of search results.
export const Route = createFileRoute('/{-$lang}/receipt/$id')({
  loader: ({ params }) => getReceipt({ data: Number(params.id) }),
  head: () => ({ meta: [{ title: 'Your receipt · Is BD banned here?' }, { name: 'robots', content: 'noindex' }] }),
  component: Receipt,
})

const text = {
  en: { title: 'Your receipt', missing: 'We could not find this receipt.', pending: 'Waiting for review. We check new links every morning.', verified: 'Checked and added. It is on the page now.', rejected: 'Checked, not added: the source did not report a ban on Bangladeshis we could confirm.', first: 'First read', mine: 'Your other receipts', from: 'From', watcher: 'the news watcher', reader: 'a reader' },
  bn: { title: 'আপনার প্রমাণ', missing: 'এই প্রমাণটি খুঁজে পাওয়া যায়নি।', pending: 'যাচাইয়ের অপেক্ষায়। প্রতিদিন সকালে নতুন লিংক দেখা হয়।', verified: 'যাচাই করে যোগ হয়েছে। এখন পেজে আছে।', rejected: 'যাচাই হয়েছে, যোগ হয়নি: সূত্রে বাংলাদেশিদের ওপর নিশ্চিত কোনো নিষেধাজ্ঞা পাওয়া যায়নি।', first: 'প্রাথমিক পাঠ', mine: 'আপনার অন্য প্রমাণ', from: 'পাঠিয়েছে', watcher: 'নিউজ ওয়াচার', reader: 'একজন পাঠক' },
}
const claimed = { shut: 'shut', restricted: 'restricted', reopened: 'reopened', none: 'none' } as const

function Receipt() {
  const r = Route.useLoaderData()
  const lang = useLang()
  const t = dict[lang], x = text[lang]
  const [mine, setMine] = useState<number[]>([])
  useEffect(() => setMine(myReceipts().filter((id) => id !== r?.id)), [r?.id])
  const step = r?.verdict === 'verified' ? 3 : r?.verdict === 'rejected' ? 2 : 1
  return (
    <section className="pad narrow">
      <p className="lab">{x.title}{r ? ` · #${r.id}` : ''}</p>
      {!r ? (
        <p className="body" style={{ marginTop: 10 }}>{x.missing}</p>
      ) : (
        <>
          <h1 className="an" style={{ fontSize: 'clamp(30px, 8vw, 52px)', marginTop: 8 }}>{r.title ?? r.publisher ?? r.url}</h1>
          <p className="body" style={{ marginTop: 8, wordBreak: 'break-all' }}><a href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>{r.url} ↗</a></p>
          <ol className="steps" style={{ marginTop: 14 }}>
            <li className="on">{t.stepReceived} · {fmtDate(r.received.slice(0, 10), lang)}</li>
            <li className={step >= 2 ? 'on' : ''}>{t.stepChecked}</li>
            <li className={step >= 3 ? 'on' : ''}>{t.stepLive}</li>
          </ol>
          <p className="ttl" style={{ marginTop: 12 }}>{x[r.verdict]}</p>
          {r.entity && <p className="body" style={{ marginTop: 8 }}>{t.receiptFor} <a href={`${lang === 'bn' ? '/bn' : ''}${r.entity.href}`} style={{ textDecoration: 'underline' }}>{r.entity.name} →</a></p>}
          {r.claimed && r.claimed in claimed && <p className="lab" style={{ marginTop: 10 }}>{x.first}: {headline[lang][r.claimed === 'none' ? 'none' : (r.claimed as 'shut' | 'restricted' | 'reopened')]}</p>}
          <p className="lab" style={{ marginTop: 6 }}>{x.from} {r.origin === 'watcher' ? x.watcher : x.reader}</p>
        </>
      )}
      {mine.length > 0 && (
        <>
          <h2 className="an" style={{ fontSize: 22, marginTop: 24 }}>{x.mine}</h2>
          <p className="body" style={{ marginTop: 6 }}>{mine.map((id, k) => <span key={id}>{k ? ' · ' : ''}<Link to="/{-$lang}/receipt/$id" params={{ lang: langParam(lang), id: String(id) }} style={{ textDecoration: 'underline' }}>#{id}</Link></span>)}</p>
        </>
      )}
    </section>
  )
}
