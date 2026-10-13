// Post-build: a 1200×630 link-preview image for every page, in English and Bangla (/og/bn/, picked by seo() on /bn
// pages), the world map (/map.svg and /og/map.png), embed badges (/badge/<category>/<id>.svg), short links
// (_redirects: /uae → /in/uae) and robots.txt, all written into the client output.
// Runs after `vite build` (package.json "build") from the same data and wording as the pages, so a preview can't
// drift from its page and every new entry gets one without a manual step. Pages point at these via seo() in lib/site.ts.
// Bangla goes through satori too: it shapes with HarfBuzz, while resvg's own text layout mis-shapes Bengali.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createElement as h, type ReactNode } from 'react'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { loadEnv } from 'vite'
import { categories } from '../src/data/rows.ts'
import { counts, countriesNow, countryName, feed, items, slugOf, totals, TODAY, type Item } from '../src/data/index.ts'
import { hubs, type Hub } from '../src/data/hubs.ts'
import { week } from '../src/data/tools.ts'
import type { Status } from '../src/data/derive.ts'
import { categoryLabel, dict, fmtDate, headline, phrase, placeName, prep, statusLabel, type Lang } from '../src/lib/i18n.ts'
import { dateRange, fitSize, num, scopeIn, weekLines } from '../src/lib/captions.ts'
import { BD_PATH, BD_VIEWBOX } from '../src/lib/bd-outline.ts'
import { ogImage } from '../src/lib/site.ts'
import world from './world.json' with { type: 'json' }

const OUT = 'dist/client'
const SITE = (loadEnv('production', process.cwd(), 'VITE_').VITE_SITE_URL ?? '').replace(/\/$/, '')
// Reopened is good news, so its preview is green (white on it is 7.4:1).
const RED = '#e3141c', GREEN = '#05632e', INK = '#0a0a0a', W = 1200, H = 630
const langs = ['en', 'bn'] as const

const font = (f: string) => readFileSync(new URL(`fonts/${f}`, import.meta.url))
const fonts = [
  { name: 'Anton', data: font('anton.woff'), weight: 400 as const },
  { name: 'Inter', data: font('inter-800.woff'), weight: 800 as const },
  { name: 'Mono', data: font('mono-700.woff'), weight: 700 as const },
  // Noto Sans Bengali ExtraBold (OFL, notofonts/bengali v2.003).
  { name: 'Bangla', data: font('noto-sans-bengali-800.ttf'), weight: 800 as const },
]
// Bangla text in Bangla type; Latin bits (URLs, digits in names) fall back to the next family.
const sans = (lang: Lang) => (lang === 'bn' ? 'Bangla, Inter' : 'Inter, Bangla')
const display = (lang: Lang) => (lang === 'bn' ? { fontFamily: 'Bangla, Inter', lineHeight: 1.3 } : { fontFamily: 'Anton, Bangla', lineHeight: 1 })
const up = (lang: Lang, s: string) => (lang === 'en' ? s.toUpperCase() : s)
const cap = (s: string) => s.replace(/^./, (x) => x.toUpperCase())
const stop = (lang: Lang) => (lang === 'bn' ? '।' : '.')
const asOf = (lang: Lang) => (lang === 'bn' ? `${dict.bn.asOf} ${fmtDate(TODAY, 'bn')}` : `As of ${fmtDate(TODAY)}`)
const svg = (s: string) => `data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}`
const flag = (code: string) => svg(readFileSync(`node_modules/country-flag-icons/3x2/${code}.svg`, 'utf8'))

