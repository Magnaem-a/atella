# Dashboard — `dashboard.js`

Runtime for the member dashboard page.

> **Loading:** `dashboard.js` ships inside the site-wide `atella.js` bundle —
> see the repo `README.md`. There is no per-page script to paste. It depends on
> `shared-cache.js` (`window.MSDataCache`), which the bundle loads first.

---

## What's inside

- shared list-slot helpers (`window.DashboardListSlots`)
- shared section helpers (`window.DashboardCommon`)
- stats strip
- continue card + narrative
- course grid
- recent activity feed

Each of the four dashboard sections guards on its own container, so the code
runs only on the dashboard page even though the bundle loads everywhere.

---

## Editing workflow

1. Edit `scripts/dashboard.js`
2. Run `node build.js` to regenerate `public/atella.js`
3. Commit + push — Vercel redeploys

---

## Rate-limit and pagination behavior

All sections share `window.MSDataCache` (from `shared-cache.js`):

- Identical `(table, where)` queries are **deduplicated** within a page load
- Results are cached in `sessionStorage` for **30 s** (configurable via `MSDataCache.configure`)
- 429 responses retry up to **4 times** with exponential backoff + jitter, honoring `Retry-After`
- Writes go through `MSDataCache.runWrites` — bounded concurrency + per-job 429 retry

After writes (e.g. marking a lesson complete), call
`window.MSDataCache.invalidate('table_name')` so the next read sees fresh data.
