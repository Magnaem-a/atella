# Webflow Attribute Checklist (MS-Only)

Use only:

- `data-ms-code`
- `data-ms-field`
- `ms-code-*`
- `ms-field-*`

Keep legacy attributes temporarily for compatibility, but new wiring should be `data-ms-code` first.

---

## Global (Every Page)

- [ ] Page wrapper exists:
  - [ ] `data-ms-code="course-page"` OR `module-page` OR `lesson-page` OR dashboard wrapper
- [ ] State variants keep using:
  - [ ] `data-ms-show-if`
  - [ ] `data-ms-show-value`

---

## Module Detail (start here)

### Wrapper
- [ ] Root wrapper: `data-ms-code="module-page"`
- [ ] Table config on wrapper:
  - [ ] `ms-code-table-course="courses"`
  - [ ] `ms-code-table-module="modules"`
  - [ ] `ms-code-table-lesson="lessons"`
  - [ ] `ms-code-table-progress="lesson_progress"`

### Convert these legacy tokens to `data-ms-code`
- [ ] `data-module="progress-fill"` -> `data-ms-code="progress-fill"`
- [ ] `data-module="crumb-learn"` -> `data-ms-code="crumb-learn"`
- [ ] `data-module="crumb-course"` -> `data-ms-code="crumb-course"`
- [ ] `data-module="crumb-module"` -> `data-ms-code="crumb-module"`
- [ ] `data-module="prev-module"` -> `data-ms-code="prev-module"`
- [ ] `data-module="next-module"` -> `data-ms-code="next-module"`
- [ ] `data-module="module-meta"` -> `data-ms-code="module-meta"`
- [ ] `data-module="progress-label"` -> `data-ms-code="progress-label"`
- [ ] `data-module="lesson-order-label"` -> `data-ms-code="lesson-order-label"`
- [ ] `data-module="lesson-duration-label"` -> `data-ms-code="lesson-duration-label"`
- [ ] Any `data-module="pad"` flags used on `data-ms-field` nodes -> `data-ms-code="pad"`

### Keep (already correct)
- [ ] `data-ms-code="lesson-list"`
- [ ] `data-ms-code="lesson-template"`
- [ ] `data-ms-field="module.*"`, `data-ms-field="course.*"`, `data-ms-field="lesson.*"`
- [ ] `ms-code-detail-page`, `ms-code-id-param`

---

## Lesson Detail (next)

### Wrapper
- [ ] Root wrapper: `data-ms-code="lesson-page"`
- [ ] Table config on wrapper:
  - [ ] `ms-code-table-course="courses"`
  - [ ] `ms-code-table-module="modules"`
  - [ ] `ms-code-table-lesson="lessons"`
  - [ ] `ms-code-table-progress="lesson_progress"`
  - [ ] `ms-code-table-saved-lessons="saved_lessons"`
  - [ ] `ms-code-table-breakdown="lesson_breakdown"`
  - [ ] `ms-code-table-reference="reference"`

### Convert legacy tokens to `data-ms-code`
- [ ] `crumb-learn`, `crumb-course`, `crumb-module`, `crumb-lesson`
- [ ] `progress-count`, `progress-fill`
- [ ] `video-player`, `video-thumb`, `watch-lesson`
- [ ] `prev-lesson`, `next-lesson`, `prev-module`, `next-module`
- [ ] `module-link`
- [ ] `mark-complete`, `save-lesson`, `view-course`

### Keep
- [ ] `data-ms-code="curriculum"`
- [ ] `data-ms-code="lesson-template"`
- [ ] `data-ms-code="lesson-breakdown"` + `breakdown-template`
- [ ] `data-ms-code="resources"` + `resource-template`
- [ ] `data-ms-show-if` / `data-ms-show-value`

---

## Course Detail (after lesson)

### Wrapper
- [ ] Root wrapper: `data-ms-code="course-page"`
- [ ] Table config on wrapper:
  - [ ] `ms-code-table-course="courses"`
  - [ ] `ms-code-table-module="modules"`
  - [ ] `ms-code-table-lesson="lessons"`
  - [ ] `ms-code-table-instructor="instructors"`
  - [ ] `ms-code-table-outcome="outcomes"`
  - [ ] `ms-code-table-progress="lesson_progress"`
  - [ ] `ms-code-table-enrollment="enrollments"`
  - [ ] `ms-code-table-saved-courses="saved_courses"`
  - [ ] `ms-code-table-saved-lessons="saved_lessons"`
  - [ ] `ms-code-table-activity="activity"`

### Convert legacy tokens to `data-ms-code`
- [ ] `modules-count`, `updated-at`, `progress-count`, `progress-fill`
- [ ] `resume-order`, `watch-first`
- [ ] `cover-bg`, `cover-img`, `cover`, `preview-thumb`
- [ ] `module-link`, `outcome-label`, `outcome-card`
- [ ] `enroll-btn`, `reactivate-btn`, `drop`, `hard-unenroll`, `save-course`
- [ ] `drop-modal`, `reset-modal`, `confirm-yes`, `confirm-cancel`, `confirm-backdrop`

### Keep
- [ ] `data-ms-code="curriculum"`, `module-template`, `lesson-template`
- [ ] `data-ms-code="first-lesson"`, `outcomes`, `outcome-template`, `instructor`
- [ ] `data-ms-field="course.*" | module.* | lesson.* | instructor.* | outcome.*`
- [ ] `data-ms-show-if` / `data-ms-show-value`

---

## Dashboard (last)

### Wrapper
- [ ] Add/confirm a dashboard wrapper token: `data-ms-code="dashboard-page"` (recommended)
- [ ] Put table config on the dashboard wrapper (`[data-ms-code="dashboard-page"]`):
  - [ ] `ms-code-table-course="courses"`
  - [ ] `ms-code-table-module="modules"`
  - [ ] `ms-code-table-lesson="lessons"`
  - [ ] `ms-code-table-progress="lesson_progress"`
  - [ ] `ms-code-table-activity="activity"`

### Convert legacy `data-dashboard` tokens to `data-ms-code`
- [ ] `streak`, `lessons-total`, `narrative`
- [ ] `continue-label`, `module-path`, `continue-time-remaining`
- [ ] `module-progress-label`, `module-progress-fill`
- [ ] `course-lessons-count`, `course-lessons-total`, `course-lessons-label`
- [ ] `course-progress-percent`, `course-progress-text`, `course-hours`, `course-progress-fill`
- [ ] `activity-meta`, `activity-time`

### Keep
- [ ] `data-ms-code="list-container"`, `list-template`, `list-loading`, `list-empty`, `list-error`
- [ ] `data-ms-code="detail-link"`, `count-value`
- [ ] `ms-code-detail-page`, `ms-code-id-param`

---

## Copy-paste examples

```html
<!-- Module token migration -->
<a data-module="next-module" data-ms-code="next-module"></a>
```

```html
<!-- Action token migration -->
<a data-course="save-course" data-ms-code="save-course"></a>
```

```html
<!-- Label token migration -->
<p data-module="module-meta" data-ms-code="module-meta"></p>
```
