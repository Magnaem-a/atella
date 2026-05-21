<!-- 💙 Script v0.1 💙 DASHBOARD PAGE -->
<!-- Requires window.MSDataCache — load the shared MS Data Cache snippet BEFORE this script. -->
<script>

/* ──────────────────────────────────────────────────────────────────────────
 * 1b. DASHBOARD LIST SLOTS — optional overlay states (independent of template)
 * ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  function clearClones(ctn) {
    if (!ctn) return;
    ctn.querySelectorAll('[data-ms-clone="true"]').forEach(function (n) {
      n.parentNode.removeChild(n);
    });
  }

  function listSlots(ctn) {
    return {
      template: ctn.querySelector('[data-ms-code="list-template"]'),
      loading:  ctn.querySelector('[data-ms-code="list-loading"]'),
      empty:    ctn.querySelector('[data-ms-code="list-empty"]'),
      error:    ctn.querySelector('[data-ms-code="list-error"]')
    };
  }

  function reveal(el) {
    if (!el) return;
    el.style.removeProperty('display');
    // Clearing the inline style exposes whatever the stylesheet sets. If a
    // CSS class (e.g. `is-state`) still forces `display: none`, removing the
    // inline property isn't enough — set an explicit value to override it.
    // Authors can opt into a specific value via `data-ms-display`.
    if (getComputedStyle(el).display === 'none') {
      el.style.display = el.getAttribute('data-ms-display') || 'block';
    }
  }

  function conceal(el) {
    if (el) el.style.display = 'none';
  }

  /** Toggle list-loading | list-empty | list-error | ready — each node is optional. */
  function showListState(ctn, stateKey) {
    if (!ctn) return;
    var loading = ctn.querySelector('[data-ms-code="list-loading"]');
    var empty = ctn.querySelector('[data-ms-code="list-empty"]');
    var error = ctn.querySelector('[data-ms-code="list-error"]');
    if (loading) { if (stateKey === 'list-loading') reveal(loading); else conceal(loading); }
    if (empty)   { if (stateKey === 'list-empty')   reveal(empty);   else conceal(empty); }
    if (error)   { if (stateKey === 'list-error')   reveal(error);   else conceal(error); }
  }

  function hideTemplate(ctn) {
    var tpl = ctn && ctn.querySelector('[data-ms-code="list-template"]');
    if (tpl) tpl.style.display = 'none';
  }

  function showTemplate(ctn) {
    var tpl = ctn && ctn.querySelector('[data-ms-code="list-template"]');
    if (tpl) tpl.style.removeProperty('display');
  }

  function prepareNoData(ctn) {
    clearClones(ctn);
    hideTemplate(ctn);
  }

  window.DashboardListSlots = {
    clearClones: clearClones,
    listSlots: listSlots,
    showListState: showListState,
    hideTemplate: hideTemplate,
    showTemplate: showTemplate,
    prepareNoData: prepareNoData
  };
})();


