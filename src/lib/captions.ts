import type { Category, Row } from '../data/rows.ts'
import type { Status } from '../data/derive.ts'
import type { Item } from '../data/index.ts'
import type { Purpose, Verdict } from '../data/tools.ts'
import { categoryLabel, fmtDate, headline, leadRow, noun, rowLabel, scope, sentence, statusLabel, type Lang } from './i18n.ts'
import { mentions } from './share.ts'

// Words for everything that gets shared: captions (Bangla first, English below), the Bangla twin of each card
// sentence, the share UI strings, and fitSize(), which picks a font size so no card text ever runs off its box.

/** Bengali digits for bn. */
export const num = (n: number, lang: Lang) => (lang === 'bn' ? String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]!) : String(n))

// ---- text that fits ----

/** Average glyph width per character, in em, measured in Chrome with a little headroom (Anton caps ≤ 0.44, Noto Sans Bengali 800 ≤ 0.53, system sans 800 ≤ 0.51). */
export const EM = { anton: 0.46, bangla: 0.55, sans: 0.52, marker: 0.52 } as const
const bangla = /[ঀ-৿]/

/** Lines a greedy word wrap needs at `chars` characters per line. */
function wrapCount(words: string[], chars: number) {
  let n = 1
  let len = 0
  for (const w of words) {
    if (len && len + 1 + w.length > chars) (n++, (len = w.length))
    else len += (len ? 1 : 0) + w.length
  }
  return n
}

/**
 * Largest font size (px) at which `text` fits `width` in at most `lines` lines, capped at `max`. `min` is a floor
 * for legibility, but never so big that the longest single word would overflow: below it the text just wraps more.
 * Bangla text is measured with the Bangla face whatever `face` says.
 */
export function fitSize(text: string, width: number, max: number, { lines = 1, min = 0, face = 'anton' }: { lines?: number; min?: number; face?: keyof typeof EM } = {}) {
  const em = bangla.test(text) ? EM.bangla : EM[face]
  const words = text.trim().split(/\s+/)
  const longest = Math.max(...words.map((w) => w.length))
  let chars = longest
  while (wrapCount(words, chars) > lines) chars++
  const px = (c: number) => Math.floor(width / (c * em))
  return Math.max(Math.min(min, px(longest)), Math.min(max, px(chars)))
}

// ---- card sentences in Bangla ----

const nounBn: Record<Category, string> = { university: 'শিক্ষার্থী', company: 'ব্যবহারকারী', city: 'দর্শনার্থী', publication: 'লেখক', tourism: 'ভ্রমণকারী', country: 'আবেদনকারী' }

type Sayable = Pick<Item, 'name' | 'nameBn' | 'category'> & { state: { status: Status } }

/** Who a restriction hits, for the card's white slab: "Bangladeshi students", "বাংলাদেশি শিক্ষার্থী". */
export const whoIn = (category: Category, lang: Lang) => (lang === 'bn' ? `বাংলাদেশি ${nounBn[category]}` : `Bangladeshi ${noun[category]}`)

/** Bangla twin of i18n's sentence(), same strength, for captions. */
function sentenceBn(item: Sayable) {
  const n = `বাংলাদেশি ${nounBn[item.category]}দের`
  const name = item.nameBn ?? item.name
  const s: Record<Status, string> = {
    shut: `${name} ${n} জন্য বন্ধ।`,
    restricted: `${name} ${n} ওপর বিধিনিষেধ দিয়েছে।`,
    unclear: `${n} ওপর ${name}-এর নিষেধাজ্ঞার মেয়াদ পেরিয়েছে। এরপর কোনো খবর নেই।`,
    disputed: `রিপোর্ট বলছে ${name} ${n} বন্ধ করেছে। অন্যরা তা অস্বীকার করছে।`,
    reopened: `${name} ${n} জন্য আবার খুলেছে।`,
    none: `${name}-এ ${n} জন্য কোনো বিধিনিষেধের রিপোর্ট নেই।`,
  }
  return s[item.state.status]
}

