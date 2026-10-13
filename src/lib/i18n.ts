import { rowsByCategory, type Category, type Row } from '../data/rows.ts'
import { severity, type RowState, type Status } from '../data/derive.ts'
import type { Item } from '../data/index.ts'

export type Lang = 'en' | 'bn'

const en = {
  brand: 'Is BD banned here?',
  heroA: 'Where Bangladeshis are',
  heroB: 'banned',
  heroC: 'right now.',
  bannedIn: (n: number) => `Banned or restricted in ${n} ${n === 1 ? 'country' : 'countries'}`,
  countriesN: 'countries',
  withReport: 'places with a report',
  tracked: 'tracked',
  details: 'Details',
  places: 'places',
  reopenedN: 'reopened',
  sourcesN: 'sources',
  search: 'Search a country, university, company…',
  searchEmpty: 'Nothing yet. Know something? Send the receipt.',
  latest: 'Latest',
  closedOverTime: 'Places closed to us',
  seeAll: 'See all',
  stillOpen: 'Still open',
  nextSteps: 'What to do',
  receipts: 'Receipts',
  history: 'History',
  share: 'Share',
  shareTitle: 'Share this',
  story: 'Story',
  post: 'Post',
  video: 'Video',
  link: 'Link',
  shareNow: 'Share',
  download: 'Download',
  copyCaption: 'Copy caption',
  copied: 'Copied',
  copyLink: 'Copy link',
  asOf: 'As of',
  checked: 'Checked',
  myList: 'My list',
  checkList: 'Check my list',
  noEntries: 'No entries yet',
  myListTitle: 'I checked my list.',
  myListHint: 'Add the places you plan to apply to or visit. Stays on this phone.',
  add: 'Add',
  remove: 'Remove',
  notSafe: (n: number, of: number) => `${n} of ${of} not safe`,
  makeCard: 'Make my card',
  receiptTitle: 'Seen news about a ban? Send the link',
  receiptLink: 'Paste a news link or official page',
  receiptNote: 'Anything to add? (optional)',
  receiptWhere: 'Which place is it about? (optional)',
  send: 'Send',
  sending: 'Sending…',
  receiptHow: 'We read every link before anything changes here. No sign-in; nothing about you is published.',
  receiptAdded: 'Added to the review queue',
  receiptFor: 'For',
  receiptPlace: 'We will attach it to the right entry when we check it.',
  stepReceived: 'Received',
  stepChecked: 'Source checked',
  stepLive: 'On the page',
  track: 'Track this receipt',
  receiptState: {
    done: 'Got it, thanks. It goes live once we have checked the source.',
    duplicate: 'We already have this link. Thanks.',
    invalid: "That doesn't look like a web link. Paste the full address of the article.",
    busy: 'That is a lot of links for one day. Try again tomorrow.',
    unavailable: "Couldn't send right now. Try again in a bit.",
  },
  reply: 'Are you this institution? Reply on the record',
  about: 'How this works',
  corrections: 'Corrections',
  noReportsNote: 'No reports means nobody has sent a receipt yet. It is not a guarantee.',
  silence: 'days since the end date passed. No word.',
  confidence: { official: 'Official source', press: 'Press reports', community: 'Community reports', none: 'No sources yet' },
  sinceWord: 'since',
  untilWord: 'until',
  months: 'months',
  banglish: 'apply korar age check koro',
}

type Dict = typeof en