// Same shapes as IconSprite in components/ui.tsx. On red, white backs restricted and reopened; ink the rest.
const iconSvg: Record<Exclude<Status, 'none'>, string> = {
  shut: '<circle cx="12" cy="12" r="9.6" fill="none" stroke="C" stroke-width="3.2"/><line x1="5.4" y1="5.4" x2="18.6" y2="18.6" stroke="C" stroke-width="3.2"/>',
  restricted: '<circle cx="12" cy="12" r="9.6" fill="none" stroke="C" stroke-width="3.2"/><line x1="12" y1="6.5" x2="12" y2="13.5" stroke="C" stroke-width="3.2"/><circle cx="12" cy="17.3" r="1.8" fill="C"/>',
  unclear: '<circle cx="12" cy="12" r="9.6" fill="none" stroke="C" stroke-width="2.4" stroke-dasharray="3.2 2.6"/><path d="M9.6 9.6a2.6 2.6 0 1 1 3.4 2.5c-.6.3-1 .8-1 1.5v.6" fill="none" stroke="C" stroke-width="2"/><circle cx="12" cy="17" r="1.3" fill="C"/>',
  reopened: '<circle cx="12" cy="12" r="9.6" fill="none" stroke="C" stroke-width="3.2"/><path d="M7.4 12.4l3.1 3.1 6.1-6.6" fill="none" stroke="C" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
  disputed: '',
}
iconSvg.disputed = iconSvg.unclear
const onRed = (s: Status) => (s === 'restricted' || s === 'reopened' ? '#fff' : INK)
function icon(s: Status, px: number, color = onRed(s)) {
  if (s === 'none') return null
  return h('img', { src: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${iconSvg[s].replaceAll('C', color)}</svg>`), width: px, height: px, style: { flexShrink: 0 } })
}

const mono = (lang: Lang, px: number, children: ReactNode) =>
  h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, fontFamily: lang === 'bn' ? 'Bangla, Mono' : 'Mono, Bangla', fontSize: px, letterSpacing: lang === 'bn' ? 0 : 2, color: '#fff' } }, children)

// The page's halftone: 9% black dots on a 5px grid, drawn at 2x for a 1200px card.
const dots = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><pattern id="d" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1.6" fill="#000" fill-opacity=".09"/></pattern></defs><rect width="100%" height="100%" fill="url(#d)"/></svg>`)

/** A card's main block: the question, then the headline word and its sentence in white. `k` shrinks it to fit. */
function verdict(lang: Lang, k: number, q: string, line: string, ink: string, side: ReactNode) {
  const text = up(lang, q)
  return h(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 40, flexShrink: 0 } },
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', flex: 1 } },
      h('div', { style: { ...display(lang), fontSize: fitSize(text, 820, 92, { lines: 3 }) * k, color: ink } }, text),
      h('div', { style: { fontFamily: sans(lang), fontSize: 38 * k, lineHeight: 1.25, color: '#fff', marginTop: 18 * k } }, line),
    ),
    side,
  )
}

function frame(lang: Lang, children: ReactNode[], foot: string, bg = RED) {
  return h(
    'div',
    { style: { width: W, height: H, display: 'flex', backgroundColor: bg, backgroundImage: `url(${dots})`, color: bg === RED ? INK : '#fff', fontFamily: sans(lang) } },
    h(
      'div',
      { style: { width: W - 120, height: H - 112, margin: '56px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 20 } },
      ...children,
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 } },
        h('div', { style: { fontSize: 22, color: '#fff' } }, foot),
        h(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, ...display(lang), fontSize: lang === 'bn' ? 32 : 38, color: bg === RED ? INK : '#fff' } }, icon('shut', 36, bg === RED ? INK : '#fff'), up(lang, dict[lang].brand)),
          mono(lang, 22, SITE ? SITE.replace(/^https?:\/\//, '') : '#ISBDBANNEDHERE'),
        ),
      ),
    ),
  )
}

type Card = (k: number) => ReactNode

function entityCard(item: Item, lang: Lang): Card {
  const status = item.state.status
  const name = lang === 'bn' ? (item.nameBn ?? item.name) : placeName(item)
  const q = lang === 'bn' ? `${name}: বাংলাদেশিরা কি নিষিদ্ধ?` : `Is BD banned ${prep(item.category)} ${name}?`
  const sources = item.events.flatMap((e) => e.sources)
  const top = sources.find((s) => s.tier === 'official') ?? sources[0]
  const more = item.conf.sources - 1
  const src = top ? (lang === 'bn' ? `সূত্র: ${top.publisher}${more > 0 ? ` + আরও ${num(more, 'bn')}টি` : ''} · ` : `Source: ${top.publisher}${more > 0 ? ` + ${more} more` : ''} · `) : ''
  const where = [item.city, item.country ? countryName(item.country, lang) : lang === 'bn' ? 'বিশ্বজুড়ে' : 'Global', categoryLabel[lang][item.category]].filter(Boolean).join(' · ')
  const what = status === 'none' ? (lang === 'bn' ? 'এখনও কেউ প্রমাণ পাঠায়নি।' : 'Nobody has sent a receipt yet.') : `${cap(scopeIn(item, lang))}${stop(lang)}`
  const bg = status === 'reopened' ? GREEN : RED
  return (k) =>
    frame(
      lang,
      [
        mono(lang, 24, [item.country ? h('img', { key: 'f', src: flag(item.country), height: 26, width: 39 }) : null, up(lang, where)]),
        verdict(lang, k, q, `${headline[lang][status]} ${what}`, bg === RED ? INK : '#fff', icon(status, 210 * k)),
      ],
      `${src}${asOf(lang)}`,
      bg,
    )
}