/* ──────────────────────────────────────────────────────────────────────────
 * 1c. DASHBOARD COMMON — helpers shared by sections 2–5
 *     Exposes window.DashboardCommon. Must run before the section IIFEs.
 * ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  if (window.DashboardCommon) return;

  var ROOT_SELECTOR = '[data-ms-code="dashboard-page"]';

  /** Resolve a reference field to its record id (accepts an id string or {id}). */
  function idOf(ref) { return (ref && (ref.id || ref)) || null; }

  /** Linear lookup of a record by its id. */
  function byId(arr, id) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].id === id) return arr[i];
    }
    return null;
  }

  /** Build an id → record map for O(1) lookups. */
  function indexById(records) {
    var idx = Object.create(null);
    (records || []).forEach(function (r) { if (r && r.id) idx[r.id] = r; });
    return idx;
  }

  /** Set textContent of the first matching node, skipping empty values. */
  function setText(root, selector, text) {
    if (text == null || text === '') return;
    var el = root.querySelector(selector);
    if (el) el.textContent = text;
  }

  /** Two-digit zero-padded number; em dash when null/undefined. */
  function pad2(n) {
    if (n == null) return '—';
    return ('0' + n).slice(-2);
  }

  /** Read a table-name override from the dashboard root, then body, then fallback. */
  function tableAttr(name, fallback) {
    var root = document.querySelector(ROOT_SELECTOR);
    return (root && root.getAttribute(name)) || document.body.getAttribute(name) || fallback;
  }

  /**
   * Lesson counts for one course:
   *  - total:     lessons in the course
   *  - completed: lessons with a completed progress row
   *  - started:   lessons with any progress row (opened or completed)
   */
  function courseStats(courseId, data) {
    var total = data.lessons.filter(function (l) {
      return idOf(l.data.course) === courseId;
    }).length;
    var courseProgress = data.progress.filter(function (p) {
      return idOf(p.data.course) === courseId;
    });
    var completed = courseProgress.filter(function (p) {
      return (p.data.completed | 0) === 1;
    }).length;
    return { completed: completed, total: total, started: courseProgress.length };
  }

  /**
   * Build loading/empty/error helpers around a section's container lookup.
   * `findContainer` is called fresh each time so DOM timing never matters.
   */
  function makeListState(findContainer) {
    function ui() { return window.DashboardListSlots; }
    return {
      showLoading: function () {
        var c = findContainer();
        if (c) ui().showListState(c, 'list-loading');
      },
      showEmpty: function () {
        var c = findContainer();
        if (!c) return;
        ui().prepareNoData(c);
        ui().showListState(c, 'list-empty');
      },
      showError: function () {
        var c = findContainer();
        if (!c) return;
        ui().prepareNoData(c);
        ui().showListState(c, 'list-error');
      }
    };
  }

  window.DashboardCommon = {
    ROOT_SELECTOR: ROOT_SELECTOR,
    idOf: idOf,
    byId: byId,
    indexById: indexById,
    setText: setText,
    pad2: pad2,
    tableAttr: tableAttr,
    courseStats: courseStats,
    makeListState: makeListState
  };
})();


/* ──────────────────────────────────────────────────────────────────────────
 * 2. DASHBOARD STATS — Lessons Done count, Day Streak, Lessons Total
 * ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var C = window.DashboardCommon;

  var CONFIG = {
    STREAK_FIELDS: ['last_watched_at', 'completed_at'],
    STREAK_TARGET: '[data-ms-code="streak"]',
    LESSONS_TOTAL_TARGET: '[data-ms-code="lessons-total"]',
    COUNT_CONTAINER: '[data-ms-code="list-container"][ms-code-mode="count"]'
  };

  document.addEventListener('DOMContentLoaded', boot);

  async function boot() {
    // Only run on a page that actually has the dashboard stat targets.
    if (!document.querySelector(CONFIG.STREAK_TARGET + ',' + CONFIG.LESSONS_TOTAL_TARGET
      + ',' + CONFIG.COUNT_CONTAINER)) return;
    if (!window.$memberstackDom || !window.MSDataCache) return;
    var ms = window.$memberstackDom;
    var tableProgress = C.tableAttr('ms-code-table-progress', 'lesson_progress');
    var tableLesson = C.tableAttr('ms-code-table-lesson', 'lessons');
    try {
      var member = await window.MSDataCache.getMember(ms);
      if (!member) return;
      var loaded = await Promise.all([
        window.MSDataCache.load(ms, tableProgress, { owner: { equals: member.id } }),
        window.MSDataCache.load(ms, tableLesson, null)
      ]);
      var progress = loaded[0];
      var lessons = loaded[1];
      paintLessonsTotal(lessons.length);
      paintStreak(computeStreak(progress));
      paintCountStats(progress, member);
    } catch (err) {
      console.error('[dashboard-stats] boot failed', err);
    }
  }

  function paintLessonsTotal(n) {
    var el = document.querySelector(CONFIG.LESSONS_TOTAL_TARGET);
    if (el) el.textContent = String(n);
  }

  function paintStreak(n) {
    var el = document.querySelector(CONFIG.STREAK_TARGET);
    if (el) el.textContent = String(n);
  }

  /** Count consecutive days (back from today/yesterday) with at least one progress event. */
  function computeStreak(progress) {
    var DAY = 86400000, days = {};
    progress.forEach(function (r) {
      var ts = pickField(r, CONFIG.STREAK_FIELDS);
      if (!ts) return;
      var d = new Date(ts);
      if (isNaN(d.getTime())) return;
      d.setHours(0, 0, 0, 0);
      days[d.getTime()] = true;
    });
    var sorted = Object.keys(days).map(Number).sort(function (a, b) { return b - a; });
    if (!sorted.length) return 0;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var cursor = today.getTime();
    if (sorted[0] !== cursor && sorted[0] !== cursor - DAY) return 0;
    if (sorted[0] === cursor - DAY) cursor -= DAY;
    var streak = 0;
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i] === cursor) { streak++; cursor -= DAY; }
      else if (sorted[i] < cursor) break;
    }
    return streak;
  }

  /** Fill count-mode containers with a filtered tally of progress rows. */
  function paintCountStats(progress, member) {
    document.querySelectorAll(CONFIG.COUNT_CONTAINER).forEach(function (el) {
      if (el.getAttribute('ms-code-table') !== 'lesson_progress') return;
      var whereStr = el.getAttribute('ms-code-where') || '';
      var ownerField = el.getAttribute('ms-code-owner-field');
      var count = progress.filter(function (r) {
        if (ownerField && r.data && C.idOf(r.data[ownerField]) !== member.id) return false;
        if (!whereStr) return true;
        var parts = whereStr.split(':');
        var field = parts[0], value = parts.slice(1).join(':');
        var actual = r.data && r.data[field];
        return String(actual) === String(value) || Number(actual) === Number(value);
      }).length;
      var target = el.querySelector('[data-ms-code="count-value"]');
      if (target) target.textContent = String(count);
    });
  }

  /** First non-empty value among `fields` on record.data. */
  function pickField(record, fields) {
    if (!record || !record.data) return null;
    for (var i = 0; i < fields.length; i++) {
      if (record.data[fields[i]]) return record.data[fields[i]];
    }
    return null;
  }
})();


