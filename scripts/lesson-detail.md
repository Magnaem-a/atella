# `lesson-detail.js` - page runtime + setup

Drives the lesson detail page (`/lesson?id=...`) using MS-only attributes.

> **Loading:** this page's script ships in the site-wide `atella.js` bundle —
> see the repo `README.md`. Nothing to paste per page; just add the attributes
> below. The script auto-detects the page and runs only here.

## What it renders

- Breadcrumb links/titles for learn, course, module, lesson
- Lesson hero (title, description, meta, video player)
- Lesson breakdown list from template
- Resources list from template
- Sidebar curriculum with strict drip logic
- Prev/next lesson links
- Mark complete and save lesson actions

## Data contract

Wrapper: `[data-ms-code="lesson-page"]`

Table keys from wrapper:

- `ms-code-table-course`
- `ms-code-table-module`
- `ms-code-table-lesson`
- `ms-code-table-progress`
- `ms-code-table-breakdown`
- `ms-code-table-reference`
- optional: `ms-code-table-saved-lessons`

## Variant contract

- `data-ms-show-if="status"` for curriculum rows (`done|active|locked|todo`)
- `data-ms-show-if="complete"` for completion state blocks
- `data-ms-show-if="save-lesson"` for save state blocks

## Attribute setup

### 1) Page wrapper

```html
<section
  data-ms-code="lesson-page"
  ms-code-id-param="id"
  ms-code-slug-param="slug"
  ms-code-table-course="courses"
  ms-code-table-module="modules"
  ms-code-table-lesson="lessons"
  ms-code-table-progress="lesson_progress"
  ms-code-table-breakdown="lesson_breakdown"
  ms-code-table-reference="reference">
</section>
```

### 2) Breadcrumbs

- `data-ms-code="crumb-learn"`
- `data-ms-code="crumb-course"` + `ms-code-detail-page="/course"`
- `data-ms-code="crumb-module"` + `ms-code-detail-page="/module"`
- `data-ms-code="crumb-lesson"` + `ms-code-detail-page="/lesson"` (optional)
- Names: `data-ms-field="course.title"`, `data-ms-field="module.title"`, `data-ms-field="lesson.title"`

### 3) Lesson hero + player

- `data-ms-field="lesson.title"`
- `data-ms-field="lesson.description"`
- `data-ms-code="lesson-meta"`
- `data-ms-code="module-progress-label"`
- `data-ms-code="progress-fill"`
- `data-ms-code="video-player"` (`iframe` or `video`)
- Optional: `data-ms-code="video-thumb"` and `data-ms-code="watch-lesson"`

### 4) Completion action

- Button: `data-ms-code="mark-complete"`
- Optional label: `data-ms-code="mark-complete-label"`
- Optional variants: `data-ms-show-if="complete"` with `todo|done`

### 5) Prev/next lesson pagination

- Previous: `data-ms-code="prev-lesson"` + `ms-code-detail-page="/lesson"`
- Next: `data-ms-code="next-lesson"` + `ms-code-detail-page="/lesson"`
- Optional labels: `data-ms-code="prev-label"` / `data-ms-code="next-label"`
- Titles: `data-ms-field="lesson.title"`

### 6) Dynamic lesson breakdown

- Wrapper: `data-ms-code="lesson-breakdown"`
- Template: `data-ms-code="breakdown-template"`
- Fields: `data-ms-field="lesson_breakdown.content"`

### 7) Dynamic resources

- Wrapper: `data-ms-code="resources"`
- Template: `data-ms-code="resource-template"`
- Fields:
  - `data-ms-field="reference.title"`
  - `data-ms-field="reference.type"` (optional)
  - `data-ms-field="reference.url"` (optional)
- Optional count label: `data-ms-code="resources-count"`

### 8) Sidebar curriculum (strict drip)

- Wrapper: `data-ms-code="curriculum"`
- Template link: `data-ms-code="lesson-template"` + `ms-code-detail-page="/lesson"`
- Optional module link: `data-ms-code="module-link"` + `ms-code-detail-page="/module"`
- Module title: `data-ms-field="module.title"`

Status variants:

- `data-ms-show-if="status"` with `done|active|locked|todo`

Locked rows are rendered as non-clickable.

### 9) Save actions

- Lesson save: `data-ms-code="save-lesson"`
- Optional label: `data-ms-code="save-lesson-label"`
- Optional variants: `data-ms-show-if="save-lesson"` with `saved|unsaved`

### 10) View full course link

- `data-ms-code="view-course"` + `ms-code-detail-page="/course"`

## Customize this page

- Update table keys on wrapper `ms-code-table-*`.
- Update page routes with `ms-code-detail-page`.
- Add/remove state variants with `data-ms-show-if`.
- Keep all interactive targets on `data-ms-code` (no class-based selectors).
