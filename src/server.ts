import handler from '@tanstack/react-start/server-entry'
import { watchNews } from './data/watcher.ts'

// Worker entry. TanStack Start answers requests; the daily cron in wrangler.jsonc runs the news watcher.
// The Worker runs before the static assets (wrangler.jsonc run_worker_first): requests over http, to the old
// workers.dev host or to www go to https on the canonical domain first, so every shared link ends up in one place;
// then a prerendered page or file is served from the ASSETS binding, and anything else goes to TanStack Start.
const CANON = 'isbdbannedhere.site'
type Env = { ASSETS?: { fetch(request: Request): Promise<Response> } }
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    // Not on localhost: the prerender fetches every page over plain http from a local worker.
    const local = url.hostname === 'localhost' || url.hostname.startsWith('127.')
    if ((url.protocol === 'http:' && !local) || (url.hostname !== CANON && (url.hostname.endsWith('.workers.dev') || url.hostname === `www.${CANON}`))) {
      url.protocol = 'https:'
      url.hostname = CANON
      return Response.redirect(url.toString(), 301)
    }
    if (env.ASSETS && (request.method === 'GET' || request.method === 'HEAD')) {
      const asset = await env.ASSETS.fetch(request)
      if (asset.status !== 404) return asset
    }
    return handler.fetch(request, env as never)
  },
  scheduled(_controller: unknown, _env: unknown, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(watchNews())
  },
}
