<!-- 💙 Script v0.1 💙 MEMBER SHELL ALL COURSES PAGE -->
<script>
(function () {
  'use strict';

  var ROOT_SELECTOR = '[data-ms-code="member-all-courses-page"]';
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

    var tableCourse = tableAttr(root, 'ms-code-table-course', 'courses');
    var tableModule = tableAttr(root, 'ms-code-table-module', 'modules');
    var tableLesson = tableAttr(root, 'ms-code-table-lesson', 'lessons');
    var tableProgress = tableAttr(root, 'ms-code-table-progress', 'lesson_progress');

    try {
      var ms = window.$memberstackDom;
      var member = await getMember(ms);
      var loaded = await Promise.all([
        loadAll(ms, tableCourse, null),
        loadAll(ms, tableModule, null),
        loadAll(ms, tableLesson, null),
        member && member.id ? loadAll(ms, tableProgress, { owner: { equals: member.id } }) : Promise.resolve([])
      ]);

      var courses = (loaded[0] || []).slice().sort(byOrderAsc);
      var modules = loaded[1] || [];
      var lessons = loaded[2] || [];
      var progress = loaded[3] || [];

      paintStats(root, courses, modules, lessons);
      bindFilters(root, courses, modules, lessons, progress);
      paintCourses(root, courses, modules, lessons, progress);
      showListState(root, courses.length ? 'ready' : 'list-empty');
    } catch (err) {
      console.error('[member-all-courses] boot failed', err);
      showListState(root, 'list-error');
    }
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
      var response = await ms.getData({
        dataTableId: table,
        where: where || undefined,
        limit: limit,
        offset: offset
      });
      var rows = response && response.data ? response.data : [];
      all = all.concat(rows);
      if (rows.length < limit) break;
      offset += limit;
      pageCount++;
    }
    return all;
  }

  function paintStats(root, courses, modules, lessons) {
    setText(root, '[data-ms-code="courses-count"]', courses.length);
    setText(root, '[data-ms-code="modules-count"]', modules.length);
    setText(root, '[data-ms-code="lessons-count"]', lessons.length);
  }

  function bindFilters(root, courses, modules, lessons, progress) {
    var bar = root.querySelector(FILTER_BAR_SELECTOR);
    if (!bar) return;
    var template = bar.querySelector(FILTER_TEMPLATE_SELECTOR);
    if (!template) return;

    clearClones(bar);
    template.style.display = 'none';

    var groups = buildCategoryGroups(courses);
    groups.forEach(function (g, index) {
      var tab = template.cloneNode(true);
      tab.removeAttribute('data-ms-code');
      tab.setAttribute('data-ms-clone', 'true');
      tab.style.display = '';
      tab.setAttribute('data-filter', g.key);
      tab.setAttribute('data-filter-active', index === 0 ? 'true' : 'false');

      setText(tab, '[data-ms-code="filter-label"]', g.label);
      setText(tab, '[data-ms-code="filter-count"]', g.count);

      tab.addEventListener('click', function () {
        bar.querySelectorAll('[data-filter-active]').forEach(function (el) {
          el.setAttribute('data-filter-active', el === tab ? 'true' : 'false');
        });
        var rows = g.key === 'all'
          ? courses
          : courses.filter(function (c) {
              return normalize(c.data && c.data.category) === g.key;
            });
        paintCourses(root, rows, modules, lessons, progress);
      });

      template.parentNode.insertBefore(tab, template);
    });
  }

  function buildCategoryGroups(courses) {
    var byKey = Object.create(null);
    courses.forEach(function (c) {
      var category = String((c.data && c.data.category) || 'Uncategorized').trim();
      var key = normalize(category);
      if (!byKey[key]) byKey[key] = { key: key, label: category, count: 0 };
      byKey[key].count += 1;
    });

    var groups = [{ key: 'all', label: 'All', count: courses.length }];
    Object.keys(byKey).sort().forEach(function (k) { groups.push(byKey[k]); });
    return groups;
  }

  function paintCourses(root, courses, modules, lessons, progress) {
    var grid = root.querySelector(GRID_SELECTOR);
    if (!grid) return;
    var template = grid.querySelector(COURSE_TEMPLATE_SELECTOR);
    if (!template) return;

    clearClones(grid);
    template.style.display = 'none';

    courses.forEach(function (course) {
      var card = template.cloneNode(true);
      card.removeAttribute('data-ms-code');
      card.setAttribute('data-ms-clone', 'true');
      card.style.display = '';
      paintCourseCard(card, course, modules, lessons, progress);
      template.parentNode.insertBefore(card, template);
    });
  }

  function paintCourseCard(card, course, modules, lessons, progress) {
    var c = course.data || {};
    var courseId = course.id;
    var modulesInCourse = modules.filter(function (m) { return idOf(m.data && m.data.course) === courseId; });
    var lessonsInCourse = lessons.filter(function (l) { return idOf(l.data && l.data.course) === courseId; });
    var progressInCourse = (progress || []).filter(function (p) { return idOf(p.data && p.data.course) === courseId; });

    setText(card, '[data-ms-field="course.title"]', c.title);
    setText(card, '[data-ms-field="course.description"]', c.description);
    setText(card, '[data-ms-field="course.category"]', c.category);
    setText(card, '[data-ms-code="course-stats"]', lessonsInCourse.length + ' LESSONS · ' + (c.hours_estimate || '~4 HOURS'));
    setText(card, '[data-ms-code="course-modules-lessons"]', modulesInCourse.length + ' MODULES · ' + lessonsInCourse.length + ' LESSONS');

    var order = c.order == null ? '--' : ('0' + c.order).slice(-2);
    setText(card, '[data-ms-code="course-order"]', 'COURSE ' + order);
    var status = resolveCardStatus(c, lessonsInCourse.length, progressInCourse);
    toggleVariants(card, 'status', status);
    setActiveStatusLabel(card, status);

    var bg = card.querySelector('[data-ms-code="course-cover-bg"]');
    if (bg && c.cover_image) bg.style.backgroundImage = 'url("' + c.cover_image + '")';
    var img = card.querySelector('[data-ms-code="course-cover-img"]');
    if (img && img.tagName === 'IMG' && c.cover_image) img.setAttribute('src', c.cover_image);

    card.querySelectorAll('[data-ms-code="detail-link"]').forEach(function (a) {
      var page = a.getAttribute('ms-code-detail-page') || '';
      var param = a.getAttribute('ms-code-id-param') || 'id';
      if (page && courseId) a.setAttribute('href', page + '?' + param + '=' + courseId);
    });
  }

  function resolveCardStatus(courseData, lessonsTotal, progressRows) {
    if (progressRows && progressRows.length) {
      var completed = progressRows.filter(function (p) {
        return Number(p.data && p.data.completed || 0) === 1;
      }).length;
      if (lessonsTotal > 0 && completed >= lessonsTotal) return 'complete';
      // Any progress row for this course (opened or completed) counts as started.
      return 'in_progress';
    }

    var raw = normalize(courseData && (
      courseData.status ||
      courseData.course_status ||
      courseData.progress_status ||
      courseData.enrollment_status ||
      courseData.state
    ));

    var rawKey = raw.replace(/[\s-]+/g, '_');
    if (rawKey === 'complete' || rawKey === 'completed' || rawKey === 'done' || rawKey === 'finished') return 'complete';
    if (rawKey === 'in_progress' || rawKey === 'active' || rawKey === 'started') return 'in_progress';
    if (rawKey === 'not_started' || rawKey === 'new' || rawKey === 'todo') return 'not_started';

    var percent = numberFrom(courseData && (
      courseData.progress_percent ||
      courseData.completion_percent ||
      courseData.percent_complete
    ));
    if (percent >= 100) return 'complete';
    if (percent > 0) return 'in_progress';

    var completedLessons = numberFrom(courseData && (
      courseData.completed_lessons ||
      courseData.lessons_completed
    ));
    if (lessonsTotal > 0 && completedLessons >= lessonsTotal) return 'complete';
    if (completedLessons > 0) return 'in_progress';

    return 'not_started';
  }

  function toggleVariants(root, attr, activeValue) {
    root.querySelectorAll('[data-ms-show-if="' + attr + '"]').forEach(function (el) {
      var v = normalize(el.getAttribute('data-ms-show-value')).replace(/[\s-]+/g, '_');
      el.style.display = (v === activeValue) ? '' : 'none';
    });
  }

  function setActiveStatusLabel(card, status) {
    var active = card.querySelector('[data-ms-show-if="status"][data-ms-show-value="' + status + '"]');
    if (!active) return;
    setText(active, '[data-ms-code="status-label"]', statusLabel(status));
  }

  function tableAttr(root, name, fallback) {
    return root.getAttribute(name) || fallback;
  }

  async function getMember(ms) {
    if (window.MSDataCache && typeof window.MSDataCache.getMember === 'function') {
      return window.MSDataCache.getMember(ms);
    }
    var res = await ms.getCurrentMember();
    return res && res.data ? res.data : null;
  }

  function setText(root, sel, text) {
    if (text == null || text === '') return;
    var el = root.querySelector(sel);
    if (el) el.textContent = String(text);
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


  function normalize(s) { return String(s || '').trim().toLowerCase(); }
  function statusLabel(status) {
    if (status === 'complete') return 'Completed';
    if (status === 'in_progress') return 'In progress';
    return 'Not started';
  }
  function numberFrom(v) {
    if (v == null || v === '') return 0;
    var n = Number(v);
    return isNaN(n) ? 0 : n;
  }
  function idOf(ref) { return ref && (ref.id || ref) || null; }
  function byOrderAsc(a, b) {
    return Number(a && a.data && a.data.order || 0) - Number(b && b.data && b.data.order || 0);
  }
})();
</script>
