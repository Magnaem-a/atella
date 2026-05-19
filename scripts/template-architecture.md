# Template Script Architecture (Target)

This workspace is moving to a single-template runtime that is:

- attribute-first (no class selectors)
- page-agnostic at boot (auto-detect page wrapper)
- backward compatible during migration
- publishable as one CDN script

## Decisions Locked

- Attribute namespace: MS-only (`data-ms-code`, `data-ms-field`, `ms-code-*`, `ms-field-*`)
- Page detection: auto from wrapper attributes
- Migration mode: compatibility-first
- Workspace layout: flat `scripts/` directory (no nested folders)

## Attribute Standard

- `data-ms-code="<token>"`: UI targets, actions, and section markers
- `data-ms-field="<table.field>"`: data-binding targets
- `ms-code-*`: behavior config attributes (detail-page params, filters, etc.)
- `ms-field-*`: field-level modifiers when needed
- `data-ms-show-if` + `data-ms-show-value`: variant visibility toggles

Legacy attributes remain supported during migration:

- `data-course`, `data-module`, `data-lesson`
- `data-dashboard`

## Script Rules

- Never rely on class names for behavior
- Never hardcode route paths in scripts
- Use `ms-code-detail-page` + `ms-code-id-param` for links
- Use shared cache for all Memberstack table reads/writes
- Keep feature toggles near top-level config

## Batch Plan

1. Keep one script per page at root: `scripts/course-detail.js`, `scripts/module-detail.js`, `scripts/lesson-detail.js`, `scripts/dashboard.js`.
2. Keep all docs at root (`scripts/*.md`) and remove nested docs folders.
3. Keep legacy attribute support until all pages are updated in Webflow.
4. Freeze contract in setup docs and publish.

## Completed in this batch

- Removed hardcoded course route fallback from the dashboard runtime.
- Removed hardcoded lesson route template from the dashboard runtime.
- Dashboard table config now reads from `[data-ms-code="dashboard-page"]`.
