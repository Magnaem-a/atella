# `member-all-courses.js` - all courses in member shell (non-member-specific)

This page is inside member UI chrome, but data is global (not scoped per member).

> **Loading:** this page's script ships in the site-wide `atella.js` bundle —
> see the repo `README.md`. Nothing to paste per page; just add the attributes
> below. The script auto-detects the page and runs only here.

## Page wrapper

Add on the outer wrapper:

```html
<section
  data-ms-code="member-all-courses-page"
  ms-code-table-course="courses"
  ms-code-table-module="modules"
  ms-code-table-lesson="lessons"
  ms-code-table-progress="lesson_progress">
</section>
```

## Header stats

- `data-ms-code="courses-count"`
- `data-ms-code="lessons-count"`
- `data-ms-code="modules-count"`

## Filters (optional)

- Filter bar: `data-ms-code="filter-tabs"`
- One filter button template: `data-ms-code="filter-tab-template"`
- In filter template:
  - label node: `data-ms-code="filter-label"`
  - badge count node: `data-ms-code="filter-count"`

Script auto-builds: `All` + one tab per `course.category`.

## Course grid

- Grid wrapper: `data-ms-code="course-grid"`
- One card template: `data-ms-code="course-template"`

Inside course template:

- `data-ms-field="course.title"`
- `data-ms-field="course.description"`
- `data-ms-field="course.category"`
- `data-ms-code="course-order"` (example: `COURSE 01`)
- `data-ms-code="course-stats"` (example: `10 LESSONS · ~4 HOURS`)
- `data-ms-code="course-modules-lessons"` (example: `2 MODULES · 10 LESSONS`)
- cover targets (optional):
  - `data-ms-code="course-cover-bg"`
  - `data-ms-code="course-cover-img"`
- card/view link:
  - `data-ms-code="detail-link"`
  - `ms-code-detail-page="/course"`
  - `ms-code-id-param="id"` (optional)

## Status tags on card image

For your three stacked tags (`Complete`, `in progress`, `NOT STARTED`), add:

- `data-ms-show-if="status" data-ms-show-value="complete"`
- `data-ms-show-if="status" data-ms-show-value="in_progress"`
- `data-ms-show-if="status" data-ms-show-value="not_started"`

The script shows exactly one tag per card and hides the others.
Inside each tag, you can add `data-ms-code="status-label"` for the inner text node.
The script will set it to `Completed`, `In progress`, or `Not started`.
It resolves status from these fields (first match wins):

- text status: `status`, `course_status`, `progress_status`, `enrollment_status`, `state`
- numeric percent: `progress_percent`, `completion_percent`, `percent_complete`
- numeric counts: `completed_lessons`, `lessons_completed` (compared against course lesson count)

If none are present, it falls back to `not_started`.

When a member is signed in and `ms-code-table-progress` is configured, the script prioritizes real `lesson_progress` for each course:
- all lessons done -> `complete`
- some lessons done -> `in_progress`
- none done -> `not_started`

## Optional list states

- `data-ms-code="list-loading"`
- `data-ms-code="list-empty"`
- `data-ms-code="list-error"`

## Customize

- Change table names via wrapper `ms-code-table-*`.
- Change destination route via `ms-code-detail-page`.
- Keep style/layout classes untouched; script only depends on `data-ms-code` / `data-ms-field`.