/** "all levels, since Dec 2025" in either language. */
export function scopeIn(item: Item, lang: Lang): string {
  if (lang === 'en') return scope(item)
  const rows = Object.keys(item.state.rows) as Row[]
  const hit = rows.filter((r) => item.state.rows[r]?.status === item.state.status)
  const what = hit.length === rows.length ? (item.category === 'university' ? 'সব স্তর' : 'সবকিছু') : hit.map((r) => rowLabel.bn[r]).join(', ')
  const since = leadRow(item)?.since
  return since ? `${what}, ${fmtDate(since, 'bn')} থেকে` : what
}

// ---- captions ----

export type Mode = 'bn' | 'en'

/** Who a share tags: the entity's own account (X preferred) and the officials who answer for it. */
export function tagOptions(item: Pick<Item, 'handles' | 'officials' | 'name'>): { handle: string; name: string }[] {
  const pick = (h: { x?: string; facebook?: string; instagram?: string }) => h.x ?? h.facebook ?? h.instagram
  const own = item.handles && pick(item.handles)
  const all = [...(own ? [{ handle: own, name: item.name }] : []), ...(item.officials ?? []).flatMap((o) => (pick(o) ? [{ handle: pick(o)!, name: o.name }] : []))]
  // First one wins: the entity's own account before an official with the same handle.
  return all.filter((t, i) => all.findIndex((o) => o.handle.toLowerCase() === t.handle.toLowerCase()) === i)
}

const friendLine = { bn: '@friend কোনো ফি দেওয়ার আগে চেক করে নিও', en: '@friend check before you pay any fee' }

/**
 * Caption for an entry. `bn` mode is Bangla first with English below (the default: most readers are in Bangladesh);
 * `en` is English only, for X and for tagging officials abroad. Tags and the friend line sit just above the hashtag.
 * The link is added per channel (tracked), so it is not part of the text.
 */
export function caption(item: Item, { mode, asOf, tags = [], friend = false }: { mode: Mode; asOf: string; tags?: string[]; friend?: boolean }) {
  const bn = `${sentenceBn(item)} (${fmtDate(asOf, 'bn')})\nআবেদনের আগে দেখে নিন 👇`
  const en = `${sentence(item)} As of ${fmtDate(asOf)}. Check before you apply 👇`
  return join(mode === 'bn' ? [bn, en] : [en], tags, friend ? friendLine[mode] : '')
}

/** Caption for a tool card (check, compare, week): the page supplies both languages. */
export function toolCaption(text: { bn: string; en: string }, mode: Mode) {
  return join(mode === 'bn' ? [text.bn, text.en] : [text.en])
}

function join(blocks: string[], tags: string[] = [], friend = '') {
  return [...blocks, [mentions(tags), friend].filter(Boolean).join('\n'), '#isBDbannedhere'].filter(Boolean).join('\n\n')
}

/** The longer post a group admin pastes into a Facebook group: a heads-up line, both languages, the source, the link. */
export function groupCaption(item: Item, { asOf, url, source }: { asOf: string; url: string; source?: string }) {
  return [
    `সবাই জেনে রাখুন: ${sentenceBn(item)} (${fmtDate(asOf, 'bn')})\nআবেদন বা কোনো ফি দেওয়ার আগে নিজে যাচাই করুন।`,
    `Heads up: ${sentence(item)} As of ${fmtDate(asOf)}. Check before you apply or pay any fee.`,
    `${source ? `Source: ${source}\n` : ''}${url}`,
    '#isBDbannedhere',
  ].join('\n\n')
}

// ---- "Am I affected?" words ----

export const purposeLabel: Record<Lang, Record<Purpose, string>> = {
  en: { study: 'Study', work: 'Work', visit: 'Visit' },
  bn: { study: 'পড়াশোনা', work: 'কাজ', visit: 'ভ্রমণ' },
}

