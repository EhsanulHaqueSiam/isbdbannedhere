import { useEffect, useRef, useState } from 'react'
import type { Item } from '../data/index.ts'
import { TODAY } from '../data/today.ts'
import { dict, type Lang } from '../lib/i18n.ts'
import { track } from '../lib/track.ts'
import { cardPath } from '../lib/site.ts'
import { tracked } from '../lib/share.ts'
import { caption, groupCaption, shareText, tagOptions } from '../lib/captions.ts'
import { getMap, type CardMap } from '../data/api.ts'
import { formatSize, ORIGIN, ShareCard, topSource, type Format } from './Card.tsx'
import { CaptionBox, Channels, Icon, nodeBlob, useCaption, useSend, useToast } from './ShareKit.tsx'

type Tab = 'story' | 'post' | 'video' | 'link'
const cardFormat: Record<Tab, Format> = { story: 'story', post: 'post', video: 'story', link: 'og' }
const previewWidth: Record<Format, number> = { story: 150, post: 180, og: 280 }

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

/** Prefer the prebuilt image (pnpm cards writes English story and post cards); render the card on the phone otherwise. */
async function cardBlob(item: Item, format: Format, node: HTMLElement | null, lang: Lang) {
  if (lang === 'en' && format !== 'og') {
    const res = await fetch(cardPath(item.category, item.id, format)).catch(() => null)
    if (res?.ok && res.headers.get('content-type')?.includes('image')) return res.blob()
  }
  return nodeBlob(node, format)
}

// ORIGIN, not location: QuickShare renders on the server (prerender), where there is no location.
const entryUrl = (item: Item, lang: Lang) => `${ORIGIN}${lang === 'bn' ? '/bn' : ''}${item.href}`

