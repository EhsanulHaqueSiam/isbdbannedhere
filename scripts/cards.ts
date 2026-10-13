// Screenshots the story and post share cards of every entity with reports into public/cards/.
// Needs the app running: BASE=http://localhost:5174 pnpm cards. Link previews are built by scripts/seo.ts instead.
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'
import { entities } from './entities.ts'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const sizes = { story: [1080, 1920], post: [1080, 1350] } as const

mkdirSync('public/cards', { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage()
const jobs = entities().filter((e) => e.reported).flatMap((e) => (['story', 'post'] as const).map((f) => ({ e, f })))

let done = 0
for (const { e, f } of jobs) {
  const [width, height] = sizes[f]
  await page.setViewportSize({ width, height })
  const url = `${BASE}/card/${e.slug}/${e.id}/${f}`
  const res = await page.goto(url, { waitUntil: 'networkidle' })
  if (!res?.ok()) { console.warn(`skip ${url} (${res?.status()})`); continue }
  await page.evaluate(() => document.fonts.ready)
  const name = `${e.category}-${e.id}-${f}`
  await page.screenshot({ path: `public/cards/${name}.jpg`, type: 'jpeg', quality: 72, clip: { x: 0, y: 0, width, height } })
  if (++done % 50 === 0) console.log(`${done}/${jobs.length}`)
}
await browser.close()
console.log(`cards: ${done} written`)
