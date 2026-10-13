# Data

One JSON file per category, each an array of entities. The app validates every file at build time
(`src/data/schema.ts`) and derives each row's status from the events, so status is never typed by hand.

```jsonc
{
  "id": "london-met",                       // url slug, unique within the category
  "category": "university",                 // university | company | city | publication | tourism | country
  "name": "London Metropolitan University",
  "nameBn": "লন্ডন মেট্রোপলিটন ইউনিভার্সিটি",
  "aliases": ["London Met", "LMU"],          // what people type, any script
  "country": "GB",                          // ISO 3166-1 alpha-2, where it is (omit for global companies)
  "city": "London",                         // optional
  "domain": "londonmet.ac.uk",              // optional
  "checked": "2026-10-13",                  // last time someone verified this entry
  "events": [                               // empty = "no reports"
    {
      "date": "2025-12",                    // YYYY, YYYY-MM or YYYY-MM-DD
      "action": "paused",                   // see below
      "rows": [],                           // affected rows; empty = all rows of the category
      "until": "2026-09",                   // optional end date announced with the event
      "summary": "Halted admissions from Bangladesh.",
      "summaryBn": "বাংলাদেশ থেকে ভর্তি বন্ধ করেছে।",
      "sources": [
        {
          "url": "https://…",
          "publisher": "The Daily Star",
          "title": "Several UK universities close door on Bangladeshi and Pakistani students: FT",
          "date": "2025-12-04",
          "tier": "press"                   // official | press | community
        }
      ]
    }
  ],
  "stillOpen": [{ "name": "Payoneer", "note": "Get paid from abroad" }]  // optional, legal alternatives only
}
```

**Actions**: `unavailable` (never offered to Bangladesh), `paused` (stopped), `restricted` (extra conditions, caps,
some intakes only), `reopened`, `extended` (a pause got longer), `denied` (the institution or a government says the
report is wrong; makes the row Disputed).

**Rows per category**

| Category    | Rows                                   |
| ----------- | -------------------------------------- |
| university  | bachelors, masters, phd, research      |
| company     | signup, pay, getpaid, jobs             |
| city        | visit, medical, study, work            |
| publication | publish, getpaid, attend, fund         |
| tourism     | entry, transit, book                   |
| country     | student, work, settle                  |

**Rules**: every event needs at least one source a reader can open. No source, no event. Never record what a
service merely requires (a visa, a deposit); record what is denied or restricted for Bangladeshis specifically.