/* ──────────────────────────────────────────────────────────────────────────
 * 3. DASHBOARD CONTINUE CARD + NARRATIVE
 * ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var C = window.DashboardCommon;
  var ui = window.DashboardListSlots;

  var CONFIG = {
    NARRATIVE_TARGET: '[data-ms-code="narrative"]',
    NARRATIVE_EMPTY: 'Pick a course to dive in.',
    NARRATIVE_FALLBACK: 'Pick up where you left off.',
    CONTINUE_QUERY: { table: 'lesson_progress', whereAttr: 'completed:0' }
  };

  var state = C.makeListState(findContainer);

  document.addEventListener('DOMContentLoaded', boot);

  async function boot() {
    if (!findContainer()) return; // not the dashboard page
    state.showLoading();
    if (!window.$memberstackDom || !window.MSDataCache) { state.showError(); return; }
    var ms = window.$memberstackDom;
    var tableProgress = C.tableAttr('ms-code-table-progress', 'lesson_progress');
    var tableLesson = C.tableAttr('ms-code-table-lesson', 'lessons');
    var tableModule = C.tableAttr('ms-code-table-module', 'modules');
    var tableCourse = C.tableAttr('ms-code-table-course', 'courses');
    CONFIG.CONTINUE_QUERY.table = tableProgress;
    try {
      var member = await window.MSDataCache.getMember(ms);
      if (!member) { state.showEmpty(); return; }
      var loaded = await Promise.all([
        window.MSDataCache.load(ms, tableProgress, { owner: { equals: member.id } }),
        window.MSDataCache.load(ms, tableLesson, null),
        window.MSDataCache.load(ms, tableModule, null),
        window.MSDataCache.load(ms, tableCourse, null)
      ]);
      var data = { progress: loaded[0], lessons: loaded[1], modules: loaded[2], courses: loaded[3] };
      paintNarrative(data);
      paintContinueCard(data);
    } catch (err) {
      console.error('[dashboard-continue] boot failed', err);
      state.showError();
    }
  }

  function paintNarrative(data) {
    var el = document.querySelector(CONFIG.NARRATIVE_TARGET);
    if (!el) return;
    var resume = pickResume(data);
    if (!resume) { el.textContent = CONFIG.NARRATIVE_EMPTY; return; }
    if (resume.course) {
      var stats = C.courseStats(resume.course.id, data);
      el.textContent = "You're " + stats.completed + ' lessons into '
        + resume.course.data.title + '. Pick up where you left off.';
    } else {
      el.textContent = CONFIG.NARRATIVE_FALLBACK;
    }
  }

  function paintContinueCard(data) {
    var ctn = findContainer();
    if (!ctn) return;
    var slots = ui.listSlots(ctn);
    var resume = pickResume(data);
    if (!resume || !slots.template) {
      ui.prepareNoData(ctn);
      ui.showListState(ctn, 'list-empty');
      return;
    }

    var lesson = resume.lesson, mod = resume.module, course = resume.course;
    var t = slots.template;

    C.setText(t, '[data-ms-field="lesson.title"]', lesson.data.title);
    C.setText(t, '[data-ms-code="continue-label"]',
      'COURSE ' + C.pad2(course && course.data.order) + ' · LESSON ' + C.pad2(lesson.data.order));
    C.setText(t, '[data-ms-code="module-path"]',
      [course && course.data.title, mod && ('Module ' + (mod.data.order || '') + ': ' + mod.data.title)]
        .filter(Boolean).join(' · '));

    var watched = Number((resume.progressRow && resume.progressRow.data.watched_seconds) || 0);
    var total = Number(lesson.data.duration_minutes || 0) * 60;
    C.setText(t, '[data-ms-code="continue-time-remaining"]', formatRemaining(Math.max(0, total - watched)));

    if (mod) {
      var modLessons = data.lessons.filter(function (l) { return C.idOf(l.data.module) === mod.id; });
      var done = modLessons.filter(function (l) {
        return data.progress.some(function (p) {
          return C.idOf(p.data.lesson) === l.id && (p.data.completed | 0) === 1;
        });
      }).length;
      C.setText(t, '[data-ms-code="module-progress-label"]', done + ' / ' + modLessons.length + ' LESSONS');
      var fill = t.querySelector('[data-ms-code="module-progress-fill"]');
      if (fill) fill.style.width = (modLessons.length ? Math.round(done / modLessons.length * 100) : 0) + '%';
    }

    setDetailLinks(t, { lesson: lesson.id, course: course ? course.id : null });
    ui.showTemplate(ctn);
    ui.showListState(ctn, 'ready');
  }

  /** Recency of a progress row — newest of last_watched_at / completed_at. */
  function progressTime(p) {
    var d = p.data || {};
    return new Date(d.last_watched_at || d.completed_at || 0).getTime();
  }

  /** Resolve the course a progress row belongs to (denormalized, or via lesson). */
  function courseIdOfProgress(p, data) {
    var direct = C.idOf(p.data.course);
    if (direct) return direct;
    var lesson = C.byId(data.lessons, C.idOf(p.data.lesson));
    return lesson && C.idOf(lesson.data.course);
  }

  /**
   * The lesson to resume: walk the member's courses newest-activity-first and
   * return the first one that still has an unfinished lesson — the first lesson
   * (module order, then lesson order) without a completed progress row.
   * Returns { lesson, course, module, progressRow } or null.
   */
  function pickResume(data) {
    if (!data.progress.length) return null;

    // Set of lessons with a completed row.
    var completed = Object.create(null);
    data.progress.forEach(function (p) {
      if ((p.data.completed | 0) === 1) completed[C.idOf(p.data.lesson)] = true;
    });

    // Module → order, for course-wide lesson sequencing.
    var modOrder = Object.create(null);
    data.modules.forEach(function (m) { modOrder[m.id] = m.data.order || 0; });

    // Candidate courses, ordered by most recent progress activity.
    var seen = Object.create(null), courseIds = [];
    data.progress.slice()
      .sort(function (a, b) { return progressTime(b) - progressTime(a); })
      .forEach(function (p) {
        var cid = courseIdOfProgress(p, data);
        if (cid && !seen[cid]) { seen[cid] = true; courseIds.push(cid); }
      });

    for (var i = 0; i < courseIds.length; i++) {
      var courseId = courseIds[i];
      var lesson = data.lessons
        .filter(function (l) { return C.idOf(l.data.course) === courseId; })
        .sort(function (a, b) {
          var byMod = (modOrder[C.idOf(a.data.module)] || 0) - (modOrder[C.idOf(b.data.module)] || 0);
          return byMod !== 0 ? byMod : (a.data.order || 0) - (b.data.order || 0);
        })
        .filter(function (l) { return !completed[l.id]; })[0];
      if (!lesson) continue; // course fully complete — try the next one

      return {
        lesson: lesson,
        course: C.byId(data.courses, courseId),
        module: C.byId(data.modules, C.idOf(lesson.data.module)),
        progressRow: data.progress.filter(function (p) {
          return C.idOf(p.data.lesson) === lesson.id;
        })[0] || null
      };
    }
    return null; // every touched course is finished
  }

  function setDetailLinks(root, ids) {
    root.querySelectorAll('[data-ms-code="detail-link"]').forEach(function (a) {
      var page = a.getAttribute('ms-code-detail-page') || '';
      var param = a.getAttribute('ms-code-id-param') || 'id';
      var key = a.getAttribute('data-ms-field') || '';
      var id = key === 'lesson.id' ? ids.lesson
            : key === 'course.id' ? ids.course
            : key === 'id' ? (ids.lesson || ids.course) : null;
      if (id) a.setAttribute('href', page + '?' + param + '=' + id);
    });
  }

  /** The continue card lives in the list-container matching table + where attrs. */
  function findContainer() {
    var nodes = document.querySelectorAll(
      '[data-ms-code="list-container"][ms-code-table="' + CONFIG.CONTINUE_QUERY.table + '"]');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute('ms-code-where') === CONFIG.CONTINUE_QUERY.whereAttr) return nodes[i];
    }
    return null;
  }

  function formatRemaining(sec) {
    if (!sec) return 'Just starting';
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + ('0' + s).slice(-2) + ' remaining';
  }
})();


