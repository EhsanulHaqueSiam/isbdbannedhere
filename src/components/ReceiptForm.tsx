import { useId, useState } from 'react'
import { submitReceipt, type SubmitResult } from '../data/submit.ts'
import { dict, type Lang } from '../lib/i18n.ts'
import { track } from '../lib/track.ts'

type State = 'idle' | 'sending' | 'done' | 'duplicate' | Extract<SubmitResult, { ok: false }>['error']

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

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    const r: SubmitResult = await submitReceipt({ data: { url, entity, note } }).catch(() => ({ ok: false, error: 'unavailable' }))
    setState(r.ok ? (r.duplicate ? 'duplicate' : 'done') : r.error)
    track('receipt_send', { entity, result: r.ok ? (r.duplicate ? 'duplicate' : 'ok') : r.error })
    if (r.ok) {
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
      {state !== 'idle' && state !== 'sending' && <p className="body" role="status" style={{ marginTop: 10 }}>{t.receiptState[state]}</p>}
      <p className="lab" style={{ marginTop: 10 }}>{t.receiptHow}</p>
    </form>
  )
}
