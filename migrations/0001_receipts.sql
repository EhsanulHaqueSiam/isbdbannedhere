-- Contributions from readers (no login) and the daily news watcher. Verified rows show as community receipts;
-- they never change a status on their own (DESIGN.md: no source, no status change; community is the lowest tier).
CREATE TABLE receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,                 -- normalized: https, no www/m/amp, no utm/fbclid, no fragment
  entity TEXT,                              -- "category/id" when the reader picked one
  note TEXT,
  origin TEXT NOT NULL,                     -- 'reader' | 'watcher'
  ip_hash TEXT,                             -- salted hash, never the raw IP
  title TEXT,
  publisher TEXT,
  published TEXT,
  verdict TEXT NOT NULL DEFAULT 'pending',  -- pending | verified | rejected
  claim TEXT,                               -- what the article says about Bangladeshis, from the AI check
  claimed_status TEXT,                      -- shut | restricted | reopened | none
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX receipts_entity ON receipts (entity, verdict);
CREATE INDEX receipts_ip_day ON receipts (ip_hash, created_at);
