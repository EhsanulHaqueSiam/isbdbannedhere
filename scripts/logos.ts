// Downloads a small site icon per entity domain and per source publisher into public/logos/ and writes
// src/data/logos.json (the list that exists). Logos identify; they are never enlarged or edited (DESIGN.md).
// Run when data adds new domains or publishers: pnpm logos
import { mkdirSync, writeFileSync } from 'node:fs'
import { entities } from './entities.ts'

mkdirSync('public/logos', { recursive: true })
type Raw = { domain?: string; events?: { sources: { url: string }[] }[] }
const all = entities() as Raw[]
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return null } }
const domains = [...new Set([...all.map((e) => e.domain), ...all.flatMap((e) => (e.events ?? []).flatMap((ev) => ev.sources.map((s) => host(s.url))))].filter((d): d is string => !!d))]
const have: string[] = []
await Promise.all(
  domains.map(async (d) => {
    const res = await fetch(`https://www.google.com/s2/favicons?domain=${d}&sz=64`).catch(() => null)
    const buf = res?.ok ? Buffer.from(await res.arrayBuffer()) : null
    // Google returns a 16px generic globe when a site has no icon; skip those tiny ones.
    if (!buf || buf.length < 300) return
    writeFileSync(`public/logos/${d}.png`, buf)
    have.push(d)
  }),
)
writeFileSync('src/data/logos.json', JSON.stringify(have.sort(), null, 1) + '\n')
console.log(`logos: ${have.length} of ${domains.length}`)
