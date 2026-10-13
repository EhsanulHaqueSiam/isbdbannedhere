import { severity, type Status } from '../data/derive.ts'

export type Searchable = { name: string; nameBn?: string; aliases: string[]; domain?: string; status: Status }

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
export function search<T extends Searchable>(list: T[], q: string, limit = 8): T[] {
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
      return { it, score: score && score + severity[it.status] }
    })
    .filter((s) => s.score)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.it)
}
