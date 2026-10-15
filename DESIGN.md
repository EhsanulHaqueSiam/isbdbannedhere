# Design

Bad news must look like bad news. The look is tone 2, "Red", picked on 13 Oct 2026. Reference mock:
`docs/mocks/index.html` (v8). Later picks: [hero, countries, tiles](https://sy9rvwlzrtiq.postplan.dev) (v11: map B,
chips, tiles and feed A), [desktop](https://yquj5rmplywo.postplan.dev) (v12: A), [AAA palette](https://lyd2k83y5sj9.postplan.dev)
(v13: A, deep red), [redesign](https://tzpww2jmkyqp.postplan.dev) (v14, 14 Oct 2026: C "poster" for every page, B two-step
share composer, links as posts with three gates for unrelated links).

Three rules from v14: **show the data, don't list it** (a map, a waffle, a ribbon, a bar; never a wall of chips),
**every link is a post** (publisher icon, name, date, tier, headline, the article's own picture, what it claims), and
**what you see is what you share** (the card on the page is the card that leaves the phone).

## Color

Every page meets WCAG AAA: 7:1 for text, 4.5:1 for large type (24px, or 18.66px bold). Picked 13 Oct 2026; measured
with an element-by-element audit of every page type, both themes, phone and desktop.

| Token  | Value                                   | Use                                                                    |
| ------ | --------------------------------------- | ---------------------------------------------------------------------- |
| red    | `#a3000f`                               | Page. Halftone dots on top (5px grid, 16% black). White on it is 8.2:1. |
| ink    | `#0a0a0a`                               | Buttons, chips, the ticker, text on white panels.                      |
| white  | `#ffffff`                               | All type on red, panels for dense data, the slab behind the headline's emphasis word. |
| grey   | `#4d4d4d` on white                      | Secondary text on panels (8.4:1).                                      |
| amber  | `#c77700` icons on white, `#ffc24a` on red | Restricted.                                                         |
| night  | `#000` page, `#ff3b3b` big type, `#ff8080` small red text, `#151515` panels, `#a3000f` buttons | The default (picked 15 Oct 2026); Red is the switch. |
| share red | `#e3141c`                            | Share cards and link previews only (images for social feeds).          |

No black text on the red page: it is 2.6:1 there. The headline's emphasis word ("BANNED") is red on a white slab.
Charts with small labels sit on white panels.

## Type

- **Anton**, uppercase: headlines, university names, big numbers.
- **System sans, 700 to 800**: sentences.
- **Permanent Marker**: the human layer only. Strikes, "??", dates, "since Dec 2025 →". Never for data.
- Feed headlines are sentences, so the sans at 800 ("32 · Shut out or restrict Bangladeshi students"); Anton stays for
  the name in front ("UAE · shut out Bangladeshi travellers").
- **ui-monospace**, uppercase, tracked: labels, sources, counts.

Fonts are open licensed (OFL), self-hosted.

**Language**: English by default; every page has a Bangla twin under `/bn`, switched from the header. Bangla display
type is Noto Sans Bengali 800, loaded only when Bangla text is on screen (Anton has no Bangla letters).

## Status

| Status     | Icon                 | On red           | On white panel |
| ---------- | -------------------- | ---------------- | -------------- |
| Shut out   | prohibition sign     | white            | red            |
| Unclear    | dashed circle with ? | white            | ink            |
| Restricted | circle with !        | light amber      | amber          |
| Disputed   | dashed circle with ? | white            | ink            |
| Reopened   | circle with check    | light green      | green `#0a7d3b` (night `#3ccf7a`) |
| No reports | none, muted label    | white label      | grey label     |

Shape carries the meaning, color backs it up. A status is never color alone.

## Charts (`src/components/Viz.tsx`)

Status colours come from the context vars, so the same chart reads on red, on a white panel and at night.

- **World map**: equirectangular (`src/lib/world.json`, integer coordinates). Countries with a ban in the sign colour
  (ink on red, red at night) and each one a link to its hub; Bangladesh in display white; the rest at 20%.
- **Waffle**: one dot per place we track, worst first, with a legend of counts. The home page's second screen.
- **Month ribbon**: one column per month, a dot per three places newly banned, a green dot for a reopening, the count
  under each; the peak month in the hot colour with a marker-hand note.
- **Bar**: proportional statuses, under each category's big number and at the top of category lists.
- **Month blocks**: one cell per month, Oct 2025 onward. On cards and lists, 11px; on an entry, 44px tall with a month
  letter under each (`BigStrip`). On red: shut out = white, restricted = light amber, unclear = hatched white, no
  reports = 35% black. On panels: red, amber, hatched ink, light grey.
- A source line under every chart and on every card.

## Images

| Image          | Source                          | Use                                                                 |
| -------------- | ------------------------------- | ------------------------------------------------------------------- |
| Flags          | Public domain                   | Everywhere.                                                         |
| Place photos   | Wikimedia Commons, credited     | Heroes and share cards, always red duotone (grayscale multiplied on red). Free licenses only, nobody in frame. |
| Article images | The link's og:image             | Only as a credited preview linking to the article. Never on share cards. |
| Logos          | Site icon, small                | Identify companies and outlets. Never enlarged or edited.           |
| People         | None                            | No faces. Profile frames use the reader's own photo, processed on their phone. |

## Words and trust

- **Headline word is locked to the status**: Shut out → BANNED., Restricted → RESTRICTED., Unclear → UNCLEAR.,
  Disputed → BANNED OR NOT?, Reopened → REOPENED., none → NO REPORTS. Never "Banned." on a restriction.
- **As of**: every card and page shows the build date it is true as of, so old screenshots read as old.
- **Confidence line** on every entry: best source tier (official, press, community), source count, date of the newest
  source.

## Home (poster)

- **Hero**: the world map behind the big count of countries ("26 countries shut out or restrict Bangladeshis."), the
  as-of line, "tap the map". The map sits at the top of the hero and the number starts 100px down, so it never rides
  into the header. The Bangladesh outline (`src/lib/bd-outline.ts`) now appears only on the home link preview.
- **Waffle** of every place, then search; **country table** (flag, name, count) in two columns, three on desktop.
- **Ribbon** of new bans by month, with the two longest silences under it; **big numbers** per category with a bar.
- **Latest**: dated rows. Date in the marker hand, name (or "32 UK universities") in Anton, the sentence with the
  publisher's icon, the status icon; tap opens the summary and a WhatsApp / Facebook / copy row.

## Entry

Name, the stamp with its icon, the sentence, the big month strip, the scope line in the marker hand, three facts
(months closed, sources with the best tier, rows affected), then **what they said, in order**: each event dated with
its summary and its sources as posts (the first with an article picture). Levels, what to do and still open sit in the
side column on desktop. Share row inline on desktop, pinned to the bottom on phones.

## Links as posts (`src/components/Post.tsx`)

One component for every link: a source on an entry, a reader's receipt, the watcher's find. Publisher icon
(`public/logos`, fetched by `pnpm logos` for entity domains and publishers), publisher, date, tier badge (official
green, press ink, community grey; reader and watcher on receipts), headline, the article's own picture
(`src/data/press.json`, `pnpm press`, only for sources already in the data, shown on the page with the publisher's
name, never on share cards), what it claims with the status icon, and "Open ↗ domain".

## Receipts

Three gates, each with a plain sentence. At paste: a video, social, shortened or search link gets an amber note and an
outlined "Send anyway". At send: the server reads the page and a link that never says Bangladesh (either script) is
answered "Doesn't mention Bangladesh or Bangladeshis. Not queued." and never stored. At review: "Checked, not added"
with the reason (`reason` column) on the tracking page. The public queue (`/receipts`) shows pending, added and not
added as posts with their three steps.

## Share composer

Full screen, two steps. Step 1 picks the card from a carousel (story 9:16, post 4:5, video when one exists, link
preview). Step 2 is four big buttons (WhatsApp, Facebook group, Instagram story, everything else) over the tags and the
Bangla-first caption. Desktop shows both side by side.

## Share cards

Story 9:16, post 4:5, link preview 1.91:1 (built for every page by `scripts/seo.ts`), five-slide carousel per story. Always the brighter share red. Footer: logo (prohibition sign +
"Is BD banned here?") and `#isBDbannedhere` or the URL. One idea per card.

Story and post (v15, picked 14 Oct 2026: [mocks](https://2u6o0gwsiu07.postplan.dev), A "stamp", English first), top to bottom:

- **Picture**: the place's photo in red duotone with a hard fade, credited; a kicker over its foot with Bangladesh's
  flag, the city, the country and the category. Without a photo, the place's flag (a company's logo on a white tile)
  sits as a card on the red.
- **Name** in Anton, then the **headline word on a white slab** in the page's language, the biggest thing on the
  card, with the other language's word under it (BANNED. then নিষিদ্ধ। on English cards, the reverse on Bangla ones).
- **Both sentences**: the page's language first, the scope and since in marker inline, the other language under it.
- The **month strip**, then the source line and footer. No map art: it said nothing at thumbnail size.

## Voice

- Say what happened: shut out, refused, stopped taking. Not "isn't taking".
- "Us" on campaign cards ("shut the door on us"), neutral on data pages.
- Count the loss: 8 shut out, 0 reopened, 4× over the limit.
- No emoji on status cards. Banglish line in captions: "apply korar age check koro".
- Red is a color here, never July 2024 imagery, martyrs or slogans.
