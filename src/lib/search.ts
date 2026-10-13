import { severity, type Status } from '../data/derive.ts'

export type Searchable = { name: string; nameBn?: string; aliases: string[]; domain?: string; status: Status; country?: string; city?: string; category: string }

// What people type for a country, in English, Banglish and Bangla. Display names cover the rest.
const countryWords: Record<string, string[]> = {
  GB: ['uk', 'britain', 'england', 'scotland', 'wales', 'london', 'যুক্তরাজ্য', 'ইংল্যান্ড', 'লন্ডন'],
  US: ['usa', 'us', 'america', 'আমেরিকা', 'যুক্তরাষ্ট্র'],
  AE: ['uae', 'dubai', 'emirates', 'abu dhabi', 'দুবাই', 'আমিরাত'],
  IN: ['india', 'ভারত', 'ইন্ডিয়া', 'kolkata', 'কলকাতা'],
  AU: ['australia', 'অস্ট্রেলিয়া'], CA: ['canada', 'কানাডা'], MY: ['malaysia', 'মালয়েশিয়া'],
  DE: ['germany', 'জার্মানি'], JP: ['japan', 'জাপান'], SA: ['saudi', 'saudi arabia', 'সৌদি'], SG: ['singapore', 'সিঙ্গাপুর'],
}
const categoryWords: Record<string, string[]> = {
  university: ['university', 'universities', 'uni', 'college', 'study', 'বিশ্ববিদ্যালয়', 'ভার্সিটি'],
  company: ['company', 'companies', 'payment', 'payments', 'app', 'service', 'কোম্পানি'],
  city: ['city', 'cities', 'শহর'], publication: ['publication', 'journal', 'grant', 'funding', 'fellowship', 'scholarship', 'প্রকাশনা', 'অনুদান'],
  tourism: ['tourism', 'travel', 'visa', 'tourist', 'ভ্রমণ', 'ভিসা'], country: ['country', 'countries', 'দেশ'],
}
const regions = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null

const fold = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

// One edit apart, for typos like "landon met".
function close(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else { i++; j++ }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

/** Names, aliases (any script) and domains; exact beats prefix beats substring beats typo. Worse status ranks first on ties. */
export function search<T extends Searchable>(list: T[], q: string, limit = 12): T[] {
  const f = fold(q)
  if (!f) return []
  return list
    .map((it) => {
      let score = 0
      for (const raw of [it.name, it.nameBn, it.domain, ...it.aliases]) {
        if (!raw) continue
        const n = fold(raw)
        if (n === f) score = Math.max(score, 100)
        else if (n.startsWith(f)) score = Math.max(score, 60)
        else if (n.includes(f)) score = Math.max(score, 40)
        else if (f.length >= 4 && n.split(' ').some((w) => close(w, f))) score = Math.max(score, 25)
      }
      // Places and categories: "uk" lists everything in the UK, "universities" lists that category.
      if (it.country) {
        const words = [...(countryWords[it.country] ?? []), regions?.of(it.country) ?? '', it.city ?? ''].map(fold).filter(Boolean)
        if (words.some((w) => w === f || (f.length >= 3 && w.startsWith(f)))) score = Math.max(score, 30)
      }
      if ((categoryWords[it.category] ?? []).map(fold).some((w) => w === f || (f.length >= 4 && w.startsWith(f)))) score = Math.max(score, 20)
      return { it, score: score && score + severity[it.status] }
    })
    .filter((s) => s.score)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.it)
}
