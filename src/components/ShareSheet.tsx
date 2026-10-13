import { useEffect, useRef, useState } from 'react'
import { toBlob } from 'html-to-image'
import type { Item } from '../data/index.ts'
import { TODAY } from '../data/today.ts'
import { caption, dict, fmtDate, type Lang } from '../lib/i18n.ts'
import { track } from '../lib/track.ts'
import { cardPath } from '../lib/site.ts'
import { formatSize, ShareCard, type Format } from './Card.tsx'

type Tab = 'story' | 'post' | 'video' | 'link'
const cardFormat: Record<Tab, Format> = { story: 'story', post: 'post', video: 'story', link: 'og' }

/** Scales a full-size card into a small preview box. */
export function Preview({ children, format, width }: { children: React.ReactNode; format: Format; width: number }) {
  const { w, h } = formatSize[format]
  const k = width / w
  return (
    <div style={{ width, height: h * k, overflow: 'hidden', flex: 'none', borderRadius: 8 }}>
      <div style={{ width: w, height: h, transform: `scale(${k})`, transformOrigin: '0 0' }}>{children}</div>
    </div>
  )
}

/** Prefer the prebuilt PNG; render the card on the phone if it isn't built yet. */
async function cardBlob(item: Item, format: Format, node: HTMLElement | null) {
  const res = await fetch(cardPath(item.category, item.id, format)).catch(() => null)
  if (res?.ok && res.headers.get('content-type')?.includes('image')) return res.blob()
  if (!node) return null
  const { w, h } = formatSize[format]
  return toBlob(node, { width: w, height: h, pixelRatio: 1, style: { transform: 'none' } })
}

export function ShareSheet({ item, lang, onClose }: { item: Item; lang: Lang; onClose: () => void }) {
  const t = dict[lang]
  const [tab, setTab] = useState<Tab>('story')
  const [note, setNote] = useState('')
  const [video, setVideo] = useState<string | null>(null)
  const full = useRef<HTMLDivElement>(null)
  const first = useRef<HTMLButtonElement>(null)
  const format = cardFormat[tab]
  const url = `${location.origin}${item.href}?s=${item.category}-${item.id}&f=${tab}`
  const text = caption(item.name, item.state.status, fmtDate(TODAY), url)

  useEffect(() => {
    first.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', esc)
    track('share_open', { card: `${item.category}/${item.id}` })
    const v = `/video/${item.category}-${item.id}.mp4`
    void fetch(v, { method: 'HEAD' }).then((r) => r.ok && r.headers.get('content-type')?.includes('video') && setVideo(v)).catch(() => {})
    return () => removeEventListener('keydown', esc)
  }, [item, onClose])

  const done = (channel: string) => track('share_done', { channel, format: tab, card: `${item.category}/${item.id}` })

  async function share() {
    if (tab === 'video' && video) {
      const blob = await (await fetch(video)).blob()
      const file = new File([blob], `isbdbannedhere-${item.id}.mp4`, { type: 'video/mp4' })
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text }).then(() => done('native')).catch(() => {})
      else save(blob, file.name)
      return
    }
    if (tab === 'link') {
      if (navigator.share) await navigator.share({ title: item.name, text, url }).then(() => done('native')).catch(() => {})
      else window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener')
      return
    }
    const blob = await cardBlob(item, format, full.current)
    if (!blob) return
    const file = new File([blob], `isbdbannedhere-${item.id}-${tab}.jpg`, { type: blob.type || 'image/jpeg' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text }).then(() => done('native')).catch(() => {})
      return
    }
    save(blob, file.name)
  }

  function save(blob: Blob, name: string) {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name })
    a.click()
    URL.revokeObjectURL(a.href)
    done('download')
  }

  async function download() {
    const blob = await cardBlob(item, format, full.current)
    if (blob) save(blob, `isbdbannedhere-${item.id}-${tab}.jpg`)
  }

  async function copy(what: 'caption' | 'link') {
    await navigator.clipboard.writeText(what === 'caption' ? text : url)
    setNote(t.copied)
    track(what === 'caption' ? 'caption_copy' : 'link_copy', { card: `${item.category}/${item.id}` })
    setTimeout(() => setNote(''), 1500)
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet pn" role="dialog" aria-modal="true" aria-label={t.shareTitle}>
        <div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--dd)', margin: '0 auto 12px' }} />
        <div className="row" style={{ border: 0, padding: 0 }}>
          <p className="an" style={{ fontSize: 24 }}>{t.shareTitle}</p>
          <button className="chip" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div style={{ display: 'flex', gap: 6, margin: '10px 0' }} role="tablist">
          {(['story', 'post', ...(video ? (['video'] as const) : []), 'link'] as const).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} className={`chip${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{t[k]}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {tab === 'video' && video ? <video src={video} width={130} autoPlay muted loop playsInline style={{ borderRadius: 8 }} /> : <Preview format={format} width={tab === 'link' ? 200 : 130}><ShareCard item={item} format={format} /></Preview>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, lineHeight: 1.4, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</p>
          </div>
        </div>
        <button ref={first} className="btn" onClick={share}>↗ {t.shareNow}</button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <button className="btn out" onClick={download}>{t.download}</button>
          <button className="btn out" onClick={() => copy('caption')}>{t.copyCaption}</button>
          <button className="btn out" onClick={() => copy('link')}>{t.copyLink}</button>
        </div>
        <p className="lab" style={{ marginTop: 10, minHeight: 14 }} aria-live="polite">{note}</p>
      </div>
      {/* full-size card used when there is no prebuilt PNG */}
      <div style={{ position: 'fixed', left: -99999, top: 0 }} aria-hidden="true">
        <div ref={full}><ShareCard item={item} format={format} /></div>
      </div>
    </>
  )
}