function hubCard(hub: Hub, lang: Lang): Card {
  const say = hub.text[lang]
  const bg = hub.status === 'reopened' ? GREEN : RED
  const places = lang === 'bn' ? `${num(hub.places, 'bn')}টি জায়গা` : `${hub.places} ${hub.places === 1 ? 'place' : 'places'}`
  const foot = lang === 'bn' ? `${num(hub.sources, 'bn')}টি সূত্র · প্রতিটি তথ্যের সাথে প্রমাণ · ${asOf('bn')}` : `${hub.sources} sources · every entry links its receipts · ${asOf('en')}`
  return (k) =>
    frame(
      lang,
      [
        mono(lang, 24, [h('img', { key: 'f', src: flag(hub.code), height: 26, width: 39 }), up(lang, `${hub.name[lang]} · ${places}`)]),
        verdict(lang, k, say.question, `${headline[lang][hub.status]} ${say.sentence}`, bg === RED ? INK : '#fff', icon(hub.status, 210 * k)),
      ],
      foot,
      bg,
    )
}

function categoryCard(c: (typeof categories)[number], lang: Lang): Card {
  const n = counts(c)
  const rows = (['shut', 'disputed', 'restricted', 'unclear', 'reopened'] as const).filter((s) => n[s])
  // Reopened places are not bans: count and word the card from the rest, worst status first.
  const bans = rows.filter((s) => s !== 'reopened')
  const active = n.reported - n.reopened
  const line = lang === 'bn'
    ? bans[0] ? `বাংলাদেশিদের জন্য ${bans.length > 1 ? 'বন্ধ বা সীমিত' : statusLabel.bn[bans[0]]}।` : 'কোনো নিষেধাজ্ঞার রিপোর্ট নেই।'
    : bans[0] ? `${cap(phrase(bans[0], c, true, bans.length > 1))}.` : 'No bans reported.'
  const foot = lang === 'bn' ? `প্রতিটি তথ্যের সাথে সূত্র · ${num(totals.sources, 'bn')}টি সূত্র` : `Every entry links its sources · ${totals.sources} sources`
  return (k) =>
    frame(
      lang,
      [
        mono(lang, 24, up(lang, `${categoryLabel[lang][c]} · ${asOf(lang)}`)),
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', flexShrink: 0 } },
          h('div', { style: { ...display(lang), fontSize: (lang === 'bn' ? 96 : 120) * k, display: 'flex', flexWrap: 'wrap', gap: 28 } }, h('span', { style: { color: '#fff' } }, num(active, lang)), up(lang, categoryLabel[lang][c])),
          h('div', { style: { fontSize: 40 * k, lineHeight: 1.25, color: '#fff', marginTop: 8 } }, line),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 30, marginTop: 26 * k } }, ...rows.map((s) => h('div', { key: s, style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 30 * k } }, icon(s, 34 * k), lang === 'bn' ? `${num(n[s], 'bn')}টি ${statusLabel.bn[s]}` : `${n[s]} ${statusLabel.en[s].toLowerCase()}`))),
        ),
      ],
      foot,
    )
}

