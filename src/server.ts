import handler from '@tanstack/react-start/server-entry'
import { watchNews } from './data/watcher.ts'

// Worker entry. TanStack Start answers requests; the daily cron in wrangler.jsonc runs the news watcher.
// Requests over http, to the old workers.dev host or to www go to https on the canonical domain, so every shared link ends up in one place.
const CANON = 'isbdbannedhere.site'
export default {
  fetch(request: Request, env: unknown) {
    const url = new URL(request.url)
    if (url.protocol === 'http:' || (url.hostname !== CANON && (url.hostname.endsWith('.workers.dev') || url.hostname === `www.${CANON}`))) {
      url.protocol = 'https:'
      url.hostname = CANON
      return Response.redirect(url.toString(), 301)
    }
    return handler.fetch(request, env as never)
  },
  scheduled(_controller: unknown, _env: unknown, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(watchNews())
  },
}