const bn: Dict = {
  brand: 'বাংলাদেশ কি এখানে নিষিদ্ধ?',
  heroA: 'যেখানে বাংলাদেশিরা এখন',
  heroB: 'নিষিদ্ধ',
  heroC: '',
  bannedIn: (n: number) => `${n}টি দেশে নিষিদ্ধ বা সীমিত`,
  countriesN: 'দেশ',
  withReport: 'রিপোর্ট আছে এমন জায়গা',
  tracked: 'জায়গা দেখা হচ্ছে',
  details: 'বিস্তারিত',
  places: 'জায়গা',
  reopenedN: 'আবার খুলেছে',
  sourcesN: 'সূত্র',
  search: 'বিশ্ববিদ্যালয়, কোম্পানি, দেশ খুঁজুন…',
  searchEmpty: 'এখনও কিছু নেই। কিছু জানেন? প্রমাণ পাঠান।',
  latest: 'সর্বশেষ',
  closedOverTime: 'আমাদের জন্য বন্ধ জায়গা',
  seeAll: 'সব দেখুন',
  stillOpen: 'এখনও খোলা',
  nextSteps: 'কী করবেন',
  receipts: 'প্রমাণ',
  history: 'ইতিহাস',
  share: 'শেয়ার',
  shareTitle: 'শেয়ার করুন',
  story: 'স্টোরি',
  post: 'পোস্ট',
  video: 'ভিডিও',
  link: 'লিংক',
  shareNow: 'শেয়ার',
  download: 'ডাউনলোড',
  copyCaption: 'ক্যাপশন কপি',
  copied: 'কপি হয়েছে',
  copyLink: 'লিংক কপি',
  asOf: 'তারিখ',
  checked: 'যাচাই',
  myList: 'আমার তালিকা',
  checkList: 'আমার তালিকা যাচাই করুন',
  noEntries: 'এখনও কিছু নেই',
  myListTitle: 'আমার তালিকা দেখলাম।',
  myListHint: 'যেখানে আবেদন করবেন বা যাবেন, যোগ করুন। এই ফোনেই থাকবে।',
  add: 'যোগ',
  remove: 'বাদ',
  notSafe: (n: number, of: number) => `${of}টির মধ্যে ${n}টি নিরাপদ নয়`,
  makeCard: 'আমার কার্ড বানান',
  receiptTitle: 'নিষেধাজ্ঞার খবর দেখেছেন? লিংক পাঠান',
  receiptLink: 'খবরের লিংক বা অফিশিয়াল পেজ দিন',
  receiptNote: 'কিছু যোগ করবেন? (ঐচ্ছিক)',
  receiptWhere: 'কোন জায়গা নিয়ে? (ঐচ্ছিক)',
  send: 'পাঠান',
  sending: 'পাঠানো হচ্ছে…',
  receiptHow: 'এখানে কিছু বদলানোর আগে আমরা প্রতিটি লিংক পড়ে দেখি। সাইন-ইন লাগবে না; আপনার কোনো তথ্য প্রকাশ হবে না।',
  receiptAdded: 'যাচাইয়ের তালিকায় যোগ হয়েছে',
  receiptFor: 'জন্য',
  receiptPlace: 'যাচাইয়ের সময় আমরা এটি সঠিক জায়গায় যোগ করব।',
  stepReceived: 'পেয়েছি',
  stepChecked: 'সূত্র যাচাই',
  stepLive: 'পেজে প্রকাশ',
  track: 'এই প্রমাণের অবস্থা দেখুন',
  receiptState: {
    done: 'পেয়েছি, ধন্যবাদ। সূত্র যাচাইয়ের পর এটি প্রকাশ হবে।',
    duplicate: 'এই লিংকটি আগেই পেয়েছি। ধন্যবাদ।',
    invalid: 'এটি ওয়েব লিংক মনে হচ্ছে না। খবরের পুরো ঠিকানা দিন।',
    busy: 'আজ অনেক লিংক এসেছে। কাল আবার চেষ্টা করুন।',
    unavailable: 'এখন পাঠানো যাচ্ছে না। একটু পরে চেষ্টা করুন।',
  },
  reply: 'আপনি কি এই প্রতিষ্ঠান? আপনার জবাব দিন',
  about: 'এটি কীভাবে কাজ করে',
  corrections: 'সংশোধন',
  noReportsNote: 'কোনো রিপোর্ট নেই মানে কেউ এখনও প্রমাণ পাঠায়নি। এটি নিশ্চয়তা নয়।',
  silence: 'দিন হলো শেষ তারিখ পেরিয়েছে। কোনো খবর নেই।',
  confidence: { official: 'অফিশিয়াল সূত্র', press: 'সংবাদ সূত্র', community: 'কমিউনিটি রিপোর্ট', none: 'এখনও সূত্র নেই' },
  sinceWord: 'থেকে',
  untilWord: 'পর্যন্ত',
  months: 'মাস',
  banglish: 'আবেদন করার আগে দেখে নিন',
}

