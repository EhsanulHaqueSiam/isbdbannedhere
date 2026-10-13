import { createFileRoute } from '@tanstack/react-router'
import { useRef } from 'react'
import { getWeek, type PlacedStory } from '../../data/tools-api.ts'
import { slugOf } from '../../data/rows-slug.ts'
import { ORIGIN, formatSize } from '../../components/Card.tsx'
import { Icon, nodeBlob, saveBlob, useToast } from '../../components/ShareKit.tsx'
import { StorySlide, WeekSummary } from '../../components/WeekCards.tsx'
import { shareText, storyPost, storyTitle, toolName, weekPost } from '../../lib/captions.ts'
import type { Lang } from '../../lib/i18n.ts'
import { langOf, useLang } from '../../lib/lang.ts'
import { tracked } from '../../lib/share.ts'
import { ogImage, seo } from '../../lib/site.ts'
import { track } from '../../lib/track.ts'

export const Route = createFileRoute('/{-$lang}/share')({
  loader: () => getWeek(),
  head: ({ params }) => {
    const lang = langOf(params)
    return seo({
      path: '/share',
      lang,
      title: lang === 'bn' ? 'গ্রুপ অ্যাডমিনদের জন্য: তৈরি পোস্ট, ছবি আর লিংক | Is BD banned here?' : 'For group admins: ready-made posts about bans on Bangladeshis | Is BD banned here?',
      description: lang === 'bn' ? 'সর্বশেষ নিষেধাজ্ঞা আর সাপ্তাহিক রিপোর্ট: বাংলা আগে, ইংরেজি নিচে। কপি করুন, ছবি নিন, গ্রুপে দিন।' : 'The latest bans and the weekly report as ready-made posts: Bangla first, English below. Copy, take the image, post it in your group.',
      image: ogImage('share'),
    })
  },
  component: Share,
})

const words = {
  en: { intro: 'Ready-made posts for Facebook and WhatsApp groups: Bangla first, English below, with the link. Copy the text, save the image, post both.', weekly: 'Weekly report', latest: 'Latest stories', copy: 'Copy post', image: 'Save image', open: 'Open the page' },
  bn: { intro: 'ফেসবুক আর হোয়াটসঅ্যাপ গ্রুপের জন্য তৈরি পোস্ট: বাংলা আগে, ইংরেজি নিচে, লিংকসহ। লেখা কপি করুন, ছবি সেভ করুন, দুটোই পোস্ট করুন।', weekly: 'সাপ্তাহিক রিপোর্ট', latest: 'সর্বশেষ খবর', copy: 'পোস্ট কপি', image: 'ছবি সেভ', open: 'পেজটি খুলুন' },
}

const W = 200

/** Where a story's link goes: the entry for one place, its category page for a cluster. */
const storyPath = (s: PlacedStory) => (s.items.length === 1 ? s.items[0]!.href : `/${slugOf[s.category]}`)

function Share() {
  const d = Route.useLoaderData()
  const lang = useLang()
  const w = words[lang]
  const { toast, say } = useToast()
  const pre = lang === 'bn' ? '/bn' : ''
  const weekUrl = tracked(`${ORIGIN}${pre}/week`, 'admin-week', 'copy')
  return (
    <section className="pad">
      <h1 className="an" style={{ fontSize: 'clamp(40px, 11vw, 72px)' }}>{toolName[lang].share}</h1>
      <p className="body narrow" style={{ marginTop: 8, marginInline: 0 }}>{w.intro}</p>
      <h2 className="an" style={{ fontSize: 26, marginTop: 24 }}>{w.weekly}</h2>
      <Post lang={lang} id="admin-week" file={`isbd-week-${d.to}.png`} text={weekPost(d, weekUrl)} href={`${pre}/week`} say={say} w={w}>
        <WeekSummary from={d.from} to={d.to} counts={d.counts} stories={d.stories} lang={lang} url={`${ORIGIN}${pre}/week`} />
      </Post>
      <h2 className="an" style={{ fontSize: 26, marginTop: 24 }}>{w.latest}</h2>
      {d.latest.map((s) => {
        const path = `${pre}${storyPath(s)}`
        const id = `admin-${s.category}-${s.items[0]?.id ?? ''}`
        return (
          <Post key={`${s.date}${s.category}${s.status}`} lang={lang} id={id} file={`isbd-${s.items[0]?.id ?? s.category}-${s.date}.png`} text={storyPost(s, tracked(`${ORIGIN}${path}`, id, 'copy'))} href={path} say={say} w={w} title={storyTitle(s, lang)}>
            <StorySlide story={s} lang={lang} url={`${ORIGIN}${path}`} />
          </Post>
        )
      })}
      {toast}
    </section>
  )
}

/** One ready-made post: the card (saved as an image on the phone), the text with a big Copy button, and the link. */
function Post({ lang, id, file, text, href, say, w, title, children }: { lang: Lang; id: string; file: string; text: string; href: string; say: (m: string) => void; w: (typeof words)[Lang]; title?: string; children: React.ReactNode }) {
  const node = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const { w: cw, h } = formatSize.post
  const k = W / cw
  async function copy() {
    await navigator.clipboard.writeText(area.current?.value ?? text).catch(() => {})
    say(shareText[lang].copied)
    track('caption_copy', { card: id })
  }
  async function save() {
    const b = await nodeBlob(node.current, 'post')
    if (!b) return
    saveBlob(b, file)
    track('share_done', { channel: 'download', format: 'post', card: id })
  }
  return (
    <article className="post-row" aria-label={title}>
      <figure style={{ margin: 0, width: W }}>
        <div style={{ width: W, height: h * k, overflow: 'hidden', borderRadius: 8 }}>
          <div style={{ width: cw, height: h, transform: `scale(${k})`, transformOrigin: '0 0' }}>
            <div ref={node}>{children}</div>
          </div>
        </div>
        <button type="button" className="btn out" style={{ marginTop: 8 }} onClick={() => void save()}><Icon name="download" />{w.image}</button>
      </figure>
      <div className="pn" style={{ padding: 14, minWidth: 0 }}>
        <textarea ref={area} className="input cap" rows={9} defaultValue={text} aria-label={title ?? w.weekly} />
        <button type="button" className="btn big" onClick={() => void copy()}><Icon name="doc" size={22} />{w.copy}</button>
        <a className="lab" href={href} style={{ display: 'inline-block', marginTop: 10, textDecoration: 'underline' }}>{w.open} →</a>
      </div>
    </article>
  )
}
