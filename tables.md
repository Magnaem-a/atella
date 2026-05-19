Here's the complete table and field schema for Atella's Memberstack data tables.

---

# Atella — Memberstack Data Tables Schema

12 tables total. Set up in Memberstack dashboard before running the seed script.

---

## Table 1: `courses`

| Field | Type | Notes |
|---|---|---|
| `title` | TEXT | "Building with Claude & MCP" |
| `slug` | TEXT | URL identifier — `building-with-claude-mcp` |
| `category` | TEXT | One of: `foundations` · `craft` · `shipping` |
| `description` | TEXT | Short course description |
| `lesson_count` | NUMBER | 10 |
| `hours_estimate` | TEXT | "~4 hours" — kept as text so you can write "~4 hours" not just `4` |
| `cover_image` | TEXT | Image URL |
| `order` | NUMBER | 1, 2, 3 — display order |

**Access rules:**
- Read: any authenticated member
- Create / Update / Delete: admin only (no member can write)

---

## Table 2: `instructors`

| Field | Type | Notes |
|---|---|---|
| `name` | TEXT | "Marlowe Park" |
| `title` | TEXT | "Founder · Lead Instructor" |
| `avatar` | URL | Profile image URL |
| `courses` | REFERENCE_MANY → courses | Courses this instructor teaches |
| `years_of_experience` | TEXT | Kept as text so you can write "10+" not just `10` |
| `bio` | TEXT | Short bio shown on the course detail page |

**Access rules:**
- Read: any authenticated member
- Create / Update / Delete: admin only

**Relationship note:** the link is stored on the **instructor** side as a
`REFERENCE_MANY` to courses. To find the instructor for a given course, query
`instructors` where `courses` contains the current course ID. If you need
fast course → instructor lookups, consider also adding a denormalized
`instructor` REFERENCE field on `courses`.

---

## Table 3: `modules`

| Field | Type | Notes |
|---|---|---|
| `title` | TEXT | "Foundations of the API" |
| `slug` | TEXT | `foundations-of-the-api` |
| `course` | REFERENCE → courses | Which course this module belongs to |
| `lesson_count` | NUMBER | 5 |
| `order` | NUMBER | 1 or 2 — order within the course |

**Access rules:**
- Read: any authenticated member
- Create / Update / Delete: admin only

---

## Table 4: `lessons`

| Field | Type | Notes |
|---|---|---|
| `title` | TEXT | "Your first conversation with Claude" |
| `slug` | TEXT | `first-conversation-claude` |
| `module` | REFERENCE → modules | Parent module |
| `course` | REFERENCE → courses | Denormalized — same course as the module's parent. Speeds up queries that need to filter by course without joining through modules |
| `duration_minutes` | NUMBER | 12 |
| `video_url` | TEXT | Vimeo/YouTube embed URL |
| `description` | TEXT | One-line lesson description |
| `order` | NUMBER | 1–5 — order within the module |

**Access rules:**
- Read: any authenticated member
- Create / Update / Delete: admin only

---

## Table 5: `enrollments`

Tracks which members are actively enrolled in which courses. Course-level
record — per-lesson completion lives in `lesson_progress`.

| Field | Type | Notes |
|---|---|---|
| `owner` | MEMBER_REFERENCE | The enrolled member |
| `course` | REFERENCE → courses | Which course |
| `enrolled_at` | DATE | When they enrolled |
| `current_lesson` | REFERENCE_MANY → lessons | The lesson(s) they're currently on. `REFERENCE_MANY` on Memberstack — usually treated as a single-element array |
| `status` | TEXT | One of: `active` · `paused` · `dropped` · `completed` |

**Access rules:**
- Read / Create / Update / Delete: only the owner

**Use `ms-code-prevent-duplicates="true"`** on the enroll form to prevent the
same member enrolling twice in the same course.

**Why both `enrollments` and `lesson_progress`?**
- `enrollments` answers "is this member taking this course?" (course-level)
- `lesson_progress` answers "have they finished lesson X?" (per-lesson)

The dashboard's "your courses" grid can switch from inferring enrollment via
`lesson_progress` to querying `enrollments` directly — faster and more
explicit.

---

## Table 6: `lesson_progress`