// Country names that read with "the" in English: "Study in the UK".
const withThe = new Set(['GB', 'AE', 'US', 'NL', 'PH', 'MV', 'CZ'])

/** "the UK", "Australia": a country name as it reads mid-sentence in English. */
export const theName = (code: string, name: string) => (withThe.has(code) ? `the ${name}` : name)

/** "Study in the UK", "Visit the UAE"; Bangla puts the purpose first: "পড়াশোনা · যুক্তরাজ্য". */
export function purposeTitle(purpose: Purpose, code: string, name: string, lang: Lang) {
  if (lang === 'bn') return `${purposeLabel.bn[purpose]} · ${name}`
  const place = theName(code, name)
  return purpose === 'visit' ? `Visit ${place}` : `${purposeLabel.en[purpose]} in ${place}`
}

/**
 * Headline, sub-line and a short table cell for a verdict. Counts the loss (DESIGN.md voice): the worst status leads,
 * reopenings are always counted, even at 0.
 */
export function verdictWords(v: Verdict, lang: Lang): { big: string; sub: string; cell: string } {
  const c = v.counts
  const n = c[v.worst]
  const N = num(n, lang)
  if (lang === 'bn') {
    const noun = v.kind === 'university' ? 'বিশ্ববিদ্যালয়' : 'জায়গা'
    const big: Record<Status, string> = {
      shut: `${N}টি ${noun} আপনার জন্য বন্ধ।`,
      disputed: `${N}টি ${noun} হয়তো আপনার জন্য বন্ধ।`,
      restricted: `${N}টি ${noun} আপনার ওপর বিধিনিষেধ দেয়।`,
      unclear: `${N}টি ${noun}: নিষেধাজ্ঞার মেয়াদ শেষ, খবর নেই।`,
      reopened: `${N}টি ${noun} আবার খুলেছে।`,
      none: v.total ? 'কোনো রিপোর্ট নেই।' : 'এখনও কিছু দেখা হয়নি।',
    }
    const sub = v.worst === 'none' ? ['এটি নিশ্চয়তা নয়', 'তাদের নিজস্ব পেজও দেখুন'] : [
      ...(c.restricted && v.worst !== 'restricted' ? [`আরও ${num(c.restricted, 'bn')}টি বিধিনিষেধ দেয়`] : []),
      ...(c.unclear && v.worst !== 'unclear' ? [`${num(c.unclear, 'bn')}টি অস্পষ্ট`] : []),
      ...(v.worst !== 'reopened' ? [`${num(c.reopened, 'bn')}টি আবার খুলেছে`] : []),
      `${num(v.total, 'bn')}টি দেখা হয়েছে`,
    ]
    return { big: big[v.worst], sub: `${sub.join('। ')}।`, cell: v.worst === 'none' ? statusLabel.bn.none : `${N}টি ${statusLabel.bn[v.worst]}` }
  }
  const noun = (k: number) => (v.kind === 'university' ? (k === 1 ? 'university' : 'universities') : k === 1 ? 'place' : 'places')
  const s = n === 1 ? 's' : ''
  const big: Record<Status, string> = {
    shut: `${n} ${noun(n)} shut${s} you out.`,
    disputed: `${n} ${noun(n)} may shut you out.`,
    restricted: `${n} ${noun(n)} restrict${s} you.`,
    unclear: `${n} ${noun(n)}: ban ended, no word since.`,
    reopened: `${n} ${noun(n)} reopened to you.`,
    none: v.total ? 'No reports.' : 'Nothing tracked yet.',
  }
  const sub = v.worst === 'none' ? ['Not a guarantee', 'Check their own pages too'] : [
    ...(c.restricted && v.worst !== 'restricted' ? [`${c.restricted} more restrict`] : []),
    ...(c.unclear && v.worst !== 'unclear' ? [`${c.unclear} unclear`] : []),
    ...(v.worst !== 'reopened' ? [`${c.reopened} reopened`] : []),
    `${v.total} tracked`,
  ]
  return { big: big[v.worst], sub: `${sub.join('. ')}.`, cell: v.worst === 'none' ? statusLabel.en.none : `${n} ${statusLabel.en[v.worst].toLowerCase()}` }
}

