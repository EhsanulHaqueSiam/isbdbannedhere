import { Link } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { submitReceipt, type SubmitResult } from '../data/submit.ts'
import { dict, type Lang } from '../lib/i18n.ts'
import { looksUnlikely } from '../lib/url.ts'
import { track } from '../lib/track.ts'
import { langParam } from '../lib/lang.ts'
import { Icon } from './ShareKit.tsx'
import { PostCard } from './Post.tsx'

type State = 'idle' | 'sending' | 'done' | 'duplicate' | Extract<SubmitResult, { ok: false }>['error']
type Sent = Extract<SubmitResult, { ok: true }>

/** Receipt ids this phone sent, newest first, for "your receipts". */
export const myReceipts = (): number[] => JSON.parse(localStorage.getItem('isbd:receipts') ?? '[]') as number[]
const remember = (id: number) => localStorage.setItem('isbd:receipts', JSON.stringify([id, ...myReceipts().filter((x) => x !== id)].slice(0, 50)))

const words = {
  en: {
    unlikely: { video: 'This looks like a video, not a news report. Receipts need an article or an official page.', social: 'This looks like a social post. Paste the article it links to instead; posts can be deleted.', short: 'This is a shortened link. Paste the full address so we know where it goes.', search: 'This is a search page, not an article.' },
    sendAnyway: 'Send anyway',
    unrelated: "Doesn't mention Bangladesh or Bangladeshis. Not queued.",
    wrongLink: 'Did you paste the right link?',
    tryAgain: 'Try again',
    reading: 'Reading the page…',
  },
  bn: {
    unlikely: { video: 'এটি ভিডিও মনে হচ্ছে, খবর নয়। প্রমাণের জন্য খবর বা অফিশিয়াল পেজ লাগবে।', social: 'এটি সোশ্যাল পোস্ট মনে হচ্ছে। যে খবরের লিংক আছে সেটি দিন; পোস্ট মুছে যেতে পারে।', short: 'এটি ছোট করা লিংক। পুরো ঠিকানা দিন, যেন বোঝা যায় কোথায় যায়।', search: 'এটি সার্চ পেজ, খবর নয়।' },
    sendAnyway: 'তবুও পাঠান',
    unrelated: 'বাংলাদেশ বা বাংলাদেশিদের কথা নেই। তালিকায় যায়নি।',
    wrongLink: 'ঠিক লিংকটি দিয়েছেন তো?',
    tryAgain: 'আবার চেষ্টা করুন',
    reading: 'পেজটি পড়া হচ্ছে…',
  },
} satisfies Record<Lang, unknown>

/**
 * Paste-a-link box, no sign-in. The link goes to the review queue, never straight onto a page.
 * `entity` ("category/id") ties it to the entry it was sent from. Three gates keep unrelated links out: a note right
 * after paste (looksUnlikely), "not queued" when the page doesn't mention Bangladesh (submit.ts), and the daily review.
 */
export function ReceiptForm({ lang, entity, title }: { lang: Lang; entity?: string; title?: string }) {
  const t = dict[lang]
  const w = words[lang]
  const id = useId()
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [state, setState] = useState<State>('idle')
  const [sent, setSent] = useState<Sent | null>(null)
  const [rejected, setRejected] = useState<Extract<SubmitResult, { ok: false; error: 'unrelated' }> | null>(null)
  const unlikely = looksUnlikely(url)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    setRejected(null)
    const r: SubmitResult = await submitReceipt({ data: { url, entity, note } }).catch(() => ({ ok: false, error: 'unavailable' }))
    setState(r.ok ? (r.duplicate ? 'duplicate' : 'done') : r.error)
    track('receipt_send', { entity, result: r.ok ? (r.duplicate ? 'duplicate' : 'ok') : r.error })
    if (r.ok) {
      setSent(r)
      if (r.id) remember(r.id)
      setUrl('')
      setNote('')
    } else if (r.error === 'unrelated') setRejected(r)
  }

  return (
    <form onSubmit={send}>
      <label htmlFor={id} className="an" style={{ display: 'block', fontSize: 26, marginBottom: 10 }}>{title ?? t.receiptTitle}</label>
      <input id={id} className="input" type="text" inputMode="url" autoComplete="url" required placeholder={t.receiptLink} value={url} onChange={(e) => { setUrl(e.target.value); setRejected(null) }} />
      {unlikely && <p className="warnline" role="status"><Icon name="warn" /><span>{w.unlikely[unlikely]}</span></p>}
      <input className="input" type="text" maxLength={500} style={{ marginTop: 8 }} placeholder={entity ? t.receiptNote : t.receiptWhere} aria-label={entity ? t.receiptNote : t.receiptWhere} value={note} onChange={(e) => setNote(e.target.value)} />
      <button className={`btn${unlikely ? ' out' : ''}`} disabled={state === 'sending'}>{state === 'sending' ? w.reading : unlikely ? w.sendAnyway : t.send}</button>
      {sent && (state === 'done' || state === 'duplicate') ? (
        <div className="sent" role="status">
          <PostCard url={sent.url} publisher={sent.publisher ?? new URL(sent.url).hostname} title={sent.title} date={sent.published} tier="reader" lang={lang} tag={`#${sent.id}`}>
            <p className="sen" style={{ marginTop: 2 }}>{t.receiptState[state]}</p>
            <p className="body" style={{ fontSize: 14 }}>
              {sent.entity ? <>{t.receiptFor} <a href={`${lang === 'bn' ? '/bn' : ''}${sent.entity.href}`} style={{ textDecoration: 'underline' }}>{sent.entity.name} →</a></> : t.receiptPlace}
            </p>
            <ol className="steps"><li className="on">{t.stepReceived}</li><li>{t.stepChecked}</li><li>{t.stepLive}</li></ol>
            <Link to="/{-$lang}/receipt/$id" params={{ lang: langParam(lang), id: String(sent.id) }} className="btn" style={{ marginTop: 10 }}>{t.track} →</Link>
          </PostCard>
        </div>
      ) : rejected ? (
        <div className="sent" role="status">
          <PostCard url={rejected.url} publisher={rejected.publisher} title={rejected.title} tier="reader" lang={lang} onPanel={false} claim={w.unrelated} status="none">
            <p className="lab">{w.wrongLink} <button type="button" className="lab" style={{ background: 'none', border: 0, textDecoration: 'underline', cursor: 'pointer', padding: 0 }} onClick={() => { setRejected(null); setState('idle') }}>{w.tryAgain}</button></p>
          </PostCard>
        </div>
      ) : (
        state !== 'idle' && state !== 'sending' && <p className="body" role="status" style={{ marginTop: 10 }}>{t.receiptState[state as Exclude<State, 'idle' | 'sending' | 'unrelated'>]}</p>
      )}
      <p className="lab" style={{ marginTop: 10 }}>{t.receiptHow}</p>
    </form>
  )
}
