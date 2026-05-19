# Attribute Migration Map (All Pages, MS-Only)

Compatibility-first migration: add `data-ms-code` aliases now, keep legacy attrs until cleanup.

## Global Convention

- Wrapper remains: `data-ms-code="<page-token>"`
- UI targets/actions/labels: `data-ms-code="<token>"`
- Data binding: `data-ms-field="<table.field>"`
- Behavior config: `ms-code-*`, `ms-field-*`
- Variants: `data-ms-show-if` + `data-ms-show-value`

---

## 1) Course Detail Page

### Wrapper
- Keep: `data-ms-code="course-page"`

### Token aliases (`data-course` -> `data-ms-code`)
- `modules-count`
- `updated-at`
- `progress-count`
- `progress-fill`
- `resume-order`
- `watch-first`
- `cover-bg`
- `cover-img`
- `cover`
- `preview-thumb`
- `module-link`
- `outcome-label`
- `outcome-card`
- `drop-modal`
- `reset-modal`
- `enroll-btn`
- `reactivate-btn`
- `drop`
- `hard-unenroll`
- `save-course`
- `confirm-yes`
- `confirm-cancel`
- `confirm-backdrop`

---

## 2) Module Detail Page

### Wrapper
- Keep: `data-ms-code="module-page"`

### Token aliases (`data-module` -> `data-ms-code`)
- `progress-fill`
- `crumb-learn`
- `crumb-course`
- `crumb-module`
- `prev-module`
- `next-module`
- any text keys currently set via `setLabel(...)` (same token value)

### Section/template markers (keep)
- `data-ms-code="lesson-list"`
- `data-ms-code="lesson-template"`

### State variants
- Keep using `data-ms-show-if` / `data-ms-show-value`

---

## 3) Lesson Detail Page

### Wrapper
- Keep: `data-ms-code="lesson-page"`

### Token aliases (`data-lesson|data-module|data-course` -> `data-ms-code`)
- Breadcrumbs:
  - `crumb-learn`
  - `crumb-course`
  - `crumb-module`
  - `crumb-lesson`
- Progress/video:
  - `progress-count`
  - `progress-fill`
  - `video-player`
  - `video-thumb`
  - `watch-lesson`
- Pagination/nav:
  - `prev-lesson`
  - `next-lesson`
  - `prev-module` (module alias used on lesson page)
  - `next-module` (module alias used on lesson page)
- Curriculum:
  - `module-link`
- Actions:
  - `mark-complete`
  - `save-lesson`
  - `view-course`
- Course alias still used by lesson script:
  - `preview-thumb`
  - `module-link`

### Section/template markers (keep)
- `data-ms-code="curriculum"`
- `data-ms-code="lesson-template"`
- `data-ms-code="lesson-breakdown"`
- `data-ms-code="breakdown-template"`
- `data-ms-code="resources"`
- `data-ms-code="resource-template"`

### State variants
- Keep using `data-ms-show-if` / `data-ms-show-value`

---

## 4) Dashboard (single page script)

### Wrapper
- Recommended: `data-ms-code="dashboard-page"` on the dashboard root

### Token aliases (`data-dashboard` -> `data-ms-code`)
- `streak`
- `lessons-total`
- `narrative`
- `continue-label`
- `module-path`
- `continue-time-remaining`
- `module-progress-label`
- `module-progress-fill`
- `course-lessons-count`
- `course-lessons-total`
- `course-lessons-label`
- `course-progress-percent`
- `course-progress-text`
- `course-hours`
- `course-progress-fill`
- `activity-meta`
- `activity-time`

### List containers/templates (keep)
- `data-ms-code="list-container"`
- `data-ms-code="list-template"`
- `data-ms-code="list-loading"`
- `data-ms-code="list-empty"`
- `data-ms-code="list-error"`
- `data-ms-code="count-value"`
- `data-ms-code="detail-link"`

### State variants
- Keep using `data-ms-show-if` / `data-ms-show-value`

---

## Copy-Paste Pattern (use everywhere)

For each legacy token, keep old + add new:

```html
<!-- token alias -->
<a data-module="next-module" data-ms-code="next-module"></a>

<!-- state variant stays MS-native -->
<div data-ms-show-if="status" data-ms-show-value="done"></div>
```

---

## Final Cleanup Phase (later)

After scripts are fully switched to `data-ms-code` selectors:

1. Remove legacy `data-course` / `data-module` / `data-lesson` / `data-dashboard`.
2. Keep `data-ms-show-if` / `data-ms-show-value`.
3. Keep `data-ms-code` / `data-ms-field` / `ms-code-*` / `ms-field-*` as the final standard.