export function ShareSheet({ item, lang, onClose }: { item: Item; lang: Lang; onClose: () => void }) {
  const t = dict[lang]
  const s = shareText[lang]
  const [tab, setTab] = useState<Tab>('story')
  const [video, setVideo] = useState<string | null>(null)
  const [map, setMap] = useState<CardMap | null>(null)
  const tags = tagOptions(item)
  const [picked, setPicked] = useState<string[]>(tags.slice(0, 1).map((x) => x.handle))
  const [friend, setFriend] = useState(false)
  const shown = useRef<HTMLDivElement>(null)
  const storyNode = useRef<HTMLDivElement>(null)
  const first = useRef<HTMLButtonElement>(null)
  const { toast, say } = useToast()
  const format = cardFormat[tab]
  const card = `${item.category}-${item.id}`
  const url = entryUrl(item, lang)
  const cap = useCaption((mode) => caption(item, { mode, asOf: TODAY, tags: picked, friend }), [picked.join(' '), friend])
  const send = useSend({ lang, text: cap.value, url, card, format: tab, say })
  const group = groupCaption(item, { asOf: TODAY, url: tracked(url, card, 'facebook'), source: topSource(item)?.publisher })

  useEffect(() => {
    first.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', esc)
    track('share_open', { card: `${item.category}/${item.id}` })
    const v = `/video/${item.category}-${item.id}.mp4`
    void fetch(v, { method: 'HEAD' }).then((r) => r.ok && r.headers.get('content-type')?.includes('video') && setVideo(v)).catch(() => {})
    if (!item.photo) void getMap({ data: item.country ?? '' }).then(setMap, () => {})
    return () => removeEventListener('keydown', esc)
  }, [item, onClose])

  const file = async (f: Format, node: HTMLElement | null) => {
    if (tab === 'video' && video) return new File([await (await fetch(video)).blob()], `isbdbannedhere-${item.id}.mp4`, { type: 'video/mp4' })
    const b = await cardBlob(item, f, node, lang)
    return b && new File([b], `isbdbannedhere-${item.id}-${f}.${b.type === 'image/png' ? 'png' : 'jpg'}`, { type: b.type || 'image/jpeg' })
  }
  // Instagram always gets the story (or the video); "More" and Download get what the tab shows.
  const story = () => file('story', tab === 'story' ? shown.current : storyNode.current)
  const current = () => file(format, shown.current)

  async function copyCaption() {
    await navigator.clipboard.writeText(`${cap.value}\n${tracked(url, card, 'copy')}`).catch(() => {})
    say(s.copied)
    track('caption_copy', { card: `${item.category}/${item.id}` })
  }

  const toggle = (h: string) => setPicked((p) => (p.includes(h) ? p.filter((x) => x !== h) : [...p, h]))

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet pn" role="dialog" aria-modal="true" aria-label={t.shareTitle}>
        <div className="grab" />
        <div className="row" style={{ border: 0, padding: 0 }}>
          <p className="an" style={{ fontSize: 24 }}>{t.shareTitle}</p>
          <button ref={first} type="button" className="chip" style={{ margin: 0 }} onClick={onClose}><span aria-hidden="true">✕</span> {s.close}</button>
        </div>
        <div style={{ display: 'flex', gap: 6, margin: '10px 0', flexWrap: 'wrap' }} role="tablist">
          {(['story', 'post', ...(video ? (['video'] as const) : []), 'link'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={`chip${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{t[k]}</button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {tab === 'video' && video ? (
            <video src={video} width={150} autoPlay muted playsInline style={{ borderRadius: 8 }} />
          ) : (
            <Preview format={format} width={previewWidth[format]}><div ref={shown}><ShareCard item={item} format={format} lang={lang} map={map} /></div></Preview>
          )}
        </div>
        <p className="lab" style={{ margin: '14px 0 6px' }}>{s.sendTo}</p>
        <Channels lang={lang} send={send} media={story} more={current} group={group} card={card} format={tab} nativeText={`${cap.value}\n${tracked(url, card, 'copy')}`} />
        <p className="lab" style={{ margin: '14px 0 6px' }}>{s.tagThem}</p>
        <div className="chips">
          {tags.map((x) => (
            <button key={x.handle} type="button" className={`chip${picked.includes(x.handle) ? ' on' : ''}`} style={{ margin: 0 }} aria-pressed={picked.includes(x.handle)} title={x.name} onClick={() => toggle(x.handle)}>@{x.handle}</button>
          ))}
          <button type="button" className={`chip${friend ? ' on' : ''}`} style={{ margin: 0 }} aria-pressed={friend} onClick={() => setFriend(!friend)}>{s.friend}</button>
        </div>
        <CaptionBox lang={lang} mode={cap.mode} setMode={cap.setMode} value={cap.value} onChange={cap.setValue} onCopy={() => void copyCaption()} />
      </div>
      {/* full-size story card for Instagram when another tab is showing */}
      <div style={{ position: 'fixed', left: -99999, top: 0 }} aria-hidden="true">
        <div ref={storyNode}>{tab !== 'story' && <ShareCard item={item} format="story" lang={lang} map={map} />}</div>
      </div>
      {toast}
    </>
  )
}

/**
 * The entry page's share row: WhatsApp, Facebook and Messenger in one tap, More opens the full sheet. `bar` pins it
 * to the bottom of the screen on phones; without it, it sits in the page (desktop).
 */
export function QuickShare({ item, lang, onMore, bar }: { item: Item; lang: Lang; onMore: () => void; bar?: boolean }) {
  const s = shareText[lang]
  const { toast, say } = useToast()
  const send = useSend({ lang, text: caption(item, { mode: 'bn', asOf: TODAY }), url: entryUrl(item, lang), card: `${item.category}-${item.id}`, format: 'link', say })
  return (
    <div className={bar ? 'qs qs-bar pn' : 'qs qs-inline'}>
      <p className="lab">{s.shareThis}</p>
      <div className="qs-row">
        {(['whatsapp', 'facebook', 'messenger'] as const).map((ch) => (
          <button key={ch} type="button" className={`chb ch-${ch}`} onClick={() => void send(ch)}><Icon name={ch} /><span>{s.channels[ch === 'facebook' ? 'fb' : ch]}</span></button>
        ))}
        <button type="button" className="chb ch-more" onClick={onMore}><Icon name="share" /><span>{s.more}</span></button>
      </div>
      {toast}
    </div>
  )
}