| Field | Type | Notes |
|---|---|---|
| `owner` | MEMBER_REFERENCE | The member tracking this lesson |
| `lesson` | REFERENCE → lessons | Which lesson |
| `course` | REFERENCE → courses | Denormalized — powers fast course-level progress % queries |
| `completed` | NUMBER | `0` or `1` (Memberstack doesn't have a native boolean type) |
| `completed_at` | DATE | Set when completed flips to 1 |
| `last_watched_at` | DATE | Updated every time the lesson is opened — drives "Continue watching" |

**Access rules:**
- Read: members can read only their own rows (`owner = self`)
- Create / Update: members can create + update only their own rows
- Delete: members can delete only their own rows

---

## Table 7: `saved_courses`

| Field | Type | Notes |
|---|---|---|
| `owner` | MEMBER_REFERENCE | The member who saved |
| `course` | REFERENCE → courses | Which course |
| `saved_at` | DATE | When saved |

**Access rules:**
- Read / Create / Update / Delete: only the owner

**Use `ms-code-prevent-duplicates="true"`** on the save form to prevent the same member saving the same course twice.

---

## Table 8: `saved_lessons`

| Field | Type | Notes |
|---|---|---|
| `owner` | MEMBER_REFERENCE | The member who saved |
| `lesson` | REFERENCE → lessons | Which lesson |
| `course` | REFERENCE → courses | Denormalized — lets the Saved page group lessons by course quickly |
| `saved_at` | DATE | When saved |

**Access rules:**
- Read / Create / Update / Delete: only the owner

**Use `ms-code-prevent-duplicates="true"`** on the save form.

---

## Table 9: `outcomes`

What the learner walks away with — drives the "WHAT YOU'LL BUILD" cards on
the course detail page. One row per outcome card.

| Field | Type | Notes |
|---|---|---|
| `title` | TEXT | "A working Claude integration in your codebase" |
| `description` | TEXT | One-line subhead under the title |
| `course` | REFERENCE → courses | Which course this outcome belongs to |
| `order` | NUMBER | 1, 2, 3 — display order on the grid |

**Access rules:**
- Read: any authenticated member
- Create / Update / Delete: admin only

---

## Table 10: `lesson_breakdown`

The blow-by-blow agenda inside a single lesson — "what we cover, in order".
Renders on the lesson page.

| Field | Type | Notes |
|---|---|---|
| `content` | TEXT | One bullet / step in the breakdown |
| `lesson` | REFERENCE → lessons | Parent lesson |
| `order` | NUMBER | Order within the lesson |

**Access rules:**
- Read: any authenticated member
- Create / Update / Delete: admin only

---

## Table 11: `reference`

Resources attached to a lesson — code samples, external links, downloads,
or transcripts. Drives the resource list on the lesson page.

| Field | Type | Notes |
|---|---|---|
| `title` | TEXT | Display label — "Starter repo on GitHub" |
| `url` | TEXT | Where the resource lives |
| `type` | TEXT | One of: `code` · `link` · `download` · `transcript` — drives the icon / variant on the card |
| `lesson` | REFERENCE → lessons | Parent lesson |
| `order` | NUMBER | Order within the lesson |

**Access rules:**
- Read: any authenticated member
- Create / Update / Delete: admin only

---

## Table 12: `activity`

The unified feed for the Dashboard's "Recent activity" card.

| Field | Type | Notes |
|---|---|---|
| `owner` | MEMBER_REFERENCE | The member this activity belongs to |
| `type` | TEXT | One of: `lesson_complete` · `course_complete` · `lesson_saved` · `course_saved` · `comment_replied` · `streak_milestone` · `office_hours_attended` |
| `actor_name` | TEXT | Member's name at activity time (denormalized so old rows don't break if name changes) |
| `lesson` | REFERENCE → lessons | Optional — only for lesson_* types |
| `course` | REFERENCE → courses | Optional — for lesson_* and course_* types |
| `meta_text` | TEXT | Human-readable description — "Lesson 03 · Context engineering" |
| `link_url` | TEXT | Where the row links to when clicked |
| `created_at` | DATE | Drives sort order |

**Access rules:**
- Read: only the owner
- Create: typically server-side via memberscript on user actions (mark complete, save, etc.)
- Update / Delete: not used (activity is append-only; consider disabling)

---


## Reference field gotcha

When creating REFERENCE field rows via `createDataRecord`, Memberstack expects either format. Try direct ID first, fall back to object:

```javascript
// Preferred — direct ID
data: { course: 'rec_abc123' }

// Fallback if the above errors
data: { course: { id: 'rec_abc123' } }
```

The seed script handles this automatically.

---

## Provisioning order (REFERENCE dependencies)

Set up tables in this order in Memberstack — REFERENCE fields can only target tables that already exist:

1.  `courses` (no dependencies)
2.  `instructors` (depends on courses)
3.  `modules` (depends on courses)
4.  `lessons` (depends on modules + courses)
5.  `enrollments` (depends on lessons + courses + members)
6.  `lesson_progress` (depends on lessons + courses + members)
7.  `saved_courses` (depends on courses + members)
8.  `saved_lessons` (depends on lessons + courses + members)
9.  `outcomes` (depends on courses)
10. `lesson_breakdown` (depends on lessons)
11. `reference` (depends on lessons)
12. `activity` (depends on lessons + courses + members)

---