export const dict: Record<Lang, Dict> = { en, bn }

// Headline words are locked to the status. Never "Banned." on a restriction.
export const headline: Record<Lang, Record<Status, string>> = {
  en: { shut: 'Banned.', restricted: 'Restricted.', unclear: 'Unclear.', disputed: 'Banned or not?', reopened: 'Reopened.', none: 'No reports.' },
  bn: { shut: 'নিষিদ্ধ।', restricted: 'সীমিত।', unclear: 'অস্পষ্ট।', disputed: 'নিষিদ্ধ নাকি না?', reopened: 'আবার খুলেছে।', none: 'কোনো রিপোর্ট নেই।' },
}

export const statusLabel: Record<Lang, Record<Status, string>> = {
  en: { shut: 'Shut out', restricted: 'Restricted', unclear: 'Unclear', disputed: 'Disputed', reopened: 'Reopened', none: 'No reports' },
  bn: { shut: 'বন্ধ', restricted: 'সীমিত', unclear: 'অস্পষ্ট', disputed: 'বিতর্কিত', reopened: 'আবার খোলা', none: 'রিপোর্ট নেই' },
}

export const categoryLabel: Record<Lang, Record<Category, string>> = {
  en: { university: 'Universities', company: 'Companies', city: 'Cities', publication: 'Publications', tourism: 'Tourism', country: 'Countries' },
  bn: { university: 'বিশ্ববিদ্যালয়', company: 'কোম্পানি', city: 'শহর', publication: 'প্রকাশনা', tourism: 'ভ্রমণ', country: 'দেশ' },
}

export const rowLabel: Record<Lang, Record<Row, string>> = {
  en: { bachelors: 'Bachelors', masters: 'Masters', phd: 'PhD', research: 'Research', signup: 'Sign up', pay: 'Pay', getpaid: 'Get paid', jobs: 'Jobs', visit: 'Visit', medical: 'Medical', study: 'Study', work: 'Work', publish: 'Publish', attend: 'Attend', fund: 'Funding', entry: 'Entry', transit: 'Transit', book: 'Book', student: 'Student visa', settle: 'Settle' },
  bn: { bachelors: 'স্নাতক', masters: 'মাস্টার্স', phd: 'পিএইচডি', research: 'গবেষণা', signup: 'অ্যাকাউন্ট', pay: 'পেমেন্ট', getpaid: 'টাকা পাওয়া', jobs: 'চাকরি', visit: 'ভ্রমণ', medical: 'চিকিৎসা', study: 'পড়াশোনা', work: 'কাজ', publish: 'প্রকাশ', attend: 'অংশগ্রহণ', fund: 'অনুদান', entry: 'প্রবেশ', transit: 'ট্রানজিট', book: 'বুকিং', student: 'স্টুডেন্ট ভিসা', settle: 'স্থায়ী বসবাস' },
}

export const nextSteps: Record<Lang, Record<Status, string[]>> = {
  en: {
    shut: ["Don't pay an application, visa or setup fee here until this changes.", 'Already applied? Ask them in writing how your application is affected.', "See what's still open below."],
    restricted: ['Read the conditions on their official page before you pay anything.', 'Expect extra documents, deposits or delays.', 'Keep a backup from the list below.'],
    unclear: ['The announced end date passed with no update.', 'Ask them directly, then send us their answer as a receipt.', 'Treat it as closed until someone confirms.'],
    disputed: ['Sources disagree. Both sides are listed below.', 'Check the official page or the embassy before you plan.', 'Applied recently? Send a receipt.'],
    reopened: ['Confirm on their official page; reopenings can come with new conditions.', 'Tell the people who were waiting.'],
    none: ['Nobody has reported a restriction for Bangladeshis here.', "That's not a guarantee. Check their own page too."],
  },
  bn: {
    shut: ['পরিস্থিতি না বদলানো পর্যন্ত এখানে আবেদন, ভিসা বা কোনো ফি দেবেন না।', 'আগেই আবেদন করেছেন? লিখিতভাবে জানতে চান আপনার আবেদনের কী হবে।', 'নিচে দেখুন কোথায় এখনও খোলা।'],
    restricted: ['কিছু দেওয়ার আগে তাদের অফিশিয়াল পেজে শর্তগুলো পড়ুন।', 'বাড়তি কাগজপত্র, জামানত বা দেরি হতে পারে।', 'নিচের তালিকা থেকে একটি বিকল্প রাখুন।'],
    unclear: ['ঘোষিত শেষ তারিখ পেরিয়ে গেছে, কোনো আপডেট নেই।', 'সরাসরি জিজ্ঞেস করুন, তারপর উত্তরটি প্রমাণ হিসেবে পাঠান।', 'কেউ নিশ্চিত না করা পর্যন্ত বন্ধ ধরে নিন।'],
    disputed: ['সূত্রগুলো একমত নয়। দুই পক্ষই নিচে আছে।', 'পরিকল্পনার আগে অফিশিয়াল পেজ বা দূতাবাসে যাচাই করুন।', 'সম্প্রতি আবেদন করেছেন? প্রমাণ পাঠান।'],
    reopened: ['অফিশিয়াল পেজে নিশ্চিত হোন; নতুন শর্ত থাকতে পারে।', 'যারা অপেক্ষায় ছিল তাদের জানান।'],
    none: ['এখানে বাংলাদেশিদের জন্য কোনো বিধিনিষেধের রিপোর্ট নেই।', 'এটি নিশ্চয়তা নয়। তাদের নিজস্ব পেজও দেখুন।'],
  },
}

const verb: Record<Status, string> = {
  shut: 'has shut out Bangladeshis',
  restricted: 'restricts Bangladeshis',
  unclear: "hasn't said if it still bars Bangladeshis",
  disputed: 'may have barred Bangladeshis; sources disagree',
  reopened: 'reopened to Bangladeshis',
  none: 'has no reported restrictions for Bangladeshis',
}

// Who a category's restriction hits.
const noun: Record<Category, string> = { university: 'students', company: 'users', city: 'visitors', publication: 'writers', tourism: 'travellers', country: 'applicants' }

/** "Is BD banned at" a university or company, "in" a country or city. */
export const prep = (c: Category) => (c === 'tourism' || c === 'country' || c === 'city' ? 'in' : 'at')

/** The one sentence a card says. Wording follows the status, never stronger. */
export function sentence(item: Item): string {
  const n = noun[item.category]
  const name = item.name
  const s: Record<Status, string> = {
    shut: `${name} has shut out Bangladeshi ${n}.`,
    restricted: `${name} restricts Bangladeshi ${n}.`,
    unclear: `${name}'s ban on Bangladeshi ${n} passed its end date. No word since.`,
    disputed: `Reports say ${name} shut out Bangladeshi ${n}. Others deny it.`,
    reopened: `${name} reopened to Bangladeshi ${n}.`,
    none: `No reported restrictions for Bangladeshi ${n} at ${name}.`,
  }
  return s[item.state.status]
}

/** The row state that decides the entity's status, for "since" and scope lines. */
export function leadRow(item: Item): RowState | undefined {
  return Object.values(item.state.rows).sort((a, b) => severity[b.status] - severity[a.status])[0]
}

