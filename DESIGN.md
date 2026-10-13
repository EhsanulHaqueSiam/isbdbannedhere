# Design

Bad news must look like bad news. The look is tone 2, "Red", picked on 13 Oct 2026. Reference mock:
`docs/mocks/index.html` (v8).

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
| night  | `#000` page, `#ff3b3b` big type, `#ff8080` small red text, `#151515` panels, `#a3000f` buttons | App dark mode. |
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

## Charts

- **Month blocks**: one cell per month, Oct 2025 onward. On red: shut out = white, restricted = light amber, unclear =
  hatched white, no reports = 35% black. On panels: red, amber, hatched ink, light grey.
- **Waffle**: 100 dots, allowed vs refused. The "why" chart for each wave of bans.
- **Coverage bar**: Bangladeshi vs international outlets for each story cluster.
- A source line under every chart and on every card.

## Images

| Image          | Source                          | Use                                                                 |
| -------------- | ------------------------------- | ------------------------------------------------------------------- |
| Flags          | Public domain                   | Everywhere.                                                         |
| Place photos   | Wikimedia Commons, credited     | Heroes and share cards, always red duotone (grayscale multiplied on red). |
| Article images | The link's og:image             | Only as a credited preview linking to the article. Never on share cards. |
| Logos          | Site icon, small                | Identify companies and outlets. Never enlarged or edited.           |
| People         | None                            | No faces. Profile frames use the reader's own photo, processed on their phone. |

## Words and trust

- **Headline word is locked to the status**: Shut out → BANNED., Restricted → RESTRICTED., Unclear → UNCLEAR.,
  Disputed → BANNED OR NOT?, Reopened → REOPENED., none → NO REPORTS. Never "Banned." on a restriction.
- **As of**: every card and page shows the build date it is true as of, so old screenshots read as old.
- **Confidence line** on every entry: best source tier (official, press, community), source count, date of the newest
  source.

## Home

- **Hero**: the Bangladesh outline (Natural Earth 1:50m, public domain, `src/lib/bd-outline.ts`) under the site's
  prohibition sign, top right behind the headline. Outline in display ink at 45%, sign in `--hot` at 55% (white on red,
  red on night).
- **Countries**: every country with a ban as a chip, flag + name + count, most places first. Tap fills the search.
- **Tiles**: category name in Anton, count in red, "places with a report", then one line per status with its icon.

## Share cards

Story 9:16, post 4:5, link preview 1.91:1 (built for every page by `scripts/seo.ts`), five-slide carousel per story. Always the brighter share red. Footer: logo (prohibition sign +
"Is BD banned here?") and `#isBDbannedhere` or the URL. One idea per card.

## Voice

- Say what happened: shut out, refused, stopped taking. Not "isn't taking".
- "Us" on campaign cards ("shut the door on us"), neutral on data pages.
- Count the loss: 8 shut out, 0 reopened, 4× over the limit.
- No emoji on status cards. Banglish line in captions: "apply korar age check koro".
- Red is a color here, never July 2024 imagery, martyrs or slogans.
