# isbdbannedhere

Which universities, research programs and countries aren't taking Bangladeshis right now, at which level, since
when, and the news that says so. Built for Bangladeshi students applying for a bachelors, masters, PhD or research
post abroad.

Status: feature map and mocks only. Mocks: `docs/mocks/index.html`.

## What we track

Six categories. Every entity is picked from a canonical list with aliases, never free text.

| Category     | Rows                              | Lives under                                          |
| ------------ | --------------------------------- | ---------------------------------------------------- |
| Universities | Bachelors, Masters, PhD, Research | City, country                                        |
| Companies    | Sign up, Pay, Get paid, Jobs      | Global (services and employers)                      |
| Cities       | Visit, Medical, Study, Work       | Country; inherits its rules unless the city differs  |
| Publications | Publish, Get paid, Attend         | Global (platforms, journals, conferences)            |
| Tourism      | Entry, Transit, Book              | Country, or a travel company (airline, hotel, platform) |
| Countries    | Student visa, Work visa, Settle   |                                                      |

Visit visas live in Tourism, study and work visas in Countries. Status per row: Shut out, Restricted, Unclear (end
date passed, or no news in 6 months), Disputed (a report and a denial, both with receipts), Reopened, No reports.

## Data model

```
Entity  (university | company | city | publication | tourism | country)  name, aliases, domains, parent
  Event   action (paused | restricted | reopened | extended | denied), rows[], from, until?, evidence tier
    Source  normalized URL, publisher, published date, quote, archive URL, story fingerprint
Submission  URL, extracted claims[], match decision per claim, state (pending | approved | merged | rejected)
```

Status per row is derived from the latest approved event that covers it, never edited directly. One article can
feed many events (one FT story named ten universities). One event can have many sources.

## Rules

- No source, no status change. A change without a link is saved as a tip for reviewers.
- We only record restrictions. An entity with no events shows "No reports", never "Taking".
- A pause whose end date passes becomes Needs re-check, not Resumed. So does any active event with no new source
  in 6 months.
- Evidence tiers: Official (university or government page), Press, Community. Community-only shows as Unconfirmed.
- Sign in (Google) to submit. Reading is open.

## Duplicate handling

1. **Same link**: normalize (https, lowercase host, drop `www.`/`m.`/AMP, `utm_*`, `fbclid`, fragments, trailing
   slash), follow redirects, prefer `rel=canonical`. Unique index. A repeat shows where it already lives.
2. **Same story**: title and lead fingerprint against recent sources. A syndicated story becomes an extra source
   on the existing events, never new events.
3. **Same institution**: canonical list (UKVI sponsor register, world university domains list) with aliases and
   email domains. Missing institutions go through a request.
4. **Same event**: same entity, same action, overlapping rows, dates within 60 days: "already tracked, add as
   source". A different action is offered as a status change.
5. **Merge**: reviewers merge duplicate events or entities. Sources move, old links redirect, aliases stay.

## Features

MVP:

1. Search: "Is Bangladesh banned at ___" across universities, countries and programs, with aliases.
2. University page: status per level, since, until, event timeline, sources.
3. Country page: visa status for Bangladeshis, plus every institution there grouped by status.
4. Research and funding: programs, fellowships, scholarships and labs that exclude BD nationals.
5. Board: filter by country, level, status.
6. Add a news link: paste a URL, the server reads it and extracts every claim, you confirm. Paywalled pages fall
   back to manual fields.
7. Duplicate handling, as above, shown to the submitter before they submit.
8. Status updates: "Report a change" on every page, source required.
9. Review queue: approve, merge, reject. Trusted submitters' source attachments auto-approve; status changes never
   do.
10. Expiry and staleness, as in Rules.
11. Source archiving: every approved link saved to the Wayback Machine, since news links die.
12. Changes feed and RSS. বাংলা and English. Share card per page, plus a 9:16 story card.
13. Scroll the bans: home is a feed of everything not taking Bangladeshis right now, with country and level
    filters.
14. News portal: story clusters (one story, every outlet that ran it, duplicate layer 2 made visible), coverage
    bar for BD vs international press, tags linking to affected universities.
15. Shortlist check: pick universities and an intake, see each status, make a personal share card, get alerts.
16. Share kit per page: story 9:16, post 4:5, link preview 1.91:1, a carousel per story, rendered on the server from
    the same data, with prefilled captions (English plus a Banglish line).
17. Images: flags everywhere, red-duotone place photos (Wikimedia Commons, credited), article preview images only
    as credited link previews, small logos for companies and outlets.
18. Built to spread: every link preview is the verdict, a silence counter for unclear pauses, reopened cards,
    one-tap captions.

Look: tone 2, Red (picked 13 Oct 2026). Rules in `DESIGN.md`, reference mock `docs/mocks/index.html` (v8).

V1: watch and email alerts, a news watcher (daily news queries into the same review queue), applicant reports
(refusal emails citing nationality, redacted, community tier only), "ask them why" (a polite email from the reader's
own inbox plus a public counter), a weekly ban report carousel and WhatsApp/Telegram channel, a profile frame made
on the phone, a receipt hunters leaderboard.

Later: open dataset, visa refusal stats by nationality on country pages, an embed for student Facebook groups.

Not doing: consultant or agent listings, visa advice, rankings.

## Stack (proposed)

TanStack Start, Convex (submissions need a backend from day one), Google sign-in, Tailwind, pnpm, ArkType for
extracted claims, an LLM call to pull claims out of articles.
