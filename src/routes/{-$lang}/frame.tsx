import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Icon, saveBlob, shareOrSave, useCanShareFiles } from '../../components/ShareKit.tsx'
import { toolName } from '../../lib/captions.ts'
import type { Lang } from '../../lib/i18n.ts'
import { langOf, useLang } from '../../lib/lang.ts'
import { ogImage, seo } from '../../lib/site.ts'
import { track } from '../../lib/track.ts'

export const Route = createFileRoute('/{-$lang}/frame')({
  head: ({ params }) => {
    const lang = langOf(params)
    return seo({
      path: '/frame',
      lang,
      title: lang === 'bn' ? 'প্রোফাইল ফ্রেম: আবেদনের আগে যাচাই করি | Is BD banned here?' : 'Profile frame: I check before I apply | Is BD banned here?',
      description: lang === 'bn' ? 'আপনার ছবিতে লাল রিং: "আবেদনের আগে যাচাই করি"। ছবি আপনার ফোনেই তৈরি হয়, কোথাও আপলোড হয় না।' : 'Put a red "I check before I apply" ring on your profile photo. Made on your phone; the photo is never uploaded.',
      image: ogImage('frame'),
    })
  },
  component: Frame,
})

const ring: Record<Lang, string> = { en: 'I CHECK BEFORE I APPLY · ISBDBANNEDHERE', bn: 'আবেদনের আগে যাচাই করি · ISBDBANNEDHERE' }
const words = {
  en: { intro: 'Your photo in a red ring that says it. Set it as your profile picture so friends check too.', pick: 'Choose a photo', change: 'Change photo', save: 'Download PNG', share: 'Share', text: 'Ring text', privacy: 'Your photo never leaves your phone. It is drawn right here in your browser; nothing is uploaded or stored.', placeholder: 'Your photo' },
  bn: { intro: 'লাল রিংয়ে আপনার ছবি। প্রোফাইল ছবি করুন, যেন বন্ধুরাও যাচাই করে।', pick: 'ছবি বেছে নিন', change: 'ছবি বদলান', save: 'PNG ডাউনলোড', share: 'শেয়ার', text: 'রিংয়ের লেখা', privacy: 'আপনার ছবি ফোনের বাইরে যায় না। ছবিটি এখানেই, আপনার ব্রাউজারে তৈরি হয়; কিছুই আপলোড বা সংরক্ষণ হয় না।', placeholder: 'আপনার ছবি' },
}

const S = 1080
const OUTER = S / 2
const INNER = 410

/** Draws the frame: photo cropped into the circle, the share-red ring, the line of text along the bottom of the ring. */
async function draw(ctx: CanvasRenderingContext2D, photo: ImageBitmap | null, lang: Lang, placeholder: string) {
  const font = lang === 'bn' ? '800 54px "Noto Sans Bengali", sans-serif' : '64px Anton, Impact, sans-serif'
  await document.fonts.load(font, ring[lang])
  ctx.clearRect(0, 0, S, S)
  ctx.fillStyle = '#e3141c'
  ctx.beginPath()
  ctx.arc(OUTER, OUTER, OUTER, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.beginPath()
  ctx.arc(OUTER, OUTER, INNER, 0, Math.PI * 2)
  ctx.clip()
  if (photo) {
    // Cover: scale the short side to the circle, centre the rest.
    const k = (INNER * 2) / Math.min(photo.width, photo.height)
    const w = photo.width * k
    const h = photo.height * k
    ctx.drawImage(photo, OUTER - w / 2, OUTER - h / 2, w, h)
  } else {
    ctx.fillStyle = '#2b2b2b'
    ctx.fillRect(0, 0, S, S)
    ctx.fillStyle = '#fff'
    ctx.font = '800 56px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(placeholder, OUTER, OUTER)
  }
  ctx.restore()
  // Text along the bottom arc, left to right, one grapheme at a time (keeps Bangla vowel signs with their letter).
  const r = (OUTER + INNER) / 2
  ctx.font = font
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const gap = lang === 'bn' ? 1 : 5
  const glyphs = [...new Intl.Segmenter(lang, { granularity: 'grapheme' }).segment(ring[lang])].map((g) => ({ g: g.segment, w: ctx.measureText(g.segment).width + gap }))
  const total = glyphs.reduce((a, g) => a + g.w, 0)
  let at = Math.PI / 2 + total / r / 2
  for (const { g, w } of glyphs) {
    const a = at - w / 2 / r
    ctx.save()
    ctx.translate(OUTER + r * Math.cos(a), OUTER + r * Math.sin(a))
    ctx.rotate(a - Math.PI / 2)
    ctx.fillText(g, 0, 0)
    ctx.restore()
    at -= w / r
  }
  // Prohibition sign at the top of the ring.
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 9
  ctx.beginPath()
  ctx.arc(OUTER, OUTER - r, 34, 0, Math.PI * 2)
  ctx.moveTo(OUTER - 24, OUTER - r - 24)
  ctx.lineTo(OUTER + 24, OUTER - r + 24)
  ctx.stroke()
}

function Frame() {
  const lang = useLang()
  const w = words[lang]
  const [text, setText] = useState<Lang>(lang)
  const [photo, setPhoto] = useState<ImageBitmap | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const native = useCanShareFiles()

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (ctx) void draw(ctx, photo, text, w.placeholder)
  }, [photo, text, w.placeholder])

  async function pick(file: File | undefined) {
    if (!file) return
    setPhoto(await createImageBitmap(file))
  }
  async function out(how: 'save' | 'share') {
    const blob = await new Promise<Blob | null>((ok) => canvas.current?.toBlob(ok, 'image/png'))
    if (!blob) return
    const file = new File([blob], 'isbd-profile-frame.png', { type: 'image/png' })
    const r = how === 'share' ? await shareOrSave(file) : (saveBlob(file, file.name), 'download')
    if (r) track('share_done', { channel: r, format: 'frame', card: 'frame' })
  }

  return (
    <section className="pad split">
      <div>
        <h1 className="an" style={{ fontSize: 'clamp(40px, 11vw, 72px)' }}>{toolName[lang].frame}</h1>
        <p className="body" style={{ marginTop: 8 }}>{w.intro}</p>
        <p className="body privacy" style={{ marginTop: 12 }}>{w.privacy}</p>
        <p className="lab" style={{ margin: '16px 0 6px' }}>{w.text}</p>
        <div className="chips" role="group" aria-label={w.text}>
          <button type="button" className={`chip${text === 'en' ? ' on' : ''}`} style={{ margin: 0 }} aria-pressed={text === 'en'} onClick={() => setText('en')}>English</button>
          <button type="button" lang="bn" className={`chip${text === 'bn' ? ' on' : ''}`} style={{ margin: 0 }} aria-pressed={text === 'bn'} onClick={() => setText('bn')}>বাংলা</button>
        </div>
      </div>
      <div className="frame-col">
        <canvas ref={canvas} width={S} height={S} className="card-in frame-canvas" role="img" aria-label={ring[text]} />
        <label className={photo ? 'btn out' : 'btn big'}>
          <Icon name="photo" size={photo ? 18 : 22} />{photo ? w.change : w.pick}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
        {photo && (
          <>
            <button type="button" className="btn big" onClick={() => void out('save')}><Icon name="download" size={22} />{w.save}</button>
            {native && <button type="button" className="btn out" onClick={() => void out('share')}><Icon name="share" />{w.share}</button>}
          </>
        )}
      </div>
    </section>
  )
}
