# `enrolled-courses.js` - member-specific enrolled courses page

This runtime is member-scoped and only shows courses from the current member's `enrollments`.

> **Loading:** this page's script ships in the site-wide `atella.js` bundle —
> see the repo `README.md`. Nothing to paste per page; just add the attributes
> below. The script auto-detects the page and runs only here.

## 1) Page wrapper

```html
<section
  data-ms-code="enrolled-courses-page"
  ms-code-table-course="courses"
  ms-code-table-lesson="lessons"
  ms-code-table-progress="lesson_progress"
  ms-code-table-enrollment="enrollments">
</section>
```

## 2) Header stats

- `data-ms-code="courses-count"`
- `data-ms-code="lessons-count"`
- `data-ms-code="hours-count"`

## 3) Filters

- Filter bar: `data-ms-code="filter-tabs"`
- One tab template: `data-ms-code="filter-tab-template"`
- Inside tab template:
  - `data-ms-code="filter-label"`
  - `data-ms-code="filter-count"`

Script outputs these tabs:
- `All`
- `In Progress`
- `Completed`

## 4) Course grid

- Grid wrapper: `data-ms-code="course-grid"`
- One card template: `data-ms-code="course-template"`

Inside course card template:

- `data-ms-field="course.title"`
- `data-ms-field="course.description"`
- `data-ms-field="course.category"`
- `data-ms-code="course-stats"` (example: `10 LESSONS · ~4 HOURS`)
- `data-ms-code="course-progress"` (example: `4 / 10 LESSONS`)
- `data-ms-code="course-progress-fill"` (progress bar inner fill)
- cover targets (optional):
  - `data-ms-code="course-cover-bg"`
  - `data-ms-code="course-cover-img"`
- CTA link:
  - `data-ms-code="detail-link"`
  - `ms-code-detail-page="/course"`
  - `ms-code-id-param="id"` (optional)

## 5) Status tags/variants on each card

Use variant blocks inside each card:

- `data-ms-show-if="status" data-ms-show-value="complete"` (or `completed`)
- `data-ms-show-if="status" data-ms-show-value="in_progress"`
- `data-ms-show-if="status" data-ms-show-value="not_started"`

The script shows exactly one of those per card.
Optional inner text target: `data-ms-code="status-label"` for automatic label text.

## 6) Optional list states

- `data-ms-code="list-loading"`
- `data-ms-code="list-empty"`
- `data-ms-code="list-error"`

## 7) Behavior notes

- Drops any enrollment row where `status = dropped`.
- `complete` means completed lessons >= total lessons in the course.
- `in_progress` means completed lessons > 0 and not fully complete.
- `not_started` means 0 completed lessons.
