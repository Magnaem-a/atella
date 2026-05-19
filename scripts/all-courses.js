<!-- 💙 Script v0.1 💙 PUBLIC ALL COURSES PAGE -->
<script>
  (function () {
  'use strict';

  var ROOT_SELECTOR = '[data-ms-code="all-courses-page"]';
  var STACK_SELECTOR = '[data-ms-code="course-stack"]';
  var COURSE_TEMPLATE_SELECTOR = '[data-ms-code="course-template"]';
  var MODULE_TEMPLATE_SELECTOR = '[data-ms-code="module-template"]';
  var MODULE_PREVIEW_LIMIT = 2;

  document.addEventListener('DOMContentLoaded', function () { boot(); });

  async function boot() {
    if (!window.$memberstackDom) return;

    var root = document.querySelector(ROOT_SELECTOR);
    if (!root) return;
    showListState(root, 'list-loading');

    var tableCourse = tableAttr(root, 'ms-code-table-course', 'courses');
    var tableModule = tableAttr(root, 'ms-code-table-module', 'modules');
    var tableLesson = tableAttr(root, 'ms-code-table-lesson', 'lessons');

    try {
      var ms = window.$memberstackDom;
      var loaded = await Promise.all([
        loadAll(ms, tableCourse, null),
        loadAll(ms, tableModule, null),
        loadAll(ms, tableLesson, null)
      ]);

      var courses = (loaded[0] || []).slice().sort(byOrderAsc);
      var modules = loaded[1] || [];
      var lessons = loaded[2] || [];

      paintGlobalStats(root, courses, modules, lessons);
      paintCourseStack(root, courses, modules, lessons);
    } catch (err) {
      console.error('[all-courses] boot failed', err);
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

  function paintGlobalStats(root, courses, modules, lessons) {
    setText(root, '[data-ms-code="courses-count"]', String(courses.length));
    setText(root, '[data-ms-code="modules-count"]', String(modules.length));
    setText(root, '[data-ms-code="lessons-count"]', String(lessons.length));
  }

  function paintCourseStack(root, courses, modules, lessons) {
    var stack = root.querySelector(STACK_SELECTOR);
    if (!stack) return;

    var tpl = stack.querySelector(COURSE_TEMPLATE_SELECTOR);
    if (!tpl) return;

    clearClones(stack);
    tpl.style.display = 'none';

    if (!courses.length) {
      showListState(root, 'list-empty');
      return;
    }

    courses.forEach(function (course) {
      var card = tpl.cloneNode(true);
      card.removeAttribute('data-ms-code');
      card.setAttribute('data-ms-clone', 'true');
      card.style.display = '';

      paintCourseCard(card, course, modules, lessons);
      tpl.parentNode.insertBefore(card, tpl);
    });

    showListState(root, 'ready');
  }

  function paintCourseCard(card, course, modules, lessons) {
    var courseId = course && course.id;
    var courseData = (course && course.data) || {};

    var modulesInCourse = modules
      .filter(function (m) { return idOf(m.data && m.data.course) === courseId; })
      .sort(byOrderAsc);

    var lessonsInCourse = lessons.filter(function (l) {
      return idOf(l.data && l.data.course) === courseId;
    });

    setText(card, '[data-ms-field="course.title"]', courseData.title);
    setText(card, '[data-ms-field="course.description"]', courseData.description);
    setText(card, '[data-ms-field="course.category"]', courseData.category);
    setText(card, '[data-ms-code="course-order"]', 'COURSE ' + pad2(courseData.order));
    setText(card, '[data-ms-code="course-stats"]', modulesInCourse.length + ' MODULES · ' + lessonsInCourse.length + ' LESSONS');

    paintCourseCover(card, courseData.cover_image);
    paintCourseLinks(card, courseId);
    paintModulePreview(card, modulesInCourse, lessons);
  }

  function paintCourseCover(card, imageUrl) {
    if (!imageUrl) return;
    var bg = card.querySelector('[data-ms-code="course-cover-bg"]');
    if (bg) bg.style.backgroundImage = 'url("' + imageUrl + '")';
    var img = card.querySelector('[data-ms-code="course-cover-img"]');
    if (img && img.tagName === 'IMG') img.setAttribute('src', imageUrl);
  }

  function paintCourseLinks(card, courseId) {
    if (!courseId) return;
    card.querySelectorAll('[data-ms-code="detail-link"]').forEach(function (a) {
      var page = a.getAttribute('ms-code-detail-page') || '';
      var param = a.getAttribute('ms-code-id-param') || 'id';
      if (!page) return;
      a.setAttribute('href', page + '?' + param + '=' + courseId);
    });
  }

  function paintModulePreview(card, modulesInCourse, allLessons) {
    var list = card.querySelector('[data-ms-code="module-list"]');
    if (!list) return;

    var tpl = list.querySelector(MODULE_TEMPLATE_SELECTOR);
    if (!tpl) return;

    clearClones(list);
    tpl.style.display = 'none';

    modulesInCourse.slice(0, MODULE_PREVIEW_LIMIT).forEach(function (mod) {
      var row = tpl.cloneNode(true);
      row.removeAttribute('data-ms-code');
      row.setAttribute('data-ms-clone', 'true');
      row.style.display = '';

      var modData = mod.data || {};
      var modLessons = allLessons.filter(function (l) {
        return idOf(l.data && l.data.module) === mod.id;
      });

      setText(row, '[data-ms-field="module.title"]', modData.title);
      setText(row, '[data-ms-field="module.description"]', modData.description);
      setText(row, '[data-ms-code="module-stats"]', 'MODULE ' + pad2(modData.order) + ' · ' + modLessons.length + ' LESSONS');

      list.insertBefore(row, tpl);
    });
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


  function tableAttr(root, name, fallback) {
    return root.getAttribute(name) || fallback;
  }

  function setText(root, selector, value) {
    if (value == null || value === '') return;
    var el = root.querySelector(selector);
    if (el) el.textContent = String(value);
  }

  function idOf(ref) { return ref && (ref.id || ref) || null; }

  function byOrderAsc(a, b) {
    var ao = Number(a && a.data && a.data.order || 0);
    var bo = Number(b && b.data && b.data.order || 0);
    return ao - bo;
  }

  function pad2(n) {
    if (n == null || n === '') return '--';
    return ('0' + n).slice(-2);
  }
})();

</script>