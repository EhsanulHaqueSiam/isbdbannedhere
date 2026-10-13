import type { Category, Row } from '../data/rows.ts'
import type { Status } from '../data/derive.ts'

export type Lang = 'en' | 'bn'

const en = {
  brand: 'Is BD banned here?',
  heroA: "Where we're",
  heroB: 'banned',
  heroC: 'right now.',
  places: 'places',
  categoriesN: 'categories',
  reopenedN: 'reopened',
  sourcesN: 'sources',
  search: 'Search a university, company, country…',
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
  sendReceipt: 'Something changed? Send a receipt',
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
  heroA: 'যেখানে আমরা',
  heroB: 'নিষিদ্ধ',
  heroC: 'এখন।',
  places: 'জায়গা',
  categoriesN: 'বিভাগ',
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
  sendReceipt: 'কিছু বদলেছে? প্রমাণ পাঠান',
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
  en: { bachelors: 'Bachelors', masters: 'Masters', phd: 'PhD', research: 'Research', signup: 'Sign up', pay: 'Pay', getpaid: 'Get paid', jobs: 'Jobs', visit: 'Visit', medical: 'Medical', study: 'Study', work: 'Work', publish: 'Publish', attend: 'Attend', entry: 'Entry', transit: 'Transit', book: 'Book', student: 'Student visa', settle: 'Settle' },
  bn: { bachelors: 'স্নাতক', masters: 'মাস্টার্স', phd: 'পিএইচডি', research: 'গবেষণা', signup: 'অ্যাকাউন্ট', pay: 'পেমেন্ট', getpaid: 'টাকা পাওয়া', jobs: 'চাকরি', visit: 'ভ্রমণ', medical: 'চিকিৎসা', study: 'পড়াশোনা', work: 'কাজ', publish: 'প্রকাশ', attend: 'অংশগ্রহণ', entry: 'প্রবেশ', transit: 'ট্রানজিট', book: 'বুকিং', student: 'স্টুডেন্ট ভিসা', settle: 'স্থায়ী বসবাস' },
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

/** One caption per share, written for Facebook: plain English, the date, the link, the tag, a Banglish line. */
export function caption(name: string, status: Status, asOf: string, url: string) {
  return `${name} ${verb[status]} (as of ${asOf}). Check before you apply: ${url}\n${en.banglish} 👇 #isBDbannedhere`
}

export function fmtDate(d: string | undefined, lang: Lang = 'en') {
  if (!d) return ''
  const [y, m, day] = d.split('-').map(Number)
  const date = new Date(Date.UTC(y ?? 2000, (m ?? 1) - 1, day ?? 1))
  const opts: Intl.DateTimeFormatOptions = day ? { day: 'numeric', month: 'short', year: 'numeric' } : m ? { month: 'short', year: 'numeric' } : { year: 'numeric' }
  return date.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { ...opts, timeZone: 'UTC' })
}
