import handler from '@tanstack/react-start/server-entry'
import { watchNews } from './data/watcher.ts'

// Worker entry. TanStack Start answers requests; the daily cron in wrangler.jsonc runs the news watcher.
export default {
  fetch: handler.fetch,
  scheduled(_controller: unknown, _env: unknown, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(watchNews())
  },
}
