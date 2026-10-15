# isbdbannedhere

Is BD banned here? Which universities, companies, cities, publications, destinations and countries have shut out
Bangladeshis, since when, and the receipts. English by default, Bangla one tap away. Built to be shared as Facebook
and Instagram stories and posts.

Design rules: `DESIGN.md`. Data format: `data/README.md`. Mock history: `docs/mocks/index.html`.

## Run

```
pnpm install
pnpm dev                 # http://localhost:5173
pnpm test                # status logic
pnpm typecheck
pnpm build && pnpm preview  # Cloudflare Workers build: every page prerendered, plus link previews, sitemap, robots.txt
BASE=http://localhost:5173 pnpm video   # 6 s vertical MP4 per reported entry into public/video (needs ffmpeg)
pnpm logos   # publisher and entity icons into public/logos (after adding domains or sources)
pnpm press   # each source's og:image into src/data/press.json (after adding sources)
```

Receipts and the news watcher locally (writes only to the local D1 under `.wrangler/`):

```
pnpm exec wrangler d1 migrations apply isbdbannedhere --local   # receipts table
pnpm build
./node_modules/.bin/wrangler dev -c dist/server/wrangler.json --env-file ~/.config/isbd/subq.env --persist-to .wrangler/state
curl 'http://localhost:8787/cdn-cgi/handler/scheduled?cron=15+2+*+*+*'   # run the watcher once
```

The env file holds `SUBQ_API_KEY=...`; production reads it from a Worker secret (`wrangler secret put SUBQ_API_KEY`).

Hosting: Cloudflare Workers (`wrangler.jsonc`) at https://isbdbannedhere.site (Namecheap domain, Cloudflare nameservers; the workers.dev host redirects there). `pnpm run deploy` builds and deploys (plain `pnpm deploy` is a pnpm built-in). CI (`.github/workflows/ci.yml`) tests and builds every PR, and deploys every push to main with the `CLOUDFLARE_API_TOKEN` repo secret (set 15 Oct 2026); `pnpm run deploy` is the manual fallback.

Env (all optional, all public, in `.env.production`): `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` (analytics, off without a
key); ad pixels `VITE_META_PIXEL_ID`, `VITE_TIKTOK_PIXEL_ID`, `VITE_X_PIXEL_ID`, `VITE_LINKEDIN_PARTNER_ID`,
`VITE_SNAP_PIXEL_ID`, `VITE_PINTEREST_TAG_ID`, `VITE_GA4_ID` (each loads only when set, and only after the visitor allows
it in the consent bar; `src/lib/pixels.ts` maps our events to each platform's standard events: entry view = ViewContent,
search = Search, add to My list = AddToWishlist, receipt = Lead, share = Share); `VITE_CONTACT_EMAIL`
(where "right of reply" goes; without it, /about). Receipts need the D1 binding; Worker secrets: `IP_SALT` salts the IP
hash, `SUBQ_API_KEY` is for SubQ Snap (local: `wrangler dev --env-file <file>`).

## How it works

- **Data** lives in `data/*.json`, one file per category, validated with ArkType at build. Status is derived from
  each entry's events (`src/data/derive.ts`), never typed by hand: Shut out, Restricted, Unclear (end date passed, or
  180 days without a source or check), Disputed (a report and a denial), Reopened, No reports.
- **Pages** are TanStack Start routes, prerendered. Data stays on the server (`src/data/api.ts`); each page ships
  only what it shows, and search loads a compact index the first time it's used.
- **Bangla**: every page has a `/bn` twin. The Bangla font only downloads when Bangla text is on screen.
- **Receipts**: a paste-a-link box on every entry, the home page, /about and /receipts (`src/components/ReceiptForm.tsx`).
  No sign-in. `src/data/submit.ts` cleans the link, rate-limits by salted IP hash (3 a minute, 10 a day), drops
  duplicates, reads the page (`src/data/page.ts`) and refuses one that never mentions Bangladesh ("not queued"), then
  stores the rest in D1 as pending; SubQ Snap notes what the article reports. The form warns before Send on video,
  social, shortened and search links (`looksUnlikely` in `src/lib/url.ts`). A receipt never changes a page by itself:
  the daily review checks each source and opens a PR that adds real ones as events in `data/*.json`; a rejected one
  gets a `reason`, shown on `/receipt/<id>`. `/receipts` is the public queue, rendered from D1 on request.