/* ──────────────────────────────────────────────────────────────────────────
 * 4. DASHBOARD COURSE GRID — variant-pattern course progress cards
 * ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var C = window.DashboardCommon;
  var ui = window.DashboardListSlots;

  var CONFIG = {
    HOURS_FALLBACK: '~6 hours',
    STATUS_VALUES: ['complete', 'in_progress', 'not_started']
  };

  var state = C.makeListState(findContainer);

  document.addEventListener('DOMContentLoaded', boot);

  async function boot() {
    if (!findContainer()) return; // not the dashboard page
    state.showLoading();
    if (!window.$memberstackDom || !window.MSDataCache) { state.showError(); return; }
    var ms = window.$memberstackDom;
    var tableCourse = C.tableAttr('ms-code-table-course', 'courses');
    var tableLesson = C.tableAttr('ms-code-table-lesson', 'lessons');
    var tableModule = C.tableAttr('ms-code-table-module', 'modules');
    var tableProgress = C.tableAttr('ms-code-table-progress', 'lesson_progress');
    try {
      var member = await window.MSDataCache.getMember(ms);
      if (!member) { state.showEmpty(); return; }
      var loaded = await Promise.all([
        window.MSDataCache.load(ms, tableCourse, null),
        window.MSDataCache.load(ms, tableLesson, null),
        window.MSDataCache.load(ms, tableModule, null),
        window.MSDataCache.load(ms, tableProgress, { owner: { equals: member.id } })
      ]);
      paintCourseGrid({ courses: loaded[0], lessons: loaded[1], modules: loaded[2], progress: loaded[3] });
    } catch (err) {
      console.error('[dashboard-courses] boot failed', err);
      state.showError();
    }
  }

  function paintCourseGrid(data) {
    var ctn = findContainer();
    if (!ctn) return;
    var slots = ui.listSlots(ctn);
    if (!data.courses.length) {
      ui.prepareNoData(ctn);
      ui.showListState(ctn, 'list-empty');
      return;
    }
    if (!slots.template) return;

    var rows = data.courses.slice().sort(function (a, b) {
      return (a.data.order || 0) - (b.data.order || 0);
    });
    var per = parseInt(ctn.getAttribute('ms-code-per-page') || '0', 10);
    if (per > 0) rows = rows.slice(0, per);

    ui.clearClones(ctn);
    ui.hideTemplate(ctn);
    rows.forEach(function (course) {
      var card = slots.template.cloneNode(true);
      card.removeAttribute('data-ms-code');
      card.setAttribute('data-ms-clone', 'true');
      card.style.removeProperty('display');
      paintCourseCard(card, course, data);
      slots.template.parentNode.insertBefore(card, slots.template);
    });
    ui.showListState(ctn, 'ready');
  }

  function paintCourseCard(card, course, data) {
    var category = (course.data.category || '').toLowerCase();
    var stats = C.courseStats(course.id, data);
    var status = resolveStatus(stats);
    var pct = stats.total ? Math.round(stats.completed / stats.total * 100) : 0;
    var totalLessons = stats.total || course.data.lesson_count || 0;

    card.setAttribute('data-category', category);
    card.setAttribute('data-status', status);

    C.setText(card, '[data-ms-field="title"]', course.data.title);
    C.setText(card, '[data-ms-field="description"]', course.data.description);
    C.setText(card, '[data-ms-field="category"]', course.data.category);

    toggleVariants(card, 'category', category);
    toggleVariants(card, 'status', status);

    C.setText(card, '[data-ms-code="course-lessons-count"]', String(stats.completed));
    C.setText(card, '[data-ms-code="course-lessons-total"]', String(totalLessons));
    C.setText(card, '[data-ms-code="course-lessons-label"]',
      stats.completed + ' / ' + totalLessons + ' LESSONS');

    var pctEl = card.querySelector('[data-ms-code="course-progress-percent"], [data-ms-code="course-progress-text"]');
    if (pctEl) {
      pctEl.textContent = status === 'not_started'
        ? (course.data.hours_estimate || CONFIG.HOURS_FALLBACK)
        : pct + '%';
    }
    C.setText(card, '[data-ms-code="course-hours"]', course.data.hours_estimate || CONFIG.HOURS_FALLBACK);

    var fill = card.querySelector('[data-ms-code="course-progress-fill"]');
    if (fill) fill.style.width = pct + '%';

    // CTA label — "Get started" if untouched, "Continue" if in-progress,
    // "Re-watch" if complete.
    var ctaLabel = card.querySelector('[data-ms-code="course-cta-label"]');
    if (ctaLabel) {
      ctaLabel.textContent = status === 'complete' ? 'Re-watch'
        : status === 'in_progress' ? 'Continue'
        : 'Get started';
    }

    // Next-pending lesson info — only meaningful for in_progress cards. Tokens:
    //   [data-ms-code="next-lesson-title"]   → "Streaming and response handling"
    //   [data-ms-code="next-lesson-meta"]    → "Module 02 · Lesson 03"
    //   [data-ms-code="remaining-lessons"]   → "7 left"
    paintNextLesson(card, course, data, status, stats);

    setDetailLinks(card, course.id);
  }

  /** Resolve and write the "what's next" labels on an in-progress card. */
  function paintNextLesson(card, course, data, status, stats) {
    var titleEl = card.querySelector('[data-ms-code="next-lesson-title"]');
    var metaEl = card.querySelector('[data-ms-code="next-lesson-meta"]');
    var remainEl = card.querySelector('[data-ms-code="remaining-lessons"]');
    if (!titleEl && !metaEl && !remainEl) return;

    // Hide all three on cards where "next" doesn't apply.
    if (status !== 'in_progress') {
      [titleEl, metaEl, remainEl].forEach(function (el) { if (el) el.style.display = 'none'; });
      return;
    }

    var courseId = course.id;
    var modules = (data.modules || [])
      .filter(function (m) { return C.idOf(m.data.course) === courseId; })
      .sort(function (a, b) { return (a.data.order || 0) - (b.data.order || 0); });
    var modOrder = Object.create(null);
    modules.forEach(function (m) { modOrder[m.id] = m.data.order || 0; });

    var courseLessons = data.lessons
      .filter(function (l) { return C.idOf(l.data.course) === courseId; })
      .sort(function (a, b) {
        var modA = modOrder[C.idOf(a.data.module)] || 0;
        var modB = modOrder[C.idOf(b.data.module)] || 0;
        if (modA !== modB) return modA - modB;
        return (a.data.order || 0) - (b.data.order || 0);
      });

    var completed = Object.create(null);
    data.progress.forEach(function (p) {
      if (C.idOf(p.data.course) === courseId && (p.data.completed | 0) === 1) {
        completed[C.idOf(p.data.lesson)] = true;
      }
    });

    var nextLesson = courseLessons.filter(function (l) { return !completed[l.id]; })[0];
    if (!nextLesson) {
      [titleEl, metaEl, remainEl].forEach(function (el) { if (el) el.style.display = 'none'; });
      return;
    }

    [titleEl, metaEl, remainEl].forEach(function (el) { if (el) el.style.removeProperty('display'); });

    if (titleEl) titleEl.textContent = nextLesson.data.title || '';

    if (metaEl) {
      var mod = modules.find(function (m) { return m.id === C.idOf(nextLesson.data.module); });
      var parts = [];
      if (mod) parts.push('Module ' + C.pad2(mod.data.order));
      parts.push('Lesson ' + C.pad2(nextLesson.data.order));
      metaEl.textContent = parts.join(' · ');
    }

    if (remainEl) {
      var remaining = Math.max(0, (stats.total || 0) - (stats.completed || 0));
      remainEl.textContent = remaining + (remaining === 1 ? ' lesson left' : ' lessons left');
    }
  }

  /** Show only the variant nodes whose data-ms-show-value matches the active value. */
  function toggleVariants(root, attr, activeValue) {
    root.querySelectorAll('[data-ms-show-if="' + attr + '"]').forEach(function (n) {
      var v = n.getAttribute('data-ms-show-value');
      n.style.display = (v === activeValue) ? '' : 'none';
    });
  }

  function setDetailLinks(card, courseId) {
    card.querySelectorAll('[data-ms-code="detail-link"]').forEach(function (a) {
      var page = a.getAttribute('ms-code-detail-page') || '';
      var param = a.getAttribute('ms-code-id-param') || 'id';
      if (!page || !courseId) return;
      a.setAttribute('href', page + '?' + param + '=' + courseId);
    });
  }

  function resolveStatus(stats) {
    if (stats.total > 0 && stats.completed >= stats.total) return 'complete';
    if (stats.completed > 0 || stats.started > 0) return 'in_progress';
    return 'not_started';
  }

  function findContainer() {
    var tableCourse = C.tableAttr('ms-code-table-course', 'courses');
    return document.querySelector(
      '[data-ms-code="list-container"][ms-code-table="' + tableCourse + '"]');
  }
})();


