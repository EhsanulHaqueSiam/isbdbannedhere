import { useEffect, useRef, useState } from 'react'
import type { Item } from '../data/index.ts'
import { TODAY } from '../data/today.ts'
import { dict, type Lang } from '../lib/i18n.ts'
import { track } from '../lib/track.ts'
import { tracked, type Channel } from '../lib/share.ts'
import { caption, groupCaption, shareText, tagOptions } from '../lib/captions.ts'
import { formatSize, ORIGIN, ShareCard, topSource, type Format } from './Card.tsx'
import { CaptionBox, Channels, Icon, nodeBlob, useCaption, useSend, useToast } from './ShareKit.tsx'

// The share composer (B, picked 14 Oct 2026): a full screen in two steps. Step 1 picks the card (story, post, video,
// link); step 2 picks who gets it, with the Bangla-first caption and tags under it. Desktop shows both side by side.

type Tab = 'story' | 'post' | 'video' | 'link'
const cardFormat: Record<Tab, Format> = { story: 'story', post: 'post', video: 'story', link: 'og' }
const previewWidth: Record<Format, number> = { story: 170, post: 200, og: 280 }

const words = {
  en: { pick: 'Pick the card.', who: 'Who gets it?', next: 'Next: who gets it →', back: 'Back', step: (n: number) => `Step ${n} of 2`, fbGroup: 'Facebook group', igStory: 'Instagram story', others: 'Everything else…', sizes: { story: 'Story 9:16', post: 'Post 4:5', video: 'Video 6 s', link: 'Link preview' } },
  bn: { pick: 'কার্ড বেছে নিন।', who: 'কাকে পাঠাবেন?', next: 'পরের ধাপ: কাকে পাঠাবেন →', back: 'পেছনে', step: (n: number) => `ধাপ ${n}/২`, fbGroup: 'ফেসবুক গ্রুপ', igStory: 'ইনস্টাগ্রাম স্টোরি', others: 'অন্য সব…', sizes: { story: 'স্টোরি ৯:১৬', post: 'পোস্ট ৪:৫', video: 'ভিডিও ৬ সে', link: 'লিংক প্রিভিউ' } },
} satisfies Record<Lang, unknown>

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

/** Renders the card on the device. */
const cardBlob = (_item: Item, format: Format, node: HTMLElement | null, _lang: Lang) => nodeBlob(node, format)

// ORIGIN, not location: QuickShare renders on the server (prerender), where there is no location.
const entryUrl = (item: Item, lang: Lang) => `${ORIGIN}${lang === 'bn' ? '/bn' : ''}${item.href}`