- **News watcher**: the daily cron (`wrangler.jsonc`, 08:15 Dhaka) runs `src/data/watcher.ts` from `src/server.ts`. It
  searches Google News in English and Bangla, keeps new headlines that name Bangladesh, has SubQ Snap
  (`src/data/snap.ts`, a decision model) pick likely bans, restrictions and reopenings, and queues up to 15 a day as
  pending receipts. Same review as reader links; it never edits data.
- **SEO**: every route's `head()` returns `seo()` (`src/lib/site.ts`): search-shaped title ("UAE visa for Bangladeshis:
  Banned."), description, canonical, en/bn `hreflang`, Open Graph and JSON-LD (breadcrumbs, and an Article citing every
  source on entry pages). `pnpm build` then runs `scripts/seo.ts`, which renders a 1200×630 preview for the home page,
  each category and every entry from the same data (satori), and writes `robots.txt`; TanStack Start writes the sitemap.

## Categories

| Category     | Rows                              |
| ------------ | --------------------------------- |
| Universities | Bachelors, Masters, PhD, Research |
| Companies    | Sign up, Pay, Get paid, Jobs      |
| Cities       | Visit, Medical, Study, Work       |
| Publications | Publish, Get paid, Attend, Funding |
| Tourism      | Entry, Transit, Book              |
| Countries    | Student visa, Work visa, Settle   |

## Built to be shared

- **Share sheet**: WhatsApp, Messenger, Facebook group, Instagram story, X, Telegram, copy and download; "Tag them" chips
  from each entry's official `handles` and `officials`, plus "+ a friend"; a Bangla-first caption you can edit. Phones get
  a sticky share bar on entry and country pages. Cards are drawn on the phone (fitted text, QR, green when reopened).
- **Country hubs** `/in/<country>` with short links (`/uae`), a world map, embed badges (`/badge/<category>/<id>.svg`),
  Bangla link previews (`/og/bn/...`), an RSS feed (`/feed.xml`), and tools: `/check` (Am I affected?), `/compare`,
  `/frame` (profile frame, photo never leaves the phone), `/week` (weekly carousel) and `/share` (posts for group admins).
- **Receipts** show a confirmation with the receipt number and where it goes, and a tracking page `/receipt/<id>`.

- **Share composer on every entry**: two steps, pick the card (Story 9:16, Post 4:5, Video, Link) then who gets it
  (WhatsApp, Facebook group, Instagram story, everything else). On phones, Share hands the image or video and the
  caption to the phone's own share sheet, straight into a Facebook or Instagram story. Elsewhere: download, copy
  caption, copy link.
- **Every card** carries its headline word (locked to the status), the source, "as of" date and #isBDbannedhere.
- **Link previews are the answer**: each page's preview reads "Is BD banned at X?" (or "in" a country) with the
  verdict, rebuilt from the data on every deploy, so a new entry never ships without one.
- **My list**: add the places you plan to apply to or visit; get "I checked my list" as a story card. Stored in the
  browser only.
- **Silence counter** for pauses whose end date passed with no word; **Reopened** cards for good news.
- **Pictures of the data** on the home page: tappable world map, a waffle of every place, new bans by month, a bar per category.
- **Next steps** and **Still open** alternatives on every entry; a **confidence line** (source tier, count, date).
- **Right of reply** and a public **corrections** list on /about.

## Analytics events

`share_open`, `share_done {channel, format}`, `share_visit {card, format}`, `caption_copy`, `link_copy`, `search`,
`search_no_result`, `shortlist_add`, `shortlist_card`, `lang_switch`, `theme_switch`, `receipt_send {entity, result}`,
plus `$pageview` on every navigation. Every event carries `page_type`, `lang`, `theme` and, for visits from a shared card,
`share_card`/`share_channel` (and `utm_*`).
Shared links carry `?s=card&f=format`
so a visit traces back to the card that caused it. North star: verdicts shared per week.

## Next (needs accounts)

- Watch and alerts when an entry on your list changes.
- "Ask them why" counter, batch lists for whole groups, receipt-hunter leaderboard.
- Article preview images for receipts (fetch og:image on approval, credited, never on share cards).
- Domain, hosting, PostHog project key.

Not doing: chat bots, consultant listings, visa advice, rankings.