function homeCard(lang: Lang): Card {
  const t = dict[lang]
  const words = [...t.heroA.split(' '), t.heroB, ...t.heroC.split(' ')].filter(Boolean)
  const line = lang === 'bn' ? `${num(countriesNow.length, 'bn')}টি দেশে ${num(totals.places, 'bn')}টি জায়গা` : `${totals.places} places in ${countriesNow.length} countries`
  return (k) =>
    frame(
      lang,
      [
        mono(lang, 24, up(lang, `${asOf(lang)} · ${lang === 'bn' ? `${num(totals.sources, 'bn')}টি সূত্র` : `${totals.sources} sources`}`)),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 } },
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', width: 820 } },
            h('div', { style: { ...display(lang), fontSize: (lang === 'bn' ? 76 : 86) * k, lineHeight: lang === 'bn' ? 1.25 : 0.98, display: 'flex', flexWrap: 'wrap' } }, ...words.map((w) => h('span', { key: w, style: { marginRight: 22, color: w === t.heroB ? '#fff' : INK } }, up(lang, w)))),
            h('div', { style: { fontSize: 34 * k, color: '#fff', marginTop: 16 } }, line),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 } }, ...countriesNow.slice(0, 14).map((c) => h('img', { key: c.code, src: flag(c.code), width: 42, height: 28 }))),
          ),
          h('img', {
            width: 230 * k,
            height: 315 * k,
            src: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BD_VIEWBOX}"><path d="${BD_PATH}" fill="none" stroke="${INK}" stroke-opacity=".6" stroke-width="1.4" stroke-linejoin="round"/><g fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="6"><circle cx="52" cy="66" r="44"/><line x1="21" y1="35" x2="83" y2="97"/></g></svg>`),
          }),
        ),
      ],
      lang === 'bn' ? 'বিশ্ববিদ্যালয়, কোম্পানি, ভিসা ও দেশ। প্রমাণসহ।' : 'Universities, companies, visas and countries. With the receipts.',
    )
}

// ---- world map: countries with a ban now in ink, Bangladesh white, the rest faint ----

const banned = new Set(countriesNow.map((c) => c.code))
// Too small for the 1:110m outlines: drawn as dots (lon, lat).
const dotsAt: Partial<Record<string, [number, number]>> = { BH: [50.55, 26.07], MV: [73.22, 3.2], SG: [103.82, 1.35], MT: [14.4, 35.9], QA: [51.18, 25.35] }
const paths: Record<string, string> = world.paths

/** The map as SVG (viewBox 0 0 1000 440, equirectangular, 83°N to 57°S as in scripts/world.json). */
function worldSvg(bg?: string) {
  const at = ([lon, lat]: [number, number]) => `cx="${(((lon + 180) / 360) * 1000).toFixed(1)}" cy="${(((83 - lat) / 140) * 440).toFixed(1)}"`
  const shapes = Object.entries(paths).map(([code, d]) => (code === 'BD' ? `<path d="${d}" fill="#fff"/>` : banned.has(code) ? `<path d="${d}" fill="${INK}"/>` : `<path d="${d}" fill="#fff" fill-opacity=".2"/>`))
  const marks = [...banned].filter((c) => !paths[c]).map((c) => {
    const p = dotsAt[c]
    if (!p) console.warn(`seo: ${c} has a ban but no outline or dot on the map`)
    return p ? `<circle ${at(p)} r="6" fill="${INK}" stroke="#fff" stroke-width="1.5"/>` : ''
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${world.viewBox}" width="1000" height="440">${bg ? `<rect width="1000" height="440" fill="${bg}"/>` : ''}${shapes.join('')}${marks.join('')}</svg>`
}

function mapCard(lang: Lang): Card {
  const n = countriesNow.length
  return (k) =>
    frame(
      lang,
      [
        mono(lang, 24, up(lang, asOf(lang))),
        h('div', { style: { ...display(lang), fontSize: (lang === 'bn' ? 52 : 60) * k, color: INK, flexShrink: 0 } }, up(lang, lang === 'bn' ? 'যেখানে বাংলাদেশিরা নিষিদ্ধ' : 'Where Bangladeshis are banned')),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 30, flexShrink: 0 } },
          h('img', { src: svg(worldSvg()), width: 700 * k, height: 308 * k }),
          h('div', { style: { display: 'flex', flexDirection: 'column', color: '#fff' } }, h('div', { style: { fontFamily: 'Anton', fontSize: 140 * k, lineHeight: 1 } }, num(n, lang)), h('div', { style: { ...display(lang), fontSize: 34 * k } }, up(lang, lang === 'bn' ? 'টি দেশ' : 'countries'))),
        ),
      ],
      lang === 'bn' ? 'কালো: নিষিদ্ধ বা সীমিত। সাদা: বাংলাদেশ।' : 'Black: banned or restricted. White: Bangladesh.',
    )
}