export function ShareSheet({ item, lang, onClose }: { item: Item; lang: Lang; onClose: () => void }) {
  const t = dict[lang]
  const s = shareText[lang]
  const w = words[lang]
  const [tab, setTab] = useState<Tab>('story')
  const [step, setStep] = useState<1 | 2>(1)
  const [all, setAll] = useState(false)
  const [video, setVideo] = useState<string | null>(null)
  const tags = tagOptions(item)
  const [picked, setPicked] = useState<string[]>(tags.slice(0, 1).map((x) => x.handle))
  const [friend, setFriend] = useState(false)
  const nodes = useRef<Partial<Record<Format, HTMLDivElement | null>>>({})
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
    document.body.style.overflow = 'hidden'
    return () => { removeEventListener('keydown', esc); document.body.style.overflow = '' }
  }, [item, onClose])

  const file = async (f: Format) => {
    if (tab === 'video' && video) return new File([await (await fetch(video)).blob()], `isbdbannedhere-${item.id}.mp4`, { type: 'video/mp4' })
    const b = await cardBlob(item, f, nodes.current[f] ?? null, lang)
    return b && new File([b], `isbdbannedhere-${item.id}-${f}.${b.type === 'image/png' ? 'png' : 'jpg'}`, { type: b.type || 'image/jpeg' })
  }
  // Instagram always gets the story (or the video); "More" and Download get what was picked.
  const story = () => file('story')
  const current = () => file(format)

  async function copyCaption() {
    await navigator.clipboard.writeText(`${cap.value}\n${tracked(url, card, 'copy')}`).catch(() => {})
    say(s.copied)
    track('caption_copy', { card: `${item.category}/${item.id}` })
  }
  const toggle = (h: string) => setPicked((p) => (p.includes(h) ? p.filter((x) => x !== h) : [...p, h]))
  const tabs: Tab[] = ['story', 'post', ...(video ? (['video'] as const) : []), 'link']
  const nativeText = `${cap.value}\n${tracked(url, card, 'copy')}`

  const pickStep = (
    <div>
      <p className="sen big" style={{ marginTop: 6 }}>{w.pick}</p>
      <div className="carousel" role="radiogroup" aria-label={w.pick}>
        {tabs.map((k) => {
          const f = cardFormat[k]
          return (
            <button key={k} type="button" role="radio" aria-checked={tab === k} className={`slide${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>
              {k === 'video' && video ? (
                <video src={video} width={170} autoPlay muted loop playsInline />
              ) : (
                <Preview format={f} width={previewWidth[f]}><div ref={(n) => { nodes.current[f] = n }}><ShareCard item={item} format={f} lang={lang} /></div></Preview>
              )}
              <p className="lab">{w.sizes[k]}</p>
            </button>
          )
        })}
      </div>
    </div>
  )

  const whoStep = (
    <div>
      <p className="sen big" style={{ marginTop: 6 }}>{w.who}</p>
      <div className="big4" style={{ marginTop: 10 }}>
        <button type="button" className="chb ch-whatsapp" onClick={() => void send('whatsapp', { media: story })}><Icon name="whatsapp" size={22} /><span>WhatsApp</span></button>
        <button type="button" className="chb ch-facebook" onClick={() => void send('facebook', { group, media: story })}><Icon name="facebook" size={22} /><span>{w.fbGroup}</span></button>
        <button type="button" className="chb ch-instagram" onClick={() => void send('instagram', { media: story })}><Icon name="instagram" size={22} /><span>{w.igStory}</span></button>
        <button type="button" className="chb ch-more" aria-expanded={all} onClick={() => setAll(!all)}><Icon name="share" size={22} /><span>{w.others}</span></button>
      </div>
      {all && <div style={{ marginTop: 8 }}><Channels lang={lang} send={send} media={story} more={current} group={group} card={card} format={tab} nativeText={nativeText} /></div>}
      <div className="panel pn">
        <p className="lab" style={{ marginBottom: 6 }}>{s.tagThem}</p>
        <div className="chips">
          {tags.map((x) => (
            <button key={x.handle} type="button" className={`chip${picked.includes(x.handle) ? ' on' : ''}`} style={{ margin: 0 }} aria-pressed={picked.includes(x.handle)} title={x.name} onClick={() => toggle(x.handle)}>@{x.handle}</button>
          ))}
          <button type="button" className={`chip${friend ? ' on' : ''}`} style={{ margin: 0 }} aria-pressed={friend} onClick={() => setFriend(!friend)}>{s.friend}</button>
        </div>
        <CaptionBox lang={lang} mode={cap.mode} setMode={cap.setMode} value={cap.value} onChange={cap.setValue} onCopy={() => void copyCaption()} />
      </div>
    </div>
  )

  return (
    <div className="comp pg" role="dialog" aria-modal="true" aria-label={t.shareTitle}>
      <div className="comp-top">
        <button ref={first} type="button" className="chip" style={{ margin: 0 }} onClick={() => (step === 2 ? setStep(1) : onClose())}>{step === 2 ? `← ${w.back}` : <><span aria-hidden="true">✕</span> {s.close}</>}</button>
        <p className="an">{t.shareTitle}</p>
        <span className="lab comp-step">{w.step(step)}</span>
      </div>
      <div className="comp-cols">
        <div className={step === 1 ? '' : 'comp-hide'}>
          {pickStep}
          <button type="button" className="btn big comp-next" onClick={() => setStep(2)}>{w.next}</button>
        </div>
        <div className={step === 2 ? '' : 'comp-hide'}>{whoStep}</div>
      </div>
      {toast}
    </div>
  )
}

const entryWords = {
  en: { prompt: 'Know someone applying here? Send it now.', pick: 'Pick a card: story, post, video →' },
  bn: { prompt: 'কেউ এখানে আবেদন করছে? এখনই পাঠান।', pick: 'কার্ড বেছে নিন: স্টোরি, পোস্ট, ভিডিও →' },
} satisfies Record<Lang, unknown>

/**
 * The share row at the top of an entry: every channel in one tap with the Bangla-first caption, and a button into
 * the composer. The story card for Instagram and "More" is rendered off screen only once a channel is tapped, so a
 * page view never downloads the card's photo.
 */
export function EntryShare({ item, lang, onMore }: { item: Item; lang: Lang; onMore: () => void }) {
  const s = shareText[lang]
  const w = entryWords[lang]
  const { toast, say } = useToast()
  const [armed, setArmed] = useState(false)
  const node = useRef<HTMLDivElement>(null)
  const card = `${item.category}-${item.id}`
  const url = entryUrl(item, lang)
  const text = caption(item, { mode: 'bn', asOf: TODAY })
  const send = useSend({ lang, text, url, card, format: 'link', say })
  const group = groupCaption(item, { asOf: TODAY, url: tracked(url, card, 'facebook'), source: topSource(item)?.publisher })
  const media = async () => {
    setArmed(true)
    // Wait for the card to mount and its picture to load, then render it.
    for (let i = 0; i < 40 && !(node.current && [...node.current.querySelectorAll('img')].every((im) => im.complete)); i++) await new Promise((r) => setTimeout(r, 100))
    const b = await cardBlob(item, 'story', node.current, lang)
    return b && new File([b], `isbdbannedhere-${item.id}-story.${b.type === 'image/png' ? 'png' : 'jpg'}`, { type: b.type || 'image/jpeg' })
  }
  return (
    <div className="qs-top" onPointerEnter={() => setArmed(true)} onTouchStart={() => setArmed(true)}>
      <p className="sen" style={{ margin: '18px 0 8px' }}>{w.prompt}</p>
      <Channels lang={lang} send={send} media={media} group={group} card={card} format="story" nativeText={`${text}\n${tracked(url, card, 'copy')}`} />
      <button type="button" className="btn out" onClick={onMore}>{w.pick}</button>
      {armed && (
        <div style={{ position: 'fixed', left: -99999, top: 0 }} aria-hidden="true">
          <div ref={node}><ShareCard item={item} format="story" lang={lang} /></div>
        </div>
      )}
      {toast}
    </div>
  )
}

/**
 * The entry page's share row: WhatsApp, Facebook and Messenger in one tap, More opens the composer. `bar` pins it
 * to the bottom of the screen on phones; without it, it sits in the page (desktop).
 */
export function QuickShare({ item, lang, onMore, bar }: { item: Item; lang: Lang; onMore: () => void; bar?: boolean }) {
  const s = shareText[lang]
  const { toast, say } = useToast()
  const send = useSend({ lang, text: caption(item, { mode: 'bn', asOf: TODAY }), url: entryUrl(item, lang), card: `${item.category}-${item.id}`, format: 'link', say })
  return (
    <div className={bar ? 'qs qs-bar pn' : 'qs qs-inline'}>
      {bar && <p className="lab">{s.shareThis}</p>}
      <div className="qs-row">
        {(['whatsapp', 'facebook', 'messenger'] as const satisfies Channel[]).map((ch) => (
          <button key={ch} type="button" className={`chb ch-${ch}`} onClick={() => void send(ch)}><Icon name={ch} /><span>{s.channels[ch === 'facebook' ? 'fb' : ch]}</span></button>
        ))}
        <button type="button" className="chb ch-more" onClick={onMore}><Icon name="share" /><span>{s.more}</span></button>
      </div>
      {toast}
    </div>
  )
}
