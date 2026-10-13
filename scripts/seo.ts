// Post-build: a 1200×630 link-preview image for every page, and robots.txt, written into the client output.
// Runs after `vite build` (package.json "build") from the same data and wording as the pages, so a preview can't
// drift from its page and every new entry gets one without a manual step. Pages point at these via seo() in lib/site.ts.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createElement as h, type ReactNode } from 'react'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { loadEnv } from 'vite'
import { categories } from '../src/data/rows.ts'
import { counts, countriesNow, countryName, items, slugOf, totals, TODAY, type Item } from '../src/data/index.ts'
import type { Status } from '../src/data/derive.ts'
import { categoryLabel, fmtDate, headline, phrase, placeName, prep, scope, statusLabel } from '../src/lib/i18n.ts'
import { BD_PATH, BD_VIEWBOX } from '../src/lib/bd-outline.ts'
import { ogImage } from '../src/lib/site.ts'

const OUT = 'dist/client'
const SITE = (loadEnv('production', process.cwd(), 'VITE_').VITE_SITE_URL ?? '').replace(/\/$/, '')
const RED = '#e3141c', INK = '#0a0a0a', W = 1200, H = 630

const font = (f: string) => readFileSync(new URL(`fonts/${f}`, import.meta.url))
const fonts = [
  { name: 'Anton', data: font('anton.woff'), weight: 400 as const },
  { name: 'Inter', data: font('inter-800.woff'), weight: 800 as const },
  { name: 'Mono', data: font('mono-700.woff'), weight: 700 as const },
]
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
  return h('img', { src: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${iconSvg[s].replaceAll('C', color)}</svg>`), width: px, height: px })
}

const mono = (px: number, children: ReactNode) => h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'Mono', fontSize: px, letterSpacing: 2, color: '#fff' } }, children)

// The page's halftone: 9% black dots on a 5px grid, drawn at 2x for a 1200px card.
const dots = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><pattern id="d" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1.6" fill="#000" fill-opacity=".09"/></pattern></defs><rect width="100%" height="100%" fill="url(#d)"/></svg>`)

function frame(children: ReactNode[], foot: string) {
  return h(
    'div',
    { style: { width: W, height: H, display: 'flex', backgroundColor: RED, backgroundImage: `url(${dots})`, color: INK, fontFamily: 'Inter' } },
    h(
      'div',
      { style: { width: W - 120, height: H - 112, margin: '56px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } },
      ...children,
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        h('div', { style: { fontSize: 22, color: '#fff' } }, foot),
        h(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'Anton', fontSize: 38 } }, icon('shut', 36, INK), 'IS BD BANNED HERE?'),
          mono(22, SITE ? SITE.replace(/^https?:\/\//, '') : '#ISBDBANNEDHERE'),
        ),
      ),
    ),
  )
}

function entityCard(item: Item) {
  const status = item.state.status
  const q = `Is BD banned ${prep(item.category)} ${placeName(item)}?`.toUpperCase()
  const size = q.length > 52 ? 62 : q.length > 36 ? 76 : 92
  const sources = item.events.flatMap((e) => e.sources)
  const top = sources.find((s) => s.tier === 'official') ?? sources[0]
  const foot = `${top ? `Source: ${top.publisher}${item.conf.sources > 1 ? ` + ${item.conf.sources - 1} more` : ''} · ` : ''}As of ${fmtDate(TODAY)}`
  const where = [item.city, item.country ? countryName(item.country) : 'Global', categoryLabel.en[item.category]].filter(Boolean).join(' · ').toUpperCase()
  return frame(
    [
      mono(24, [item.country ? h('img', { key: 'f', src: flag(item.country), height: 26, width: 39 }) : null, where]),
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 40 } },
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', flex: 1 } },
          h('div', { style: { fontFamily: 'Anton', fontSize: size, lineHeight: 1 } }, q),
          h('div', { style: { fontSize: 38, lineHeight: 1.2, color: '#fff', marginTop: 18 } }, `${headline.en[status]} ${status === 'none' ? 'Nobody has sent a receipt yet.' : `${scope(item).replace(/^./, (x) => x.toUpperCase())}.`}`),
        ),
        icon(status, 210),
      ),
    ],
    foot,
  )
}

