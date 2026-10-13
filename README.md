# isbdbannedhere

Does it work in Bangladesh? Bangladeshis hit "not available in your country" all the time. One place to check
whether a service works from Bangladesh, what exactly breaks (opening it, signing up, paying, getting paid), who
blocks it (the service, or the BD government), and what to use instead.

Status: feature map and mocks only. Mocks: `docs/mocks/index.html`.

## Verdict model

Every service has four rows. The verdict is derived from them, never typed by hand.

| Row  | Question                                                        |
| ---- | --------------------------------------------------------------- |
| Open | Does the site or app load on BD ISPs without a VPN?             |
| Join | Can a BD resident sign up and pass KYC (+880 OTP, NID/passport)? |
| Pay  | Does a BD-issued card work?                                     |
| Earn | Can you receive money or payouts to BD?                         |

Verdicts: **Works** (all applicable rows pass), **Partial** (some rows fail), **Not here** (the service excludes
Bangladesh), **Blocked in BD** (BTRC, court or government block), **Grey** (works, but legal risk under BD law,
e.g. crypto). Every row carries a source and a checked date. Rows older than 90 days show as unverified.

## Features

MVP, static site with data in git:

1. Search to verdict: type a service, get the verdict and the four rows.
2. Service page: verdict, rows with notes, who blocks it, sources, last checked. Prerendered for search
   ("is Stripe available in Bangladesh").
3. Use instead: alternatives that work in BD, plus legal workarounds only.
4. Browse and filter by category and by row ("everything that pays out to BD").
5. Changes feed and RSS: every status flip, dated.
6. বাংলা and English.
7. Share card: OG image per service for Facebook and WhatsApp groups.
8. Contribute through GitHub: one JSON file per service, schema-checked in CI, "suggest an edit" on every page.

V1, adds a backend (Convex) for per-user state:

9. Works-for-me reports: one tap, optional ISP and card bank, 30-day tally. Turnstile plus rate limits against
   brigading.
10. Want-it counter: "I want Stripe in BD", a number to show the company.
11. Alerts: email when a service flips (Stripe arrives, Facebook gets blocked).
12. Official page watcher: daily fetch of each service's supported-countries page, flags when "Bangladesh"
    appears or disappears.
13. OONI check: OONI measurements from BD per ISP to confirm or clear "Blocked in BD".
14. Request a service: a search with no result becomes a request.

Later: internet shutdown tracker (2015, 2018, 2024), BD bank card matrix, browser extension banner, public JSON
dataset.

Not doing: VPN or fake-address guides (account bans, BD law risk, and it gets the site blocked), travel and visa
bans (a different product).

## Data sources

Official supported-country pages (Join, Earn), OONI API with `probe_cc=BD` (Open, Blocked in BD), news and BTRC or
court orders (history), community reports (Pay, reality checks).

## Stack (proposed)

TanStack Start with static prerender, Tailwind, pnpm, ArkType for the service schema, Convex from V1, Cloudflare
hosting. Watcher runs as a scheduled job.