/** What is affected and since when: "all levels, since Dec 2025". */
export function scope(item: Item): string {
  const rows = rowsByCategory[item.category]
  const hit = rows.filter((r) => item.state.rows[r]?.status === item.state.status)
  const what = hit.length === rows.length ? (item.category === 'university' ? 'all levels' : 'everything') : hit.map((r) => rowLabel.en[r].toLowerCase()).join(', ')
  const lead = leadRow(item)
  return lead?.since ? `${what}, since ${fmtDate(lead.since)}` : what
}

/**
 * Feed headline after a name or a count, lowercase (.ttl capitalises it): "shut out Bangladeshi students".
 * `plural` for clusters ("32 universities restrict…"); `mixed` when a cluster holds more than one status.
 */
export function phrase(status: Status, category: Category, plural = false, mixed = false): string {
  const n = noun[category]
  if (mixed) return `shut out or restrict Bangladeshi ${n}`
  const p: Record<Status, string> = {
    shut: `shut out Bangladeshi ${n}`,
    restricted: `${plural ? 'restrict' : 'restricts'} Bangladeshi ${n}`,
    disputed: `reported to bar Bangladeshi ${n}, disputed`,
    reopened: `reopened to Bangladeshi ${n}`,
    unclear: 'ban passed its end date, no word since',
    none: 'no reports',
  }
  return p[status]
}

/** Name people type: "UAE", not "United Arab Emirates", for country-level entries. */
export const placeName = (i: Pick<Item, 'category' | 'country' | 'name'>) => ((i.category === 'tourism' || i.category === 'country') && i.country && shortName[i.country]) || i.name

/** Search-friendly page title, shaped like what people type: "UAE visa for Bangladeshis: Banned." */
export function seoTitle(item: Item): string {
  const h = headline.en[item.state.status]
  const t: Record<Category, string> = {
    university: `${item.name} for Bangladeshi students: ${h}`,
    company: `${item.name} in Bangladesh: ${h}`,
    tourism: `${placeName(item)} visa for Bangladeshis: ${h}`,
    country: `${placeName(item)} work and student visas for Bangladeshis: ${h}`,
    city: `${item.name} for Bangladeshis: ${h}`,
    publication: `${item.name} for Bangladeshis: ${h}`,
  }
  return t[item.category]
}

/** One caption per share, written for Facebook: plain English, the date, the link, the tag, a Banglish line. */
export function caption(name: string, status: Status, asOf: string, url: string) {
  return `${name} ${verb[status]} (as of ${asOf}). Check before you apply: ${url}\n${en.banglish} 👇 #isBDbannedhere`
}

/** Short names people use for these countries. Everything else comes from the data's own names. */
export const shortName: Partial<Record<string, string>> = { GB: 'UK', AE: 'UAE', US: 'USA' }

const monthNames = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  bn: ['জানু', 'ফেব', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুল', 'আগ', 'সেপ', 'অক্টো', 'নভে', 'ডিসে'],
}
const bnDigits = (s: string) => s.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]!)

/** Short month name, 1-12. */
export const monthName = (m: number, lang: Lang = 'en') => monthNames[lang][m - 1] ?? ''

/**
 * "13 Oct 2026", "Oct 2026" or "2026"; Bangla months and digits for bn. Fixed names, not toLocaleDateString:
 * Node prints "Sept" where Safari prints "Sep", and that mismatch broke hydration.
 */
export function fmtDate(d: string | undefined, lang: Lang = 'en') {
  if (!d) return ''
  const [y, m, day] = d.split('-').map(Number)
  const mon = m ? monthName(m, lang) : ''
  const s = day ? (lang === 'bn' ? `${day} ${mon}, ${y}` : `${day} ${mon} ${y}`) : mon ? `${mon} ${y}` : `${y}`
  return lang === 'bn' ? bnDigits(s) : s
}
