// Downloads a small site icon per entity domain into public/logos/ and writes src/data/logos.json (the list that exists).
// Logos identify; they are never enlarged or edited (DESIGN.md). Run when data adds new domains: pnpm logos
import { mkdirSync, writeFileSync } from 'node:fs'
import { entities } from './entities.ts'

mkdirSync('public/logos', { recursive: true })
const domains = [...new Set(entities().map((e) => (e as { domain?: string }).domain).filter((d): d is string => !!d))]
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
