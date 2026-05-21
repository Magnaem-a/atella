<!-- 💙 Script v0.1 💙 MODULE DETAIL PAGE -->
<script>
(function () {
  'use strict';

  var LABEL = '[module-detail]';

  document.addEventListener('DOMContentLoaded', function () { boot(); });

  async function boot() {
    var root = document.querySelector('[data-ms-code="module-page"]');
    if (!root) return;

    if (!window.$memberstackDom || !window.MSDataCache) {
      console.warn(LABEL + ' missing $memberstackDom or MSDataCache');
      return;
    }

    var ms = window.$memberstackDom;
    var TABLES = tableConfig(root);
    var idParam = root.getAttribute('ms-code-id-param') || 'id';
    var slugParam = root.getAttribute('ms-code-slug-param') || 'slug';
    var moduleId = getUrlParam(idParam);
    var moduleSlug = getUrlParam(slugParam);

    if (!moduleId && !moduleSlug) {
      console.warn(LABEL + ' no ?' + idParam + ' or ?' + slugParam + ' in URL');
      return;
    }

    try {
      var member = await window.MSDataCache.getMember(ms);
      var memberId = member ? member.id : null;
      var ownerWhere = memberId ? { owner: { equals: memberId } } : null;

      var loaded = await Promise.all([
        window.MSDataCache.load(ms, TABLES.course, null),
        window.MSDataCache.load(ms, TABLES.module, null),
        window.MSDataCache.load(ms, TABLES.lesson, null),
        ownerWhere ? window.MSDataCache.load(ms, TABLES.progress, ownerWhere) : Promise.resolve([])
      ]);

      var data = {
        courses: loaded[0],
        modules: loaded[1],
        lessons: loaded[2],
        progress: loaded[3]
      };

      var mod = findModule(data.modules, moduleId, moduleSlug);
      if (!mod) {
        console.warn(LABEL + ' module not found for id="' + moduleId + '" slug="' + moduleSlug + '"');
        return;
      }

      render(root, mod, data);
    } catch (err) {
      console.error(LABEL + ' boot failed', err);
    }
  }

  function render(root, mod, data) {
    var moduleId = moduleRecordId(mod);
    var courseId = idOf(mod.data.course);
    var course = data.courses.find(function (c) { return c.id === courseId; }) || null;

    var courseModules = data.modules
      .filter(function (m) { return idOf(m.data.course) === courseId; })
      .sort(byOrder);
    var moduleIndex = courseModules.findIndex(function (m) { return moduleRecordId(m) === moduleId; });

    var lessons = data.lessons
      .filter(function (l) { return idOf(l.data.module) === moduleId; })
      .sort(byOrder);
    var progress = data.progress.filter(function (p) { return idOf(p.data.course) === courseId; });

    paintHeader(root, mod, course, courseModules, moduleIndex, lessons, progress);
    paintBreadcrumbs(root, course, mod);
    paintLessonList(root, lessons, progress);
    paintPagination(root, courseModules, moduleIndex);
  }

  function paintHeader(root, mod, course, courseModules, moduleIndex, lessons, progress) {
    var completed = lessons.filter(function (l) { return isLessonDone(l.id, progress); }).length;
    var total = lessons.length || (mod.data.lesson_count || 0);
    var hours = estimateHours(lessons);
    var pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    fillField(root, 'module.title', mod.data.title);
    fillField(root, 'module.description', mod.data.description || '');
    fillField(root, 'module.order', mod.data.order);
    fillField(root, 'module.lesson_count', total);

    setLabel(root, 'module-meta',
      'Module ' + pad2(moduleIndex + 1) + ' of ' + pad2(courseModules.length)
      + ' · ' + total + ' Lessons · ' + hours);
    setLabel(root, 'progress-label', completed + ' / ' + total + ' Lessons');

    var fill = queryToken(root, 'progress-fill');
    if (fill) fill.style.width = pct + '%';

    if (course) {
      fillField(root, 'course.title', course.data.title);
    }
  }

  function paintBreadcrumbs(root, course, mod) {
    var learnLink = queryToken(root, 'crumb-learn');
    var courseLink = queryToken(root, 'crumb-course');
    var moduleLink = queryToken(root, 'crumb-module');

    if (learnLink && !learnLink.getAttribute('href')) {
      console.warn(LABEL + ' crumb-learn has no href; set it in markup');
    }
    if (courseLink && course) setDetailLink(courseLink, course.id);
    if (moduleLink) setDetailLink(moduleLink, mod.id);
  }

  function paintLessonList(root, lessons, progress) {
    var list = root.querySelector('[data-ms-code="lesson-list"]');
    var tpl = list ? list.querySelector('[data-ms-code="lesson-template"]') : null;
    if (!tpl) return;

    clearClones(list);
    tpl.style.display = 'none';

    // Strict drip: the first incomplete lesson is the only unlocked
    // incomplete lesson ("active"). Any incomplete lesson after that is locked.
    var unlockedIndex = firstIncompleteIndex(lessons, progress);

    lessons.forEach(function (lesson, idx) {
      var row = tpl.cloneNode(true);
      row.removeAttribute('data-ms-code');
      row.setAttribute('data-ms-clone', 'true');
      row.style.display = '';

      var done = isLessonDone(lesson.id, progress);
      var current = !done && idx === unlockedIndex;
      var locked = !done && unlockedIndex !== -1 && idx > unlockedIndex;

      fillField(row, 'lesson.title', lesson.data.title);
      fillField(row, 'lesson.order', lesson.data.order);
      fillField(row, 'lesson.duration_minutes', lesson.data.duration_minutes || 0);

      setLabel(row, 'lesson-order-label', 'Lesson ' + pad2(lesson.data.order || (idx + 1)));
      setLabel(row, 'lesson-duration-label', String(lesson.data.duration_minutes || 0) + ' min');

      var status = done ? 'done' : (current ? 'active' : (locked ? 'locked' : 'todo'));
      // Expose status as a data attribute so the whole row can be styled in
      // Webflow with `.lesson_item[data-status="active"]`.
      row.setAttribute('data-status', status);
      toggleVariants(row, 'status', status);
      toggleVariants(row, 'action', done ? 'replay' : (current ? 'continue' : (locked ? 'locked' : 'start')));

      if (locked) {
        row.removeAttribute('href');
        row.setAttribute('aria-disabled', 'true');
      } else {
        setDetailLink(row, lesson.id);
      }

      tpl.parentNode.insertBefore(row, tpl);
    });
  }

  function paintPagination(root, courseModules, moduleIndex) {
    // Guard against unexpected index misses (e.g. mixed id shapes).
    // If this happens, we keep pagination in empty state rather than
    // linking to an incorrect module.
    if (moduleIndex < 0 || moduleIndex >= courseModules.length) {
      console.warn(LABEL + ' pagination: moduleIndex out of range', {
        moduleIndex: moduleIndex, total: courseModules.length
      });
      moduleIndex = -1;
    }

    var current = moduleIndex >= 0 ? courseModules[moduleIndex] : null;
    var prev = moduleIndex > 0 ? courseModules[moduleIndex - 1] : null;
    var next = moduleIndex >= 0 && moduleIndex < courseModules.length - 1 ? courseModules[moduleIndex + 1] : null;

    var prevCard = queryToken(root, 'prev-module');
    var nextCard = queryToken(root, 'next-module');

    if (prevCard) {
      if (!prev) {
        toggleVariants(prevCard, 'state', 'empty');
        prevCard.removeAttribute('href');
        // Optional fallback copy for first module pages.
        if (current) {
          fillField(prevCard, 'module.title', current.data.title);
          fillField(prevCard, 'module.lesson_count', current.data.lesson_count || 0);
          setLabel(prevCard, 'prev-label', 'Current Module');
        }
      } else {
        toggleVariants(prevCard, 'state', 'ready');
        fillField(prevCard, 'module.title', prev.data.title);
        fillField(prevCard, 'module.lesson_count', prev.data.lesson_count || 0);
        setLabel(prevCard, 'prev-label', '← Previous Module');
        setDetailLink(prevCard, moduleRecordId(prev));
      }
    }

    if (nextCard) {
      if (!next) {
        toggleVariants(nextCard, 'state', 'empty');
        nextCard.removeAttribute('href');
        // Optional fallback copy for last module pages.
        if (current) {
          fillField(nextCard, 'module.title', current.data.title);
          fillField(nextCard, 'module.lesson_count', current.data.lesson_count || 0);
          setLabel(nextCard, 'next-label', 'Current Module');
        }
      } else {
        toggleVariants(nextCard, 'state', 'ready');
        fillField(nextCard, 'module.title', next.data.title);
        fillField(nextCard, 'module.lesson_count', next.data.lesson_count || 0);
        setLabel(nextCard, 'next-label', 'Next Module →');
        setDetailLink(nextCard, moduleRecordId(next));
      }
    }
  }

  function findModule(modules, id, slug) {
    if (id) {
      var byId = modules.find(function (m) { return moduleRecordId(m) === id; });
      if (byId) return byId;
    }
    if (slug) {
      var bySlug = modules.find(function (m) { return (m.data && m.data.slug) === slug; });
      if (bySlug) return bySlug;
    }
    return null;
  }

  function isLessonDone(lessonId, progress) {
    var rec = progress.find(function (p) { return idOf(p.data.lesson) === lessonId; });
    return !!(rec && (rec.data.completed | 0) === 1);
  }

  function firstIncompleteIndex(lessons, progress) {
    for (var i = 0; i < lessons.length; i++) {
      if (!isLessonDone(lessons[i].id, progress)) return i;
    }
    return -1;
  }

  function estimateHours(lessons) {
    var mins = lessons.reduce(function (sum, l) { return sum + (parseInt(l.data.duration_minutes || 0, 10) || 0); }, 0);
    if (!mins) return '~0 hrs';
    var hrs = mins / 60;
    var rounded = Math.round(hrs * 10) / 10;
    return '~' + rounded + ' hrs';
  }

  function fillField(scope, key, value) {
    if (value == null || value === '') return;
    scope.querySelectorAll('[data-ms-field="' + key + '"]').forEach(function (el) {
      var flag = el.getAttribute('data-ms-code');
      if (flag === 'pad') el.textContent = pad2(value);
      else el.textContent = value;
    });
  }

  function setLabel(scope, key, value) {
    if (value == null) return;
    queryTokenAll(scope, key).forEach(function (el) { el.textContent = value; });
  }

  function toggleVariants(scope, attr, activeValue) {
    scope.querySelectorAll('[data-ms-show-if="' + attr + '"]').forEach(function (n) {
      n.style.display = (n.getAttribute('data-ms-show-value') === String(activeValue)) ? '' : 'none';
    });
  }

  function setDetailLink(el, recordId) {
    if (!el || !recordId) return;
    var page = el.getAttribute('ms-code-detail-page');
    if (!page) return;
    var param = el.getAttribute('ms-code-id-param') || 'id';
    el.setAttribute('href', page + '?' + param + '=' + recordId);
  }

  function clearClones(scope) {
    scope.querySelectorAll('[data-ms-clone="true"]').forEach(function (n) { n.parentNode.removeChild(n); });
  }


  // Table config must be attribute-driven on the page wrapper.
  // Defaults keep backward compatibility.
  function tableConfig(root) {
    return {
      course: root.getAttribute('ms-code-table-course') || 'courses',
      module: root.getAttribute('ms-code-table-module') || 'modules',
      lesson: root.getAttribute('ms-code-table-lesson') || 'lessons',
      progress: root.getAttribute('ms-code-table-progress') || 'lesson_progress'
    };
  }

  // Token selectors (MS-only).
  function tokenSelector(token) {
    return '[data-ms-code="' + token + '"]';
  }

  function queryToken(scope, token) {
    return scope ? scope.querySelector(tokenSelector(token)) : null;
  }

  function queryTokenAll(scope, token) {
    return scope ? Array.prototype.slice.call(scope.querySelectorAll(tokenSelector(token))) : [];
  }

  function getUrlParam(name) {
    try { return new URL(window.location.href).searchParams.get(name); } catch (e) { return null; }
  }

  function idOf(ref) {
    if (!ref) return null;
    if (typeof ref === 'string') return ref;
    if (Array.isArray(ref)) return idOf(ref[0]);
    if (typeof ref === 'object') return ref.id || ref._id || null;
    return null;
  }

  function moduleRecordId(mod) {
    if (!mod) return null;
    return mod.id || mod._id || mod.recordId || null;
  }

  function byOrder(a, b) { return (a.data.order || 0) - (b.data.order || 0); }

  function pad2(n) {
    var x = parseInt(n, 10);
    if (isNaN(x)) return String(n == null ? '' : n);
    return x < 10 ? '0' + x : String(x);
  }
})();
</script>