// ---- tool pages ----

const w = week(feed, TODAY)
const tools: Record<string, Record<Lang, [title: string, line: string]>> = {
  check: { en: ['Am I affected?', 'Pick where you plan to study, work or visit. See what is closed to Bangladeshis.'], bn: ['আমার ওপর কি প্রভাব পড়বে?', 'কোথায় পড়তে, কাজ করতে বা বেড়াতে যাবেন, বেছে নিন। দেখুন বাংলাদেশিদের জন্য কী বন্ধ।'] },
  compare: { en: ['Compare countries', 'UK, UAE, USA and more, side by side: visas, universities, companies.'], bn: ['দেশ তুলনা', 'যুক্তরাজ্য, আমিরাত, যুক্তরাষ্ট্র ও আরও: ভিসা, বিশ্ববিদ্যালয়, কোম্পানি পাশাপাশি।'] },
  frame: { en: ['Profile frame', 'Put #isBDbannedhere on your profile photo. Your photo stays on your phone.'], bn: ['প্রোফাইল ফ্রেম', 'প্রোফাইল ছবিতে #isBDbannedhere যোগ করুন। ছবি আপনার ফোনেই থাকে।'] },
  week: { en: ['This week', `${weekLines(w.counts, 'en').join(', ')}. ${dateRange(w.from, w.to, 'en')}.`], bn: ['এই সপ্তাহ', `${weekLines(w.counts, 'bn').join(', ')}। ${dateRange(w.from, w.to, 'bn')}।`] },
  share: { en: ['For group admins', 'Ready-made posts, images and links for your group.'], bn: ['গ্রুপ অ্যাডমিনদের জন্য', 'আপনার গ্রুপের জন্য তৈরি পোস্ট, ছবি ও লিংক।'] },
}
const toolCard = (id: string, lang: Lang): Card => (k) => {
  const [title, line] = tools[id]![lang]
  return frame(lang, [mono(lang, 24, up(lang, asOf(lang))), verdict(lang, k, title, line, INK, icon('shut', 210 * k))], lang === 'bn' ? 'প্রতিটি তথ্যের সাথে সূত্র।' : 'Every entry links its sources.')
}

// ---- badges: "London Met: BANNED for Bangladeshis · isbdbannedhere", white on colours that clear 7:1 ----

const badgeBg: Record<Status, string> = { shut: '#a3000f', disputed: '#a3000f', unclear: '#a3000f', restricted: '#6b4200', reopened: GREEN, none: '#4d4d4d' }
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
// Verdana-ish widths at 11px bold; textLength makes the text fill exactly this, so it never overflows.
const textWidth = (s: string) => Math.ceil([...s].reduce((n, c) => n + (c === ' ' ? 3.9 : /[A-Z0-9?]/.test(c) ? 7.8 : 6.7), 0))

function badge(item: Item) {
  const word = headline.en[item.state.status].replace(/\.$/, '').toUpperCase()
  // Two entries are named after a country (tourist visa, work and study visas): say which.
  const left = `${placeName(item)}${item.category === 'tourism' ? ' tourist visa' : item.category === 'country' ? ' work and student visas' : ''}:`
  const right = `${word} ${item.state.status === 'reopened' ? 'to' : 'for'} Bangladeshis · isbdbannedhere`
  const [a, b] = [textWidth(left), textWidth(right)]
  const lw = a + 16, rw = b + 16
  const label = `${left} ${right}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + rw}" height="20" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title><rect width="${lw}" height="20" fill="${INK}"/><rect x="${lw}" width="${rw}" height="20" fill="${badgeBg[item.state.status]}"/><g fill="#fff" font-family="Verdana,DejaVu Sans,Geneva,sans-serif" font-size="11" font-weight="700"><text x="8" y="14" textLength="${a}" lengthAdjust="spacingAndGlyphs">${esc(left)}</text><text x="${lw + 8}" y="14" textLength="${b}" lengthAdjust="spacingAndGlyphs">${esc(right)}</text></g></svg>`
}

// ---- writing, with a fit check ----

const PAD = 240
const shrunk: string[] = []
// satori turns all text into paths, so resvg needs no fonts; scanning the system's fonts made every image 5x slower.
const noFonts = { font: { loadSystemFonts: false } }

