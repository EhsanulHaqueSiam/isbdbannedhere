import { createFileRoute } from '@tanstack/react-router'
import { useRef } from 'react'
import { getWeek } from '../../data/tools-api.ts'
import { ORIGIN, formatSize } from '../../components/Card.tsx'
import { CaptionBox, Channels, Icon, nodeBlob, saveBlob, useCaption, useSend, useToast } from '../../components/ShareKit.tsx'
import { StorySlide, WeekSummary } from '../../components/WeekCards.tsx'
import { dateRange, shareText, toolCaption, toolName, weekLines, weekText } from '../../lib/captions.ts'
import { langOf, useLang } from '../../lib/lang.ts'
import { tracked } from '../../lib/share.ts'
import { ogImage, seo } from '../../lib/site.ts'
import { track } from '../../lib/track.ts'

export const Route = createFileRoute('/{-$lang}/week')({
  loader: () => getWeek(),
  head: ({ params, loaderData }) => {
    const lang = langOf(params)
    const range = loaderData ? dateRange(loaderData.from, loaderData.to, lang) : ''
    const lines = loaderData ? weekLines(loaderData.counts, lang).join(', ') : ''
    return seo({
      path: '/week',
      lang,
      title: lang === 'bn' ? `এই সপ্তাহে বাংলাদেশিদের ওপর নিষেধাজ্ঞা (${range}) | Is BD banned here?` : `This week in bans on Bangladeshis (${range}) | Is BD banned here?`,
      description: lang === 'bn' ? `${lines}। গত ৭ দিনের নতুন নিষেধাজ্ঞা আর আবার খোলা, শেয়ার করার মতো ৫টি স্লাইডে।` : `${lines}. The last 7 days of new bans and reopenings, as five slides to share.`,
      image: ogImage('week'),
    })
  },
  component: Week,
})

const words = {
  en: { intro: 'The last 7 days of changes, as slides for your group. Swipe, download one, or share them all.', all: (n: number) => `Share all ${n} slides`, slide: (n: number) => `Slide ${n}` },
  bn: { intro: 'গত ৭ দিনের পরিবর্তন, গ্রুপে দেওয়ার মতো স্লাইডে। সোয়াইপ করুন, একটি ডাউনলোড করুন, অথবা সবগুলো শেয়ার করুন।', all: (n: number) => `${n}টি স্লাইড শেয়ার করুন`, slide: (n: number) => `স্লাইড ${n}` },
}
const W = 280

function Week() {
  const d = Route.useLoaderData()
  const lang = useLang()
  const w = words[lang]
  const s = shareText[lang]
  const nodes = useRef<(HTMLDivElement | null)[]>([])
  const { toast, say } = useToast()
  const url = `${ORIGIN}${lang === 'bn' ? '/bn' : ''}/week`
  const stories = d.stories.slice(0, 4)
  const cap = useCaption((mode) => toolCaption({ bn: weekText(d, 'bn'), en: weekText(d, 'en') }, mode), [])
  const send = useSend({ lang, text: cap.value, url, card: 'week', format: 'post', say })
  const { h } = formatSize.post
  const k = W / formatSize.post.w

  const slide = async (i: number) => {
    const b = await nodeBlob(nodes.current[i] ?? null, 'post')
    return b && new File([b], `isbd-week-${d.to}-${i + 1}.png`, { type: 'image/png' })
  }
  async function shareAll() {
    const files = (await Promise.all([0, ...stories.map((_, i) => i + 1)].map(slide))).filter((f): f is File => !!f)
    const text = `${cap.value}\n${tracked(url, 'week', 'copy')}`
    if (navigator.canShare?.({ files })) {
      await navigator.share({ files, text }).then(() => track('share_done', { channel: 'native', format: 'carousel', card: 'week' }), () => {})
      return
    }
    files.forEach((f) => saveBlob(f, f.name))
    track('share_done', { channel: 'download', format: 'carousel', card: 'week' })
  }
  async function download(i: number) {
    const f = await slide(i)
    if (!f) return
    saveBlob(f, f.name)
    track('share_done', { channel: 'download', format: 'slide', card: 'week' })
  }
  async function copy() {
    await navigator.clipboard.writeText(`${cap.value}\n${tracked(url, 'week', 'copy')}`).catch(() => {})
    say(s.copied)
    track('caption_copy', { card: 'week' })
  }

  const slides = [
    <WeekSummary key="sum" from={d.from} to={d.to} counts={d.counts} stories={d.stories} lang={lang} url={url} />,
    ...stories.map((st) => <StorySlide key={`${st.date}${st.category}${st.status}`} story={st} lang={lang} url={st.items.length === 1 ? `${ORIGIN}${lang === 'bn' ? '/bn' : ''}${st.items[0]!.href}` : url} />),
  ]

  return (
    <section className="pad">
      <h1 className="an" style={{ fontSize: 'clamp(40px, 11vw, 72px)' }}>{toolName[lang].week}</h1>
      <p className="lab" style={{ marginTop: 6 }}>{dateRange(d.from, d.to, lang)}</p>
      <p className="body" style={{ marginTop: 8 }}>{w.intro}</p>
      <div className="carousel" aria-label={toolName[lang].week}>
        {slides.map((el, i) => (
          <figure key={i} className="card-in" style={{ width: W, margin: 0 }}>
            <div style={{ width: W, height: h * k, overflow: 'hidden', borderRadius: 8 }}>
              <div style={{ width: formatSize.post.w, height: h, transform: `scale(${k})`, transformOrigin: '0 0' }}>
                <div ref={(n) => { nodes.current[i] = n }}>{el}</div>
              </div>
            </div>
            <figcaption>
              <button type="button" className="btn out" style={{ marginTop: 8 }} onClick={() => void download(i)}><Icon name="download" />{s.download} · {w.slide(i + 1)}</button>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="narrow">
        <button type="button" className="btn big" onClick={() => void shareAll()}><Icon name="share" size={22} />{w.all(slides.length)}</button>
        <div className="pn tool-panel">
          <p className="lab">{s.sendTo}</p>
          <Channels lang={lang} send={send} media={() => slide(0)} card="week" format="post" nativeText={`${cap.value}\n${tracked(url, 'week', 'copy')}`} />
          <CaptionBox lang={lang} mode={cap.mode} setMode={cap.setMode} value={cap.value} onChange={cap.setValue} onCopy={() => void copy()} />
        </div>
      </div>
      {toast}
    </section>
  )
}