// ---- week and story words ----

/** "7–13 Oct 2026", or "28 Sep – 4 Oct 2026" across months. */
export function dateRange(from: string, to: string, lang: Lang) {
  if (from.slice(0, 7) !== to.slice(0, 7)) return `${fmtDate(from, lang).replace(/,? \d{4}$|,? [০-৯]{4}$/, '')} – ${fmtDate(to, lang)}`
  return `${num(Number(from.slice(8)), lang)}–${fmtDate(to, lang)}`
}

type Countable = { banned: number; extended: number; restricted: number; reopened: number }

/** The week's counts as lines, worst first. New bans and reopenings always show, even at 0. */
export function weekLines(c: Countable, lang: Lang): string[] {
  const p = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  if (lang === 'bn')
    return [`${num(c.banned, 'bn')}টি নতুন নিষেধাজ্ঞা`, ...(c.extended ? [`${num(c.extended, 'bn')}টির মেয়াদ বাড়ল`] : []), ...(c.restricted ? [`${num(c.restricted, 'bn')}টি নতুন বিধিনিষেধ`] : []), `${num(c.reopened, 'bn')}টি আবার খুলেছে`]
  return [p(c.banned, 'new ban', 'new bans'), ...(c.extended ? [`${c.extended} extended`] : []), ...(c.restricted ? [p(c.restricted, 'new restriction', 'new restrictions')] : []), `${c.reopened} reopened`]
}

type Titled = { status: Status; category: Category; items: { name: string; nameBn?: string }[]; place?: { en: string; bn: string } }

/** A story's name: the place itself, or "25 UK universities" for a cluster. */
export function storyTitle(s: Titled, lang: Lang) {
  const one = s.items[0]
  if (s.items.length === 1 && one) return lang === 'bn' ? (one.nameBn ?? one.name) : one.name
  const cat = categoryLabel[lang][s.category]
  return lang === 'bn' ? `${s.place ? `${s.place.bn}: ` : ''}${num(s.items.length, 'bn')}টি ${cat}` : `${s.items.length} ${s.place ? `${s.place.en} ` : ''}${cat.toLowerCase()}`
}

/** Names in a cluster: "Coventry, Bucks New and 23 more". */
export function storyNames(s: Titled, lang: Lang, max = 3) {
  const names = s.items.map((i) => (lang === 'bn' ? (i.nameBn ?? i.name) : i.name))
  if (names.length <= max) return names.join(', ')
  return lang === 'bn' ? `${names.slice(0, max).join(', ')} এবং আরও ${num(names.length - max, 'bn')}টি` : `${names.slice(0, max).join(', ')} and ${names.length - max} more`
}

/** A ready-made group post for one story: Bangla first, English below, the link in both. */
export function storyPost(s: Titled & { date: string; summary: string; summaryBn?: string }, url: string) {
  const one = s.items.length === 1
  return [
    `${storyTitle(s, 'bn')}: ${headline.bn[s.status]} (${fmtDate(s.date, 'bn')})\n${one ? (s.summaryBn ?? '') : storyNames(s, 'bn')}\nআবেদন বা কোনো ফি দেওয়ার আগে দেখে নিন: ${url}`.replace(/\n\n/g, '\n'),
    `${storyTitle(s, 'en')}: ${headline.en[s.status]} (${fmtDate(s.date)})\n${one ? s.summary : storyNames(s, 'en')}\nCheck before you apply: ${url}`,
    '#isBDbannedhere',
  ].join('\n\n')
}

