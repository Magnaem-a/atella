# `saved-courses.js` - member-specific saved courses page

Shows only courses saved by the signed-in member (`saved_courses`), using the same UI pattern as enrolled courses.

> **Loading:** this page's script ships in the site-wide `atella.js` bundle —
> see the repo `README.md`. Nothing to paste per page; just add the attributes
> below. The script auto-detects the page and runs only here.

## 1) Page wrapper

```html
<section
  data-ms-code="saved-courses-page"
  ms-code-table-course="courses"
  ms-code-table-lesson="lessons"
  ms-code-table-progress="lesson_progress"
  ms-code-table-saved-courses="saved_courses">
</section>
```

## 2) Header stats

- `data-ms-code="courses-count"`
- `data-ms-code="lessons-count"`
- `data-ms-code="hours-count"`

## 3) Filters

- Container: `data-ms-code="filter-tabs"`
- One tab template: `data-ms-code="filter-tab-template"`
- Inside template:
  - `data-ms-code="filter-label"`
  - optional `data-ms-code="filter-count"`

Script builds:
- `All`
- `In Progress`
- `Completed`

## 4) Course grid

- Grid wrapper: `data-ms-code="course-grid"`
- Card template: `data-ms-code="course-template"`

Inside card template:

- `data-ms-field="course.title"`
- `data-ms-field="course.description"`
- `data-ms-field="course.category"`
- `data-ms-code="course-stats"` (e.g. `10 LESSONS · ~4 HOURS`)
- optional `data-ms-code="course-progress-fill"` for progress bar fill width
- cover targets (optional):
  - `data-ms-code="course-cover-bg"`
  - `data-ms-code="course-cover-img"`
- CTA:
  - `data-ms-code="detail-link"`
  - `ms-code-detail-page="/course"`
  - `ms-code-id-param="id"` (optional)

## 5) Status tags

Inside each card, add variants:

- `data-ms-show-if="status" data-ms-show-value="complete"`
- `data-ms-show-if="status" data-ms-show-value="in_progress"`
- `data-ms-show-if="status" data-ms-show-value="not_started"`

Optional inner label node:

- `data-ms-code="status-label"`

## 6) Optional list states

- `data-ms-code="list-loading"`
- `data-ms-code="list-empty"`
- `data-ms-code="list-error"`

These are optional; script handles missing state slots safely.
