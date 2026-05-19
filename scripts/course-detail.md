# `course-detail.js` - page runtime + setup

Single script for the course detail page. It reads MS-only attributes from `[data-ms-code="course-page"]`, loads configured tables, renders all sections, and wires course actions.

> **Loading:** this page's script ships in the site-wide `atella.js` bundle —
> see the repo `README.md`. Nothing to paste per page; just add the attributes
> below. The script auto-detects the page and runs only here.

## What it handles

- Hero content, cover image, and CTA variants
- Enrollment state variants (`active|paused|dropped|completed|none`)
- Curriculum rendering (module + lesson templates)
- Outcomes rendering
- First-lesson preview + detail links
- Instructor rendering
- Save/enroll/reactivate/drop/hard-reset actions

## Data + attribute contract

- Primary selectors: `data-ms-code`
- Data binding: `data-ms-field`
- Behavior config: `ms-code-*`
- Variants: `data-ms-show-if` + `data-ms-show-value`

Wrapper: `[data-ms-code="course-page"]`

Table keys on wrapper:

- `ms-code-table-course`
- `ms-code-table-module`
- `ms-code-table-lesson`
- `ms-code-table-instructor`
- `ms-code-table-outcome`
- `ms-code-table-progress`
- `ms-code-table-enrollment`
- `ms-code-table-saved-courses`
- `ms-code-table-saved-lessons`
- `ms-code-table-activity`

## Attribute setup

Expected URL: `/course?id=rec_course123` (or `?slug=...`).

### 1) Page wrapper

```html
<section
  data-ms-code="course-page"
  ms-code-id-param="id"
  ms-code-slug-param="slug"
  ms-code-table-course="courses"
  ms-code-table-module="modules"
  ms-code-table-lesson="lessons"
  ms-code-table-instructor="instructors"
  ms-code-table-outcome="outcomes"
  ms-code-table-progress="lesson_progress"
  ms-code-table-enrollment="enrollments"
  ms-code-table-saved-courses="saved_courses"
  ms-code-table-saved-lessons="saved_lessons"
  ms-code-table-activity="activity">
</section>
```

### 2) Hero + key UI

- Title: `data-ms-field="course.title"`
- Description: `data-ms-field="course.description"`
- Eyebrow/meta labels:
  - `data-ms-code="hero-eyebrow"`
  - `data-ms-code="stats-lessons"`
  - `data-ms-code="stats-modules"`
  - `data-ms-code="stats-hours"`
  - `data-ms-code="stats-updated"`
- Cover media:
  - `data-ms-code="cover-bg"`
  - `data-ms-code="cover-img"`
  - `data-ms-code="cover"`

### 3) CTA + enrollment states

CTA variants (`data-ms-show-if="cta"`):

- `resume` (`data-ms-code="detail-link"` + `ms-code-detail-page="/lesson"`)
- `start` (`data-ms-code="detail-link"` + `ms-code-detail-page="/lesson"`)
- `enroll` (`data-ms-code="enroll-btn"`)
- `reactivate` (`data-ms-code="reactivate-btn"`)

Other actions:

- `data-ms-code="watch-first"`
- `data-ms-code="save-course"`
- `data-ms-code="drop"`
- `data-ms-code="hard-unenroll"`

Enrollment variants (`data-ms-show-if="enroll"`):

- `active|paused|dropped|completed|none`
- with label targets like `data-ms-code="enroll-active-label"`

### 4) Curriculum section

- Wrapper: `data-ms-code="curriculum"`
- Header labels:
  - `data-ms-code="curriculum-summary"`
  - `data-ms-code="progress-fraction"`
  - `data-ms-code="progress-fill"`
- Module template: `data-ms-code="module-template"`
- Lesson template: `data-ms-code="lesson-template"`
- Optional module link: `data-ms-code="module-link"` + `ms-code-detail-page="/module"`

Lesson row status variants:

- `data-ms-show-if="status"` with `done|active|locked|todo`

### 5) Outcomes section

- Wrapper: `data-ms-code="outcomes"`
- Template: `data-ms-code="outcome-template"`
- Fields:
  - `data-ms-field="outcome.title"`
  - `data-ms-field="outcome.description"`
  - `data-ms-code="outcome-label"`

### 6) First lesson preview

- Wrapper: `data-ms-code="first-lesson"`
- Link: `data-ms-code="detail-link"` + `ms-code-detail-page="/lesson"`
- Fields:
  - `data-ms-field="first-lesson.title"`
  - `data-ms-field="first-lesson.description"`
  - `data-ms-code="first-lesson-meta"`
  - `data-ms-code="first-lesson-duration"`
  - `data-ms-code="preview-thumb"`

### 7) Instructor section

- Wrapper: `data-ms-code="instructor"`
- Fields:
  - `data-ms-field="instructor.name"`
  - `data-ms-field="instructor.title"`
  - `data-ms-field="instructor.bio"`
  - `data-ms-field="instructor.years_of_experience"`
  - `data-ms-field="instructor.avatar"` + `data-ms-code="bg-image"`

### 8) Confirm modals

- `data-ms-code="drop-modal"`
- `data-ms-code="reset-modal"`
- `data-ms-code="confirm-yes"`
- `data-ms-code="confirm-cancel"`
- `data-ms-code="confirm-backdrop"`

## Customize this page

- Change table names by editing wrapper `ms-code-table-*` values.
- Change routes with `ms-code-detail-page` / `ms-code-id-param`.
- Add/remove visual states via `data-ms-show-if` blocks.
- Keep token hooks intact and style freely in Webflow.
