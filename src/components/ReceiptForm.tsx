import { Link } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { submitReceipt, type SubmitResult } from '../data/submit.ts'
import { dict, type Lang } from '../lib/i18n.ts'
import { track } from '../lib/track.ts'
import { langParam } from '../lib/lang.ts'

type State = 'idle' | 'sending' | 'done' | 'duplicate' | Extract<SubmitResult, { ok: false }>['error']
type Sent = Extract<SubmitResult, { ok: true }>

/** Receipt ids this phone sent, newest first, for "your receipts". */
export const myReceipts = (): number[] => JSON.parse(localStorage.getItem('isbd:receipts') ?? '[]') as number[]
const remember = (id: number) => localStorage.setItem('isbd:receipts', JSON.stringify([id, ...myReceipts().filter((x) => x !== id)].slice(0, 50)))

/**
 * Paste-a-link box, no sign-in. The link goes to the review queue, never straight onto a page.
 * `entity` ("category/id") ties it to the entry it was sent from.
 */
export function ReceiptForm({ lang, entity }: { lang: Lang; entity?: string }) {
  const t = dict[lang]
  const id = useId()
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [state, setState] = useState<State>('idle')
  const [sent, setSent] = useState<Sent | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    const r: SubmitResult = await submitReceipt({ data: { url, entity, note } }).catch(() => ({ ok: false, error: 'unavailable' }))
    setState(r.ok ? (r.duplicate ? 'duplicate' : 'done') : r.error)
    track('receipt_send', { entity, result: r.ok ? (r.duplicate ? 'duplicate' : 'ok') : r.error })
    if (r.ok) {
      setSent(r)
      if (r.id) remember(r.id)
      setUrl('')
      setNote('')
    }
  }

  return (
    <form onSubmit={send}>
      <label htmlFor={id} className="an" style={{ display: 'block', fontSize: 26, marginBottom: 10 }}>{t.receiptTitle}</label>
      <input id={id} className="input" type="text" inputMode="url" autoComplete="url" required placeholder={t.receiptLink} value={url} onChange={(e) => setUrl(e.target.value)} />
      <input className="input" type="text" maxLength={500} style={{ marginTop: 8 }} placeholder={entity ? t.receiptNote : t.receiptWhere} aria-label={entity ? t.receiptNote : t.receiptWhere} value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="btn" disabled={state === 'sending'}>{state === 'sending' ? t.sending : t.send}</button>
      {sent && (state === 'done' || state === 'duplicate') ? (
        <div className="pn sent" role="status">
          <p className="lab">{t.receiptAdded} · #{sent.id}</p>
          <p className="ttl" style={{ marginTop: 4 }}>{t.receiptState[state]}</p>
          <p className="body" style={{ fontSize: 13, marginTop: 6, wordBreak: 'break-all' }}>{sent.url}</p>
          <p className="body" style={{ fontSize: 14, marginTop: 6 }}>
            {sent.entity ? <>{t.receiptFor} <a href={`${lang === 'bn' ? '/bn' : ''}${sent.entity.href}`} style={{ textDecoration: 'underline' }}>{sent.entity.name} →</a></> : t.receiptPlace}
          </p>
          <ol className="steps"><li className="on">{t.stepReceived}</li><li>{t.stepChecked}</li><li>{t.stepLive}</li></ol>
          <Link to="/{-$lang}/receipt/$id" params={{ lang: langParam(lang), id: String(sent.id) }} className="btn" style={{ marginTop: 10 }}>{t.track} →</Link>
        </div>
      ) : (
        state !== 'idle' && state !== 'sending' && <p className="body" role="status" style={{ marginTop: 10 }}>{t.receiptState[state]}</p>
      )}
      <p className="lab" style={{ marginTop: 10 }}>{t.receiptHow}</p>
    </form>
  )
}