/* ──────────────────────────────────────────────────────────────────────────
 * 5. DASHBOARD ACTIVITY — recent activity feed with synthesized meta + links
 * ────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var C = window.DashboardCommon;
  var ui = window.DashboardListSlots;

  var CONFIG = {
    DEFAULT_PER_PAGE: 5,
    META_FIELD_FALLBACKS: ['meta_text', 'message', 'description'],
    DATE_FIELD_FALLBACKS: ['created_at', 'createdAt', 'timestamp'],

    // Used when `meta_text` is empty on the row. {lesson} is replaced
    // by the joined lesson title; {actor} by activity.actor_name.
    TYPE_LABELS: {
      lesson_complete:  'Completed: {lesson}',
      course_complete:  'Completed a course',
      lesson_saved:     'Saved: {lesson}',
      course_saved:     'Saved a course',
      streak_milestone: 'Reached a new streak'
    },
    DEFAULT_LABEL: 'Activity'
  };

  var state = C.makeListState(findContainer);

  document.addEventListener('DOMContentLoaded', boot);

  async function boot() {
    if (!findContainer()) return; // not the dashboard page
    state.showLoading();
    if (!window.$memberstackDom || !window.MSDataCache) { state.showError(); return; }
    var ms = window.$memberstackDom;
    var tableActivity = C.tableAttr('ms-code-table-activity', 'activity');
    var tableLesson = C.tableAttr('ms-code-table-lesson', 'lessons');
    try {
      var member = await window.MSDataCache.getMember(ms);
      if (!member) { state.showEmpty(); return; }
      var loaded = await Promise.all([
        window.MSDataCache.load(ms, tableActivity, { owner: { equals: member.id } }),
        window.MSDataCache.load(ms, tableLesson, null)
      ]);
      paintActivityList(loaded[0], C.indexById(loaded[1]));
    } catch (err) {
      console.error('[dashboard-activity] boot failed', err);
      state.showError();
    }
  }

  function paintActivityList(rows, lessonsById) {
    var ctn = findContainer();
    if (!ctn) return;
    var slots = ui.listSlots(ctn);

    var sorted = rows.slice().sort(function (a, b) {
      return dateValue(b) - dateValue(a);
    });
    var per = parseInt(ctn.getAttribute('ms-code-per-page') || CONFIG.DEFAULT_PER_PAGE, 10);
    if (per > 0) sorted = sorted.slice(0, per);

    if (!sorted.length) {
      ui.prepareNoData(ctn);
      ui.showListState(ctn, 'list-empty');
      return;
    }
    if (!slots.template) return;

    ui.clearClones(ctn);
    ui.hideTemplate(ctn);
    sorted.forEach(function (row) {
      var node = slots.template.cloneNode(true);
      node.removeAttribute('data-ms-code');
      node.setAttribute('data-ms-clone', 'true');
      node.style.removeProperty('display');
      paintActivityRow(node, row, lessonsById);
      slots.template.parentNode.insertBefore(node, slots.template);
    });
    ui.showListState(ctn, 'ready');
  }

  function paintActivityRow(node, row, lessonsById) {
    var typeVal = row.data && row.data.type;
    if (typeVal) node.setAttribute('data-type', typeVal);
    node.querySelectorAll('[data-ms-show-if="type"]').forEach(function (icon) {
      icon.style.display = icon.getAttribute('data-ms-show-value') === typeVal ? '' : 'none';
    });

    var lessonId = row.data && C.idOf(row.data.lesson);
    var lesson = lessonId ? lessonsById[lessonId] : null;

    var meta = pickField(row, CONFIG.META_FIELD_FALLBACKS) || synthesizeMeta(row, lesson);
    C.setText(node, '[data-ms-field="meta_text"]', meta);
    C.setText(node, '[data-ms-code="activity-meta"]', meta);

    var dateRaw = pickField(row, CONFIG.DATE_FIELD_FALLBACKS);
    if (dateRaw) {
      var d = new Date(dateRaw);
      if (!isNaN(d.getTime())) {
        var rel = relativeTime(d);
        C.setText(node, '[data-ms-field="created_at"]', rel);
        C.setText(node, '[data-ms-code="activity-time"]', rel);
      }
    }

    if (node.tagName === 'A') {
      var href = pickField(row, ['link_url']) || synthesizeHref(typeVal, lesson, node);
      if (href) node.setAttribute('href', href);
    }
  }

  /** Fill {lesson}/{actor} placeholders in the type label when meta_text is absent. */
  function synthesizeMeta(row, lesson) {
    var typeVal = row.data && row.data.type;
    var template = CONFIG.TYPE_LABELS[typeVal] || CONFIG.DEFAULT_LABEL;
    return template
      .replace('{lesson}', (lesson && lesson.data && lesson.data.title) || 'a lesson')
      .replace('{actor}', (row.data && row.data.actor_name) || 'Member');
  }

  /** Build a lesson detail href for lesson-scoped activity types. */
  function synthesizeHref(typeVal, lesson, node) {
    if (!lesson || !lesson.id) return null;
    if (typeVal === 'lesson_complete' || typeVal === 'lesson_saved') {
      var page = node && node.getAttribute('ms-code-detail-page');
      var param = (node && node.getAttribute('ms-code-id-param')) || 'id';
      if (!page) return null;
      return page + '?' + param + '=' + lesson.id;
    }
    return null;
  }

  function dateValue(row) {
    return new Date(pickField(row, CONFIG.DATE_FIELD_FALLBACKS) || 0);
  }

  /** First non-empty value among `fields`, checking record.data then the record top level. */
  function pickField(record, fields) {
    if (!record) return null;
    for (var i = 0; i < fields.length; i++) {
      var key = fields[i];
      var fromData = record.data && record.data[key];
      if (fromData != null && fromData !== '') return fromData;
      var fromTop = record[key];
      if (fromTop != null && fromTop !== '') return fromTop;
    }
    return null;
  }

  function findContainer() {
    var tableActivity = C.tableAttr('ms-code-table-activity', 'activity');
    return document.querySelector(
      '[data-ms-code="list-container"][ms-code-table="' + tableActivity + '"]');
  }

  function relativeTime(d) {
    var s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return 'JUST NOW';
    var m = Math.floor(s / 60); if (m < 60) return m + ' MIN AGO';
    var h = Math.floor(m / 60); if (h < 24) return h + ' HOUR' + (h === 1 ? '' : 'S') + ' AGO';
    var dd = Math.floor(h / 24);
    if (dd === 1) return 'YESTERDAY';
    if (dd < 7) return dd + ' DAYS AGO';
    var w = Math.floor(dd / 7); if (w < 5) return w + ' WEEK' + (w === 1 ? '' : 'S') + ' AGO';
    var mo = Math.floor(dd / 30); if (mo < 12) return mo + ' MONTH' + (mo === 1 ? '' : 'S') + ' AGO';
    return Math.floor(dd / 365) + ' YEAR+ AGO';
  }
})();

</script>