/**
 * Text must never run off a card. Each card is drawn on a larger green canvas first; if anything lands outside the
 * 1200×630 box, it is redrawn with smaller type (k). The build fails if even the smallest size doesn't fit.
 */
export async function render(card: Card, label = 'card') {
  for (const k of [1, 0.9, 0.8, 0.7, 0.6, 0.5]) {
    const probe = await satori(h('div', { style: { display: 'flex', width: W + PAD, height: H + PAD, backgroundColor: '#00ff00' } }, card(k)), { width: W + PAD, height: H + PAD, fonts })
    const z = 0.25
    const img = new Resvg(probe, { ...noFonts, fitTo: { mode: 'zoom', value: z } }).render()
    const px = img.pixels
    let spill = false
    for (let y = 0; y < img.height && !spill; y++)
      for (let x = y >= H * z ? 0 : W * z; x < img.width; x++) {
        const i = (y * img.width + x) * 4
        if (px[i] !== 0 || px[i + 1] !== 255 || px[i + 2] !== 0) { spill = true; break }
      }
    if (spill) continue
    if (k < 1) shrunk.push(`${label} ×${k}`)
    return new Resvg(probe.replace(/^<svg width="\d+" height="\d+" viewBox="0 0 \d+ \d+"/, `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"`), noFonts).render().asPng()
  }
  throw new Error(`seo: text runs off the card even at half size: ${label}`)
}

function save(path: string, data: Buffer | string) {
  const file = `${OUT}${path}`
  mkdirSync(file.slice(0, file.lastIndexOf('/')), { recursive: true })
  writeFileSync(file, data)
}

/** Writes the English image at `path` (an /og/ path) and its Bangla twin under /og/bn/. */
async function both(path: string, card: (lang: Lang) => Card) {
  for (const lang of langs) {
    const p = lang === 'bn' ? path.replace(/^\/og\//, '/og/bn/') : path
    save(p, await render(card(lang), p))
  }
}

/** Every link preview, en and bn. Exported so a check can render worst cases on their own. */
export const cards = { entityCard, hubCard, categoryCard, homeCard, mapCard, toolCard }

if (import.meta.main) {
  await both(ogImage(), homeCard)
  for (const c of categories) await both(ogImage(slugOf[c]), (lang) => categoryCard(c, lang))
  for (const item of items) await both(ogImage(slugOf[item.category], item.id), (lang) => entityCard(item, lang))
  for (const hub of hubs) await both(ogImage('in', hub.slug), (lang) => hubCard(hub, lang))
  await both(ogImage('map'), mapCard)
  for (const id of Object.keys(tools)) await both(ogImage(id), (lang) => toolCard(id, lang))
  save('/map.svg', worldSvg(RED))
  for (const item of items) save(`/badge/${slugOf[item.category]}/${item.id}.svg`, badge(item))

  // Short links people can say out loud: /uae → /in/uae. A slug that is already a page or file is skipped, since a
  // redirect would shadow it.
  const taken = (dir: string) => new Set(readdirSync(dir).map((f) => f.replace(/\.html$/, '')))
  const top = taken(OUT), bnTop = taken(`${OUT}/bn`)
  const redirects = hubs.flatMap((hb) => {
    if (top.has(hb.slug) || bnTop.has(hb.slug)) return console.warn(`seo: no short link /${hb.slug}: that path is taken`), []
    return [`/${hb.slug} ${hb.path} 301`, `/bn/${hb.slug} /bn${hb.path} 301`]
  })
  save('/_redirects', `${redirects.join('\n')}\n`)
  save('/robots.txt', `User-agent: *\nAllow: /\nDisallow: /card/\n${SITE ? `Sitemap: ${SITE}/sitemap.xml\n` : ''}`)
  const n = (1 + categories.length + items.length + hubs.length + 1 + Object.keys(tools).length) * langs.length
  console.log(`seo: ${n} preview images (en + bn), map, ${items.length} badges, ${redirects.length} short links, robots.txt`)
  if (shrunk.length) console.log(`seo: ${shrunk.length} shrunk to fit${shrunk.some((x) => !x.endsWith('×0.9')) ? `; most: ${shrunk.filter((x) => !x.endsWith('×0.9')).join(', ')}` : ''}`)
}
