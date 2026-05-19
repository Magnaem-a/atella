# Atella — Member Area Scripts

Custom JavaScript for the Atella learning site (Webflow + Memberstack Data Tables).

All page logic is bundled into a single file, **`public/atella.js`**, hosted on
a CDN (Vercel) and loaded once site-wide. Each page's code detects its own page
and only runs there, so one file safely covers every page.

---

## How it's structured

```
scripts/        ← SOURCE files, one per page (edit these)
  shared-cache.js     window.MSDataCache — caching, pagination, 429 retry, writes
  dashboard.js        DashboardListSlots + DashboardCommon + dashboard sections
  course-detail.js
  lesson-detail.js
  module-detail.js
  all-courses.js
  member-all-courses.js
  enrolled-courses.js
  saved-courses.js
  nav-courses.js
  *.md                per-page attribute + behaviour docs
build.js        ← concatenates scripts/ → public/atella.js
public/
  atella.js     ← GENERATED bundle (served by the CDN — do not edit by hand)
vercel.json     ← static hosting + cache headers
tables.md       ← Memberstack data-table schema
```

`scripts/*.js` are kept in Webflow embed format (`<script>` wrapped). `build.js`
strips that wrapper and concatenates them in dependency order.

---

## Editing workflow

1. Edit the relevant file in `scripts/`.
2. Run the build:
   ```bash
   node build.js
   ```
3. Commit and push. Vercel redeploys automatically.

**Never edit `public/atella.js` directly** — `build.js` overwrites it.

---

## Deploying (one-time setup)

1. This repo is on GitHub: `Magnaem-a/atella`.
2. In Vercel → **Add New → Project** → import this repo → **Deploy**.
   No framework, no build command needed; `vercel.json` points the output at
   `public/`.
3. Vercel serves the bundle at:
   ```
   https://<your-vercel-domain>/atella.js
   ```

---

## Using it in Webflow

Add **one** line in Webflow → **Site Settings → Custom Code → Before `</body>`**
(site-wide, not per page):

```html
<script defer src="https://<your-vercel-domain>/atella.js"></script>
```

After a redeploy, bump a version query to bust browser caches if needed:

```html
<script defer src="https://<your-vercel-domain>/atella.js?v=2"></script>
```

---

## How "one file, every page" works

Every page script is a self-contained IIFE that looks for a page marker
(`[data-ms-code="course-page"]`, `[data-ms-code="lesson-page"]`, etc.) and
returns immediately if it's not found. The dashboard sections guard on their
own containers the same way. So the whole bundle loads on every page, but only
the matching page's code actually runs.

`shared-cache.js` is loaded first in the bundle because it defines
`window.MSDataCache`, which every other script depends on for cached,
paginated, rate-limit-aware reads and writes.
