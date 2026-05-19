# `module-detail.js` - page runtime + setup

Drives the module detail page (`/module?id=...`) using MS-only attributes.

> **Loading:** this page's script ships in the site-wide `atella.js` bundle —
> see the repo `README.md`. Nothing to paste per page; just add the attributes
> below. The script auto-detects the page and runs only here.

## What it renders

- Breadcrumb links (`crumb-learn`, `crumb-course`, `crumb-module`)
- Module hero content (`module.*` fields + progress UI)
- Lesson list from `[data-ms-code="lesson-template"]`
- Strict lesson status variants (`done`, `active`, `locked`, `todo`)
- Previous/next module pagination cards

## Data contract

Wrapper: `[data-ms-code="module-page"]`

Table keys read from wrapper:

- `ms-code-table-course`
- `ms-code-table-module`
- `ms-code-table-lesson`
- `ms-code-table-progress`

## Variant contract

- `data-ms-show-if="status"` for lesson status blocks
- `data-ms-show-if="action"` for row CTA variants
- `data-ms-show-if="state"` for pagination card ready/empty blocks

## Attribute setup

Expected URL: `/module?id=rec_module123` (or `?slug=...`).

### 1) Page wrapper

```html
<section
  data-ms-code="module-page"
  ms-code-id-param="id"
  ms-code-slug-param="slug"
  ms-code-table-course="courses"
  ms-code-table-module="modules"
  ms-code-table-lesson="lessons"
  ms-code-table-progress="lesson_progress">
</section>
```

### 2) Hero/header bindings

- `data-ms-field="module.title"`
- `data-ms-field="module.description"` (optional)
- `data-ms-field="module.order"` (+ optional `data-ms-code="pad"` token if your design uses padded order labels)
- `data-ms-field="module.lesson_count"`
- `data-ms-code="module-meta"`
- `data-ms-code="progress-label"`
- `data-ms-code="progress-fill"`

### 3) Breadcrumbs

- `data-ms-code="crumb-learn"`
- `data-ms-code="crumb-course"` + `ms-code-detail-page="/course"`
- `data-ms-code="crumb-module"` + `ms-code-detail-page="/module"`
- Optional names: `data-ms-field="course.title"` and `data-ms-field="module.title"`

### 4) Lesson list template

- List: `data-ms-code="lesson-list"`
- Template row/link: `data-ms-code="lesson-template"`
- Inside template:
  - `data-ms-field="lesson.title"`
  - `data-ms-field="lesson.order"`
  - `data-ms-field="lesson.duration_minutes"`
  - `data-ms-code="lesson-order-label"`
  - `data-ms-code="lesson-duration-label"`
  - `ms-code-detail-page="/lesson"`
  - `ms-code-id-param="id"` (optional)

Status variants:

- `data-ms-show-if="status"` with `done|active|todo|locked`

Action variants:

- `data-ms-show-if="action"` with `replay|continue|start|locked`

### 5) Module pagination cards

- Previous card: `data-ms-code="prev-module"` + `ms-code-detail-page="/module"`
- Next card: `data-ms-code="next-module"` + `ms-code-detail-page="/module"`
- Optional labels: `data-ms-code="prev-label"` / `data-ms-code="next-label"`
- Card fields: `data-ms-field="module.title"` and `data-ms-field="module.lesson_count"`

Optional card state blocks:

- `data-ms-show-if="state"` with `ready|empty`

## Customize this page

- Change table names via wrapper `ms-code-table-*` attributes.
- Change routes via `ms-code-detail-page` and `ms-code-id-param`.
- Add/remove visual states with `data-ms-show-if` blocks only.
- Keep all behavior selectors as `data-ms-code` / `data-ms-field` (no class hooks).
