# `all-courses.js` - public all courses page

Public page runtime for the "Everything we teach" courses list.

> **Loading:** this page's script ships in the site-wide `atella.js` bundle —
> see the repo `README.md`. Nothing to paste per page; just add the attributes
> below. The script auto-detects the page and runs only here.

## 1) Page wrapper

Add this to your outer page wrapper:

```html
<section
  data-ms-code="all-courses-page"
  ms-code-table-course="courses"
  ms-code-table-module="modules"
  ms-code-table-lesson="lessons">
</section>
```

## 2) Hero stats targets

- `data-ms-code="courses-count"`
- `data-ms-code="modules-count"`
- `data-ms-code="lessons-count"`

## 3) Course stack setup

- Stack wrapper: `data-ms-code="course-stack"`
- One course card template: `data-ms-code="course-template"`

Inside course template:

- `data-ms-field="course.title"`
- `data-ms-field="course.description"`
- `data-ms-field="course.category"`
- `data-ms-code="course-order"` (renders `COURSE 01`)
- `data-ms-code="course-stats"` (renders `X MODULES · Y LESSONS`)
- Cover targets (optional):
  - `data-ms-code="course-cover-bg"`
  - `data-ms-code="course-cover-img"` (for `<img>`)
- View button link:
  - `data-ms-code="detail-link"`
  - `ms-code-detail-page="/course"` (or your route)
  - `ms-code-id-param="id"` (optional)

## 4) Module preview list inside each course card

- Module list wrapper: `data-ms-code="module-list"`
- One row template: `data-ms-code="module-template"`

Inside module template:

- `data-ms-field="module.title"`
- `data-ms-field="module.description"`
- `data-ms-code="module-stats"` (renders `MODULE 01 · X LESSONS`)

## 5) Optional list states

You can add these state slots anywhere inside the page wrapper:

- `data-ms-code="list-loading"`
- `data-ms-code="list-empty"`
- `data-ms-code="list-error"`

## 6) Customize without editing JS

- Change table names on the wrapper `ms-code-table-*`.
- Change destination pages via `ms-code-detail-page`.
- Change text/style in Webflow while keeping `data-ms-code` and `data-ms-field` hooks.
