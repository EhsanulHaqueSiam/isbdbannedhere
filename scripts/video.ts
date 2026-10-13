// Records each reported entity's animated story card as a 6-second vertical MP4 in public/video/.
// Needs the app running and ffmpeg: BASE=http://localhost:5174 pnpm video [id]
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, renameSync } from 'node:fs'
import { chromium } from 'playwright'
import { entities } from './entities.ts'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const only = process.argv[2]
const tmp = 'public/video/.tmp'
mkdirSync(tmp, { recursive: true })

const browser = await chromium.launch()
for (const e of entities().filter((x) => x.reported && (!only || x.id === only))) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, recordVideo: { dir: tmp, size: { width: 1080, height: 1920 } } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/card/${e.slug}/${e.id}/story?anim=1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(6000)
  await ctx.close()
  const webm = readdirSync(tmp).find((f) => f.endsWith('.webm'))
  if (!webm) continue
  const out = `public/video/${e.category}-${e.id}.mp4`
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', `${tmp}/${webm}`, '-ss', '0.3', '-t', '6', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', `${tmp}/out.mp4`])
  renameSync(`${tmp}/out.mp4`, out)
  rmSync(`${tmp}/${webm}`)
  console.log(out)
}
await browser.close()
rmSync(tmp, { recursive: true, force: true })