type Weekly = { from: string; to: string; counts: Countable; stories: Titled[] }

/** The weekly report in one language, without the link: counts, then up to 4 stories. */
export function weekText(w: Weekly, lang: Lang) {
  const head = `${lang === 'bn' ? 'এই সপ্তাহে' : 'This week'} (${dateRange(w.from, w.to, lang)}): ${weekLines(w.counts, lang).join(', ')}${lang === 'bn' ? '।' : '.'}`
  return [head, ...w.stories.slice(0, 4).map((s) => `${storyTitle(s, lang)}: ${headline[lang][s.status]}`)].join('\n')
}

/** The weekly report as one ready-made post, both languages, with the link. */
export function weekPost(w: Weekly, url: string) {
  return [`${weekText(w, 'bn')}\nবিস্তারিত: ${url}`, `${weekText(w, 'en')}\nDetails: ${url}`, '#isBDbannedhere'].join('\n\n')
}

// ---- tool names (header, footer, page titles) ----

export const tools = ['check', 'compare', 'frame', 'week', 'share'] as const
export type Tool = (typeof tools)[number]
export const toolName: Record<Lang, Record<Tool, string> & { nav: string }> = {
  en: { check: 'Am I affected?', compare: 'Compare countries', frame: 'Profile frame', week: 'This week', share: 'For group admins', nav: 'Check' },
  bn: { check: 'আমি কি আটকে যাব?', compare: 'দেশ মিলিয়ে দেখুন', frame: 'প্রোফাইল ফ্রেম', week: 'এই সপ্তাহ', share: 'গ্রুপ অ্যাডমিনদের জন্য', nav: 'যাচাই' },
}

// ---- share UI strings ----

export const shareText = {
  en: {
    sendTo: 'Send to',
    tagThem: 'Tag them',
    friend: '+ a friend',
    caption: 'Caption',
    copyCaption: 'Copy caption',
    copied: 'Copied',
    linkCopied: 'Link copied',
    groupCopied: 'Post copied. Paste it in the group.',
    igHint: 'In Instagram, add the link sticker: the link is copied.',
    download: 'Download',
    more: 'More',
    close: 'Close',
    captionLang: 'Caption language',
    shareCard: 'Share this card',
    shareThis: 'Share this',
    prompt: 'Know someone applying here? Send it to them.',
    channels: { whatsapp: 'WhatsApp', messenger: 'Messenger', facebook: 'FB group', instagram: 'IG story', x: 'X', telegram: 'Telegram', copy: 'Copy link', fb: 'Facebook' },
  },
  bn: {
    sendTo: 'পাঠান',
    tagThem: 'ট্যাগ করুন',
    friend: '+ একজন বন্ধু',
    caption: 'ক্যাপশন',
    copyCaption: 'ক্যাপশন কপি',
    copied: 'কপি হয়েছে',
    linkCopied: 'লিংক কপি হয়েছে',
    groupCopied: 'পোস্ট কপি হয়েছে। গ্রুপে পেস্ট করুন।',
    igHint: 'ইনস্টাগ্রামে লিংক স্টিকার দিন: লিংক কপি করা আছে।',
    download: 'ডাউনলোড',
    more: 'আরও',
    close: 'বন্ধ',
    captionLang: 'ক্যাপশনের ভাষা',
    shareCard: 'কার্ডটি শেয়ার করুন',
    shareThis: 'শেয়ার করুন',
    prompt: 'কেউ এখানে আবেদন করছে? তাকে পাঠিয়ে দিন।',
    channels: { whatsapp: 'হোয়াটসঅ্যাপ', messenger: 'মেসেঞ্জার', facebook: 'এফবি গ্রুপ', instagram: 'আইজি স্টোরি', x: 'X', telegram: 'টেলিগ্রাম', copy: 'লিংক কপি', fb: 'ফেসবুক' },
  },
} satisfies Record<Lang, unknown>
