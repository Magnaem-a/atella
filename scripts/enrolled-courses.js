<!-- 💙 Script v0.1 💙 ENROLLED COURSES PAGE -->
<script>
(function () {
  'use strict';

  var ROOT_SELECTOR = '[data-ms-code="enrolled-courses-page"]';
  var GRID_SELECTOR = '[data-ms-code="course-grid"]';
  var COURSE_TEMPLATE_SELECTOR = '[data-ms-code="course-template"]';
  var FILTER_BAR_SELECTOR = '[data-ms-code="filter-tabs"]';
  var FILTER_TEMPLATE_SELECTOR = '[data-ms-code="filter-tab-template"]';

  document.addEventListener('DOMContentLoaded', function () { boot(); });

  async function boot() {
    if (!window.$memberstackDom) return;
    var root = document.querySelector(ROOT_SELECTOR);
    if (!root) return;
    showListState(root, 'list-loading');

    var tableCourse = attr(root, 'ms-code-table-course', 'courses');
    var tableLesson = attr(root, 'ms-code-table-lesson', 'lessons');
    var tableProgress = attr(root, 'ms-code-table-progress', 'lesson_progress');
    var tableEnrollment = attr(root, 'ms-code-table-enrollment', 'enrollments');

    try {
      var ms = window.$memberstackDom;
      var member = await getMember(ms);
      if (!member || !member.id) {
        showListState(root, 'list-empty');
        return;
      }

      var loaded = await Promise.all([
        loadAll(ms, tableCourse, null),
        loadAll(ms, tableLesson, null),
        loadAll(ms, tableEnrollment, { owner: { equals: member.id } }),
        loadAll(ms, tableProgress, { owner: { equals: member.id } })
      ]);

      var courses = loaded[0] || [];
      var lessons = loaded[1] || [];
      var enrollments = loaded[2] || [];
      var progress = loaded[3] || [];

      var enrolledRows = buildEnrolledRows(courses, lessons, enrollments, progress);

      paintHeaderStats(root, enrolledRows);
      bindFilters(root, enrolledRows);
      paintGrid(root, enrolledRows);
      showListState(root, enrolledRows.length ? 'ready' : 'list-empty');
    } catch (err) {
      console.error('[enrolled-courses] boot failed', err);
      showListState(root, 'list-error');
    }
  }

  function buildEnrolledRows(courses, lessons, enrollments, progress) {
    var progressByCourse = Object.create(null);
    progress.forEach(function (p) {
      var cid = idOf(p.data && p.data.course);
      if (!cid) return;
      if (!progressByCourse[cid]) progressByCourse[cid] = [];
      progressByCourse[cid].push(p);
    });

    var lessonsByCourse = Object.create(null);
    lessons.forEach(function (l) {
      var cid = idOf(l.data && l.data.course);
      if (!cid) return;
      if (!lessonsByCourse[cid]) lessonsByCourse[cid] = [];
      lessonsByCourse[cid].push(l);
    });

    return enrollments
      .filter(function (e) {
        var s = normalize(e.data && e.data.status);
        return s !== 'dropped';
      })
      .map(function (e) {
        var cid = idOf(e.data && e.data.course);
        var course = byId(courses, cid);
        if (!course) return null;

        var courseLessons = lessonsByCourse[cid] || [];
        var courseProgress = progressByCourse[cid] || [];
        var completed = courseProgress.filter(function (p) {
          return Number(p.data && p.data.completed || 0) === 1;
        }).length;
        var total = courseLessons.length;
        var status = deriveStatus(completed, total, courseProgress.length);
        var pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          enrollment: e,
          course: course,
          lessonsTotal: total,
          lessonsCompleted: completed,
          progressPercent: pct,
          status: status
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return Number(a.course.data && a.course.data.order || 0) - Number(b.course.data && b.course.data.order || 0);
      });
  }

  function deriveStatus(completed, total, started) {
    if (total > 0 && completed >= total) return 'complete';
    if (completed > 0 || started > 0) return 'in_progress';
    return 'not_started';
  }

  function paintHeaderStats(root, rows) {
    var totalCourses = rows.length;
    var totalLessons = rows.reduce(function (sum, r) { return sum + r.lessonsTotal; }, 0);
    var totalHours = rows.reduce(function (sum, r) {
      return sum + hoursFromEstimate(r.course.data && r.course.data.hours_estimate);
    }, 0);

    setText(root, '[data-ms-code="courses-count"]', totalCourses);
    setText(root, '[data-ms-code="lessons-count"]', totalLessons);
    setText(root, '[data-ms-code="hours-count"]', '~' + Math.round(totalHours));
  }

  function bindFilters(root, rows) {
    var bar = root.querySelector(FILTER_BAR_SELECTOR);
    if (!bar) return;
    var tpl = bar.querySelector(FILTER_TEMPLATE_SELECTOR);
    if (!tpl) return;

    clearClones(bar);
    tpl.style.display = 'none';

    var buckets = [
      { key: 'all', label: 'All', count: rows.length },
      { key: 'in_progress', label: 'In Progress', count: rows.filter(function (r) { return r.status === 'in_progress'; }).length },
      { key: 'complete', label: 'Completed', count: rows.filter(function (r) { return r.status === 'complete'; }).length }
    ];

    buckets.forEach(function (b, index) {
      var tab = tpl.cloneNode(true);
      tab.removeAttribute('data-ms-code');
      tab.setAttribute('data-ms-clone', 'true');
      tab.style.display = '';
      tab.setAttribute('data-filter', b.key);
      tab.setAttribute('data-filter-active', index === 0 ? 'true' : 'false');
      setText(tab, '[data-ms-code="filter-label"]', b.label);
      setText(tab, '[data-ms-code="filter-count"]', b.count);

      tab.addEventListener('click', function () {
        bar.querySelectorAll('[data-filter-active]').forEach(function (n) {
          n.setAttribute('data-filter-active', n === tab ? 'true' : 'false');
        });
        var filtered = b.key === 'all'
          ? rows
          : rows.filter(function (r) { return r.status === b.key; });
        paintGrid(root, filtered);
        showListState(root, filtered.length ? 'ready' : 'list-empty');
      });

      tpl.parentNode.insertBefore(tab, tpl);
    });
  }

  function paintGrid(root, rows) {
    var grid = root.querySelector(GRID_SELECTOR);
    if (!grid) return;
    var tpl = grid.querySelector(COURSE_TEMPLATE_SELECTOR);
    if (!tpl) return;

    clearClones(grid);
    tpl.style.display = 'none';

    if (!rows.length) return;

    rows.forEach(function (row) {
      var card = tpl.cloneNode(true);
      card.removeAttribute('data-ms-code');
      card.setAttribute('data-ms-clone', 'true');
      card.style.display = '';
      paintCard(card, row);
      tpl.parentNode.insertBefore(card, tpl);
    });
  }

  function paintCard(card, row) {
    var c = row.course.data || {};
    setText(card, '[data-ms-field="course.title"]', c.title);
    setText(card, '[data-ms-field="course.description"]', c.description);
    setText(card, '[data-ms-field="course.category"]', c.category);
    setText(card, '[data-ms-code="course-stats"]', row.lessonsTotal + ' LESSONS · ' + (c.hours_estimate || '~4 HOURS'));
    setText(card, '[data-ms-code="course-progress"]', row.lessonsCompleted + ' / ' + row.lessonsTotal + ' LESSONS');

    var fill = card.querySelector('[data-ms-code="course-progress-fill"]');
    if (fill) fill.style.width = row.progressPercent + '%';

    card.querySelectorAll('[data-ms-show-if="status"]').forEach(function (el) {
      var v = normalizeStatusValue(el.getAttribute('data-ms-show-value'));
      el.style.display = (v === row.status) ? '' : 'none';
      if (v === row.status) setText(el, '[data-ms-code="status-label"]', statusLabel(row.status));
    });

    var bg = card.querySelector('[data-ms-code="course-cover-bg"]');
    if (bg && c.cover_image) bg.style.backgroundImage = 'url("' + c.cover_image + '")';
    var img = card.querySelector('[data-ms-code="course-cover-img"]');
    if (img && img.tagName === 'IMG' && c.cover_image) img.setAttribute('src', c.cover_image);

    card.querySelectorAll('[data-ms-code="detail-link"]').forEach(function (a) {
      var page = a.getAttribute('ms-code-detail-page') || '';
      var param = a.getAttribute('ms-code-id-param') || 'id';
      if (!page) return;
      a.setAttribute('href', page + '?' + param + '=' + row.course.id);
    });
  }

  async function getMember(ms) {
    if (window.MSDataCache && typeof window.MSDataCache.getMember === 'function') {
      return window.MSDataCache.getMember(ms);
    }
    var result = await ms.getCurrentMember();
    return result && result.data ? result.data : null;
  }

  async function loadAll(ms, table, where) {
    if (window.MSDataCache && typeof window.MSDataCache.load === 'function') {
      return window.MSDataCache.load(ms, table, where || null);
    }
    return loadAllRaw(ms, table, where);
  }

  async function loadAllRaw(ms, table, where) {
    var all = [];
    var offset = 0;
    var limit = 100;
    var pageCount = 0;
    while (pageCount < 50) {
      var res = await ms.getData({
        dataTableId: table,
        where: where || undefined,
        limit: limit,
        offset: offset
      });
      var rows = res && res.data ? res.data : [];
      all = all.concat(rows);
      if (rows.length < limit) break;
      offset += limit;
      pageCount++;
    }
    return all;
  }

  function showListState(root, stateKey) {
    var loading = root.querySelector('[data-ms-code="list-loading"]');
    var empty = root.querySelector('[data-ms-code="list-empty"]');
    var error = root.querySelector('[data-ms-code="list-error"]');
    var showLoading = stateKey === 'list-loading';
    var showEmpty = stateKey === 'list-empty';
    var showError = stateKey === 'list-error';
    if (loading) loading.style.display = showLoading ? '' : 'none';
    if (empty) empty.style.display = showEmpty ? '' : 'none';
    if (error) error.style.display = showError ? '' : 'none';
  }

  function clearClones(root) {
    root.querySelectorAll('[data-ms-clone="true"]').forEach(function (n) {
      n.parentNode.removeChild(n);
    });
  }


  function attr(el, name, fallback) { return el.getAttribute(name) || fallback; }
  function idOf(ref) { return ref && (ref.id || ref) || null; }
  function byId(rows, id) { for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i]; return null; }
  function normalize(v) { return String(v || '').trim().toLowerCase(); }
  function normalizeStatusValue(v) {
    var key = normalize(v).replace(/[\s-]+/g, '_');
    if (key === 'completed') return 'complete';
    return key;
  }
  function statusLabel(status) {
    if (status === 'complete') return 'Completed';
    if (status === 'in_progress') return 'In progress';
    return 'Not started';
  }
  function setText(root, sel, v) {
    if (v == null || v === '') return;
    var el = root.querySelector(sel);
    if (el) el.textContent = String(v);
  }

  function hoursFromEstimate(value) {
    if (value == null) return 0;
    var s = String(value);
    var match = s.match(/(\d+(\.\d+)?)/);
    return match ? Number(match[1]) : 0;
  }
})();
</script>