function categoryCard(c: (typeof categories)[number]) {
  const n = counts(c)
  const rows = (['shut', 'disputed', 'restricted', 'unclear', 'reopened'] as const).filter((s) => n[s])
  // Reopened places are not bans: count and word the card from the rest, worst status first.
  const bans = rows.filter((s) => s !== 'reopened')
  const active = n.reported - n.reopened
  return frame(
    [
      mono(24, `${categoryLabel.en[c]} · AS OF ${fmtDate(TODAY)}`.toUpperCase()),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        h('div', { style: { fontFamily: 'Anton', fontSize: 120, lineHeight: 1, display: 'flex', gap: 28 } }, h('span', { style: { color: '#fff' } }, String(active)), categoryLabel.en[c].toUpperCase()),
        h('div', { style: { fontSize: 40, color: '#fff', marginTop: 8 } }, bans[0] ? `${phrase(bans[0], c, true, bans.length > 1).replace(/^./, (x) => x.toUpperCase())}.` : 'No bans reported.'),
        h('div', { style: { display: 'flex', gap: 30, marginTop: 26 } }, ...rows.map((s) => h('div', { key: s, style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 30 } }, icon(s, 34), `${n[s]} ${statusLabel.en[s].toLowerCase()}`))),
      ),
    ],
    `Every entry links its sources · ${totals.sources} sources`,
  )
}

function homeCard() {
  const where = countriesNow
  return frame(
    [
      mono(24, `AS OF ${fmtDate(TODAY)} · ${totals.sources} SOURCES`.toUpperCase()),
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', width: 820 } },
          h('div', { style: { fontFamily: 'Anton', fontSize: 86, lineHeight: 0.98, display: 'flex', flexWrap: 'wrap' } }, ...['WHERE', 'BANGLADESHIS', 'ARE', 'BANNED', 'RIGHT', 'NOW.'].map((w) => h('span', { key: w, style: { marginRight: 22, color: w === 'BANNED' ? '#fff' : INK } }, w))),
          h('div', { style: { fontSize: 34, color: '#fff', marginTop: 16 } }, `${totals.places} places in ${where.length} countries`),
          h('div', { style: { display: 'flex', gap: 8, marginTop: 14 } }, ...where.slice(0, 14).map((c) => h('img', { key: c.code, src: flag(c.code), width: 42, height: 28 }))),
        ),
        h('img', {
          width: 230,
          height: 315,
          src: svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BD_VIEWBOX}"><path d="${BD_PATH}" fill="none" stroke="${INK}" stroke-opacity=".6" stroke-width="1.4" stroke-linejoin="round"/><g fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="6"><circle cx="52" cy="66" r="44"/><line x1="21" y1="35" x2="83" y2="97"/></g></svg>`),
        }),
      ),
    ],
    'Universities, companies, visas and countries. With the receipts.',
  )
}

async function write(path: string, node: ReactNode) {
  const png = new Resvg(await satori(node, { width: W, height: H, fonts })).render().asPng()
  const file = `${OUT}${path}`
  mkdirSync(file.slice(0, file.lastIndexOf('/')), { recursive: true })
  writeFileSync(file, png)
}

await write(ogImage(), homeCard())
for (const c of categories) await write(ogImage(slugOf[c]), categoryCard(c))
for (const item of items) await write(ogImage(slugOf[item.category], item.id), entityCard(item))
writeFileSync(`${OUT}/robots.txt`, `User-agent: *\nAllow: /\nDisallow: /card/\n${SITE ? `Sitemap: ${SITE}/sitemap.xml\n` : ''}`)
console.log(`seo: ${items.length + categories.length + 1} preview images, robots.txt`)
