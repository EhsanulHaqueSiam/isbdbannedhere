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
pnpm build && pnpm preview  # Cloudflare Workers build, every page prerendered
BASE=http://localhost:5173 pnpm cards   # share images into public/cards (app must be running)
BASE=http://localhost:5173 pnpm video   # 6 s vertical MP4 per reported entry into public/video (needs ffmpeg)
```

Hosting: Cloudflare Workers (`wrangler.jsonc`). `pnpm run deploy` builds and deploys (plain `pnpm deploy` is a pnpm built-in); auto-deploy runs from GitHub.

Env (all optional): `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` (analytics, off without a key), `VITE_CONTACT_EMAIL`
(where "send a receipt" and "right of reply" go; without it they point to /about).

## How it works

- **Data** lives in `data/*.json`, one file per category, validated with ArkType at build. Status is derived from
  each entry's events (`src/data/derive.ts`), never typed by hand: Shut out, Restricted, Unclear (end date passed, or
  180 days without a source or check), Disputed (a report and a denial), Reopened, No reports.
- **Pages** are TanStack Start routes, prerendered. Data stays on the server (`src/data/api.ts`); each page ships
  only what it shows, and search loads a compact index the first time it's used.
- **Bangla**: every page has a `/bn` twin. The Bangla font only downloads when Bangla text is on screen.

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

- **Share sheet on every page**: Story (9:16), Post (4:5), Video, Link. On phones, Share hands the image or video and
  the caption to the phone's own share sheet, straight into a Facebook or Instagram story. Elsewhere: download, copy
  caption, copy link.
- **Every card** carries its headline word (locked to the status), the source, "as of" date and #isBDbannedhere.
- **Link previews are the answer**: each page's preview reads "Is BD banned at X?" with the verdict.
- **My list**: add the places you plan to apply to or visit; get "I checked my list" as a story card. Stored in the
  browser only.
- **Silence counter** for pauses whose end date passed with no word; **Reopened** cards for good news.
- **Closed doors over time** chart on the home page.
- **Next steps** and **Still open** alternatives on every entry; a **confidence line** (source tier, count, date).
- **Right of reply** and a public **corrections** list on /about.

## Analytics events

`share_open`, `share_done {channel, format}`, `share_visit {card, format}`, `caption_copy`, `link_copy`, `search`,
`search_no_result`, `shortlist_add`, `shortlist_card`, `lang_switch`, `theme_switch`. Shared links carry `?s=card&f=format`
so a visit traces back to the card that caused it. North star: verdicts shared per week.

## Next (needs accounts)

- Receipts with sign-in, the duplicate check and a review queue (Convex + Google/Facebook sign-in).
- Watch and alerts when an entry on your list changes; weekly ban report carousel.
- "Ask them why" counter, batch lists for whole groups, receipt-hunter leaderboard.
- Article preview images for receipts (fetch og:image on approval, credited, never on share cards).
- Domain, hosting, PostHog project key.

Not doing: chat bots, consultant listings, visa advice, rankings.
