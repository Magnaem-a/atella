<!-- 💙 Script v0.2 NEW 💙 COURSE DETAIL PAGE -->
<script>
(function () {
  'use strict';

  var LABEL = '[course-detail]';
  var DEBUG = /[?&]debug\b/.test(window.location.search);
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var FEATURES = {
    // Data sections (table-backed)
    INSTRUCTOR: true,
    OUTCOMES: true,
    FIRST_LESSON: true,
    // Writes
    ENROLLMENT_WRITES: true
  };
  var TABLES = null;

  // Entry point: wait for DOM, then fetch + paint everything.
  document.addEventListener('DOMContentLoaded', function () { boot(); });

  async function boot() {
    // Root scope for all selectors so this script stays page-local.
    var root = document.querySelector('[data-ms-code="course-page"]');
    if (!root) return;

    showStateAll(root, 'list-loading');

    if (!window.$memberstackDom || !window.MSDataCache) {
      console.warn(LABEL + ' missing $memberstackDom or MSDataCache');
      showStateAll(root, 'list-error');
      return;
    }

    var ms = window.$memberstackDom;
    TABLES = tableConfig(root);
    var idParam = root.getAttribute('ms-code-id-param') || 'id';
    var slugParam = root.getAttribute('ms-code-slug-param') || 'slug';
    var courseId = getUrlParam(idParam);
    var courseSlug = getUrlParam(slugParam);

    if (!courseId && !courseSlug) {
      console.warn(LABEL + ' no ?' + idParam + ' or ?' + slugParam + ' in URL');
      showStateAll(root, 'list-error');
      return;
    }

    try {
      // Pull member once, then scope owner-only tables to this member.
      var member = await window.MSDataCache.getMember(ms);
      var memberId = member ? member.id : null;
      var ownerWhere = memberId ? { owner: { equals: memberId } } : null;

      var loaded = await Promise.all([
        window.MSDataCache.load(ms, TABLES.course, null),
        window.MSDataCache.load(ms, TABLES.module, null),
        window.MSDataCache.load(ms, TABLES.lesson, null),
        FEATURES.INSTRUCTOR ? window.MSDataCache.load(ms, TABLES.instructor, null) : Promise.resolve([]),
        FEATURES.OUTCOMES ? window.MSDataCache.load(ms, TABLES.outcome, null) : Promise.resolve([]),
        ownerWhere ? window.MSDataCache.load(ms, TABLES.progress, ownerWhere) : Promise.resolve([]),
        ownerWhere ? window.MSDataCache.load(ms, TABLES.enrollment, ownerWhere)     : Promise.resolve([]),
        ownerWhere ? window.MSDataCache.load(ms, TABLES.savedCourses, ownerWhere)   : Promise.resolve([])
      ]);

      var data = {
        courses: loaded[0], modules: loaded[1], lessons: loaded[2],
        instructors: loaded[3], outcomes: loaded[4],
        progress: loaded[5], enrollments: loaded[6], savedCourses: loaded[7]
      };

      if (DEBUG) console.log(LABEL + ' loaded', {
        courses: data.courses.length, modules: data.modules.length,
        lessons: data.lessons.length, instructors: data.instructors.length,
        outcomes: data.outcomes.length,
        progress: data.progress.length, enrollments: data.enrollments.length,
        saved_courses: data.savedCourses.length
      });

      var course = findCourse(data.courses, courseId, courseSlug);
      if (!course) {
        console.warn(LABEL + ' course not found for id="' + courseId + '" slug="' + courseSlug + '"');
        showStateAll(root, 'list-empty');
        return;
      }

      render(root, course, data, ms);
    } catch (err) {
      console.error(LABEL + ' boot failed', err);
      showStateAll(root, 'list-error');
    }
  }

  function render(root, course, data, ms) {
    var courseId = course.id;
    // Shape data into course-local slices once; painters stay dumb/simple.
    var modules = data.modules.filter(function (m) { return idOf(m.data.course) === courseId; }).sort(byOrder);
    var lessons = data.lessons.filter(function (l) { return idOf(l.data.course) === courseId; }).sort(byModuleThenOrder(modules));
    var progress = data.progress.filter(function (p) { return idOf(p.data.course) === courseId; });
    var enrollment = data.enrollments.find(function (e) { return idOf(e.data.course) === courseId; }) || null;
    var savedCourse = (data.savedCourses || []).find(function (s) { return idOf(s.data.course) === courseId; }) || null;
    var instructor = findInstructor(data.instructors, courseId);
    var outcomes = (data.outcomes || []).filter(function (o) { return idOf(o.data.course) === courseId; }).sort(byOrder);

    hideModals(root);
    // Paint read-only UI blocks first...
    paintHero(root, course, modules, lessons, progress, enrollment);
    paintCurriculum(root, modules, lessons, progress);
    if (FEATURES.OUTCOMES) paintOutcomes(root, outcomes);
    else hideSection(root, 'outcomes');
    if (FEATURES.FIRST_LESSON) paintFirstLesson(root, modules, lessons);
    else hideSection(root, 'first-lesson');
    if (FEATURES.INSTRUCTOR) paintInstructor(root, instructor);
    else hideSection(root, 'instructor');
    // ...then attach writes/actions after state is on screen.
    if (FEATURES.ENROLLMENT_WRITES) wireEnrollment(root, course, enrollment, savedCourse, lessons, progress, ms);
    else hideEnrollmentButtons(root);
    hideAllStates(root);
  }

  // ============= HERO =============

  function paintHero(root, course, modules, lessons, progress, enrollment) {
    fillField(root, 'course.title', course.data.title);
    fillField(root, 'course.description', course.data.description);
    fillField(root, 'course.category', course.data.category);
    fillField(root, 'course.lesson_count', course.data.lesson_count || lessons.length);
    fillField(root, 'course.hours_estimate', course.data.hours_estimate);
    fillField(root, 'course.order', course.data.order);
    fillField(root, 'course.cover_image', course.data.cover_image);

    setTokenText(root, 'modules-count', String(modules.length));
    setTokenText(root, 'updated-at', formatMonthYear(course.updatedAt || course.createdAt));

    var completed = progress.filter(function (p) { return (p.data.completed | 0) === 1; }).length;
    var total = course.data.lesson_count || lessons.length;
    var hours = course.data.hours_estimate || '';
    var pct = total > 0 ? Math.round(completed / total * 100) : 0;

    setTokenText(root, 'progress-count', String(completed));

    var fillEl = queryToken(root, 'progress-fill');
    if (fillEl) fillEl.style.width = pct + '%';

    // Computed labels — single elements, no surrounding text. Use these in
    // Webflow whenever you'd otherwise have whitespace between two spans.
    setLabel(root, 'hero-eyebrow', pad2(course.data.order) + ' / ' + (course.data.category || '').toUpperCase()
      + ' · ' + total + ' LESSONS · ' + (hours || '').toUpperCase());
    setLabel(root, 'stats-lessons', total + ' LESSONS');
    setLabel(root, 'stats-modules', modules.length + ' MODULES');
    setLabel(root, 'stats-hours', (hours || '').toUpperCase());
    setLabel(root, 'stats-updated', course.updatedAt || course.createdAt
      ? 'UPDATED ' + formatMonthYear(course.updatedAt || course.createdAt) : '');
    setLabel(root, 'curriculum-summary', total + ' lessons · ' + modules.length + ' modules');
    setLabel(root, 'progress-fraction', completed + ' / ' + total);

    var enrollState = resolveEnrollState(enrollment);
    // Variant toggles drive mutually exclusive UI states in Webflow.
    toggleVariants(root, 'enroll', enrollState);
    toggleVariants(root, 'cta', resolveCtaMode(enrollState, completed, progress.length));

    setLabel(root, 'enroll-active-label', "You're enrolled · " + completed + ' of ' + total + ' lessons complete');
    setLabel(root, 'enroll-paused-label', 'Paused · ' + completed + ' of ' + total + ' lessons complete');
    setLabel(root, 'enroll-dropped-label', 'You dropped this course · re-enroll any time');
    setLabel(root, 'enroll-completed-label', 'Course complete · all ' + total + ' lessons done');
    setLabel(root, 'enroll-none-label', 'Free with your membership');

    var resumeLesson = resolveResumeLesson(enrollment, lessons, progress);
    if (resumeLesson) {
      setTokenText(root, 'resume-order', pad2(resumeLesson.data.order));
      setLabel(root, 'resume-cta-label', 'Continue · Lesson ' + pad2(resumeLesson.data.order));
      setDetailLink(root.querySelector('[data-ms-code="detail-link"][data-ms-show-value="resume"]'), resumeLesson.id);
    }

    var firstLesson = lessons[0];
    if (firstLesson) {
      setDetailLink(root.querySelector('[data-ms-code="detail-link"][data-ms-show-value="start"]'), firstLesson.id);
      setDetailLink(queryToken(root, 'watch-first'), firstLesson.id);
    }

    if (course.data.cover_image) paintCover(root, course.data.cover_image);
  }

  // Cover painter (attribute-only):
  // - Use explicit token roles:
  //     [data-ms-code="cover-bg"]  for background-image containers
  //     [data-ms-code="cover-img"] for <img> tags
  // - Wrapper token: [data-ms-code="cover"].
  function paintCover(root, url) {
    var bgNodes = queryTokenAll(root, 'cover-bg');
    var imgNodes = queryTokenAll(root, 'cover-img');

    if (bgNodes.length || imgNodes.length) {
      bgNodes.forEach(function (el) { el.style.backgroundImage = 'url("' + url + '")'; });
      imgNodes.forEach(function (el) {
        if (el.tagName === 'IMG') el.setAttribute('src', url);
      });
      return;
    }

    queryTokenAll(root, 'cover').forEach(function (el) {
      if (el.tagName === 'IMG') {
        el.setAttribute('src', url);
        return;
      }
      if (el.querySelector('img[data-ms-code="cover"]')) return;
      el.style.backgroundImage = 'url("' + url + '")';
    });
  }

  function resolveEnrollState(enrollment) {
    if (!enrollment) return 'none';
    // Defensive default keeps legacy/unknown statuses from breaking UI.
    var s = (enrollment.data.status || 'active').toLowerCase();
    return ['active', 'paused', 'dropped', 'completed'].indexOf(s) !== -1 ? s : 'active';
  }

  function resolveCtaMode(enrollState, completed, started) {
    if (enrollState === 'none') return 'enroll';
    if (enrollState === 'paused' || enrollState === 'dropped') return 'reactivate';
    if (enrollState === 'completed') return 'resume';
    // Resume once any lesson has been opened or completed; otherwise Start.
    return (completed > 0 || started > 0) ? 'resume' : 'start';
  }

  function resolveResumeLesson(enrollment, lessons, progress) {
    // Build the completed-lesson set so we never resume to a finished lesson.
    var completedIds = Object.create(null);
    progress.forEach(function (p) {
      if ((p.data.completed | 0) === 1) completedIds[idOf(p.data.lesson)] = true;
    });

    // Priority 1: explicit current_lesson on enrollment — but only if it's
    // not already completed. Stale enrolment pointers (e.g. set at enrol time
    // and never updated) used to keep the CTA stuck on "Lesson 01".
    if (enrollment) {
      var ids = arrayOfIds(enrollment.data.current_lesson);
      for (var i = 0; i < ids.length; i++) {
        if (completedIds[ids[i]]) continue;
        var hit = lessons.find(function (l) { return l.id === ids[i]; });
        if (hit) return hit;
      }
    }
    // Priority 2: most recently touched incomplete progress row.
    var sorted = progress.slice().sort(function (a, b) {
      return tsOf(b.data.last_watched_at || b.data.completed_at) - tsOf(a.data.last_watched_at || a.data.completed_at);
    });
    for (var j = 0; j < sorted.length; j++) {
      if ((sorted[j].data.completed | 0) === 1) continue;
      var lid = idOf(sorted[j].data.lesson);
      var lesson = lessons.find(function (l) { return l.id === lid; });
      if (lesson) return lesson;
    }
    // Priority 3: first lesson the member hasn't completed yet (lessons here
    // are already ordered by module → lesson).
    for (var k = 0; k < lessons.length; k++) {
      if (!completedIds[lessons[k].id]) return lessons[k];
    }
    // All lessons completed → resume points at the last one for "Re-watch".
    return lessons[lessons.length - 1] || null;
  }

  // ============= CURRICULUM =============

  function paintCurriculum(root, modules, lessons, progress) {
    var ctn = root.querySelector('[data-ms-code="curriculum"]');
    if (!ctn) return;
    var moduleTpl = ctn.querySelector('[data-ms-code="module-template"]');
    if (!moduleTpl) return;

    clearClones(ctn);
    moduleTpl.style.display = 'none';

    if (!modules.length) { showState(ctn, 'list-empty'); return; }

    var resumeLessonId = pickResumeLessonId(lessons, progress);

    modules.forEach(function (mod) {
      var modClone = moduleTpl.cloneNode(true);
      modClone.removeAttribute('data-ms-code');
      modClone.setAttribute('data-ms-clone', 'true');
      modClone.style.display = '';

      fillField(modClone, 'module.title', mod.data.title);
      fillField(modClone, 'module.lesson_count', mod.data.lesson_count || 0);
      fillField(modClone, 'module.order', mod.data.order);
      setLabel(modClone, 'module-meta',
        'MODULE ' + pad2(mod.data.order) + ' · ' + (mod.data.lesson_count || 0) + ' LESSONS');
      // Optional module-level navigation:
      // - if the module wrapper itself is a link, wire it
      // - or wire any explicit module-link token nodes inside
      if (modClone.tagName === 'A') setDetailLink(modClone, mod.id);
      queryTokenAll(modClone, 'module-link').forEach(function (el) {
        setDetailLink(el, mod.id);
      });

      var innerLessonTpl = modClone.querySelector('[data-ms-code="lesson-template"]');
      if (innerLessonTpl) {
        // Remove template from clone, then append concrete lesson rows.
        var anchor = innerLessonTpl.parentNode;
        anchor.removeChild(innerLessonTpl);
        var modLessons = lessons.filter(function (l) { return idOf(l.data.module) === mod.id; });
        var unlockedIndex = firstIncompleteIndex(modLessons, progress);
        modLessons.forEach(function (lesson) {
          var row = innerLessonTpl.cloneNode(true);
          row.removeAttribute('data-ms-code');
          row.setAttribute('data-ms-clone', 'true');
          row.style.display = '';
          paintLessonRow(row, lesson, progress, resumeLessonId, modLessons, unlockedIndex);
          anchor.appendChild(row);
        });
      }

      moduleTpl.parentNode.insertBefore(modClone, moduleTpl);
    });
  }

  function paintLessonRow(row, lesson, progress, resumeLessonId, modLessons, unlockedIndex) {
    var minutes = lesson.data.duration_minutes || 0;
    fillField(row, 'lesson.title', lesson.data.title);
    fillField(row, 'lesson.duration_minutes', minutes);
    fillField(row, 'lesson.order', lesson.data.order);

    setLabel(row, 'lesson-duration-done', minutes + ' min');
    setLabel(row, 'lesson-duration-active', 'CONTINUE · ' + minutes + ' MIN');
    setLabel(row, 'lesson-duration-todo', minutes + ' min');

    var status = resolveLessonStatus(lesson, progress, resumeLessonId, modLessons, unlockedIndex);
    // If markup has no explicit locked variant, degrade to todo so row stays visible.
    if (status === 'locked' && !hasVariant(row, 'status', 'locked')) status = 'todo';

    toggleVariants(row, 'status', status);
    if (status === 'locked') {
      row.removeAttribute('href');
      row.setAttribute('aria-disabled', 'true');
    } else {
      row.removeAttribute('aria-disabled');
      setDetailLink(row, lesson.id);
    }
  }

  function pickResumeLessonId(lessons, progress) {
    var sorted = progress.slice().sort(function (a, b) {
      return tsOf(b.data.last_watched_at) - tsOf(a.data.last_watched_at);
    });
    for (var i = 0; i < sorted.length; i++) {
      if ((sorted[i].data.completed | 0) !== 1) return idOf(sorted[i].data.lesson);
    }
    return null;
  }

  function resolveLessonStatus(lesson, progress, resumeLessonId, modLessons, unlockedIndex) {
    // done > active > locked > todo precedence
    var prog = progress.find(function (p) { return idOf(p.data.lesson) === lesson.id; });
    if (prog && (prog.data.completed | 0) === 1) return 'done';
    if (modLessons && modLessons.length) {
      var idx = modLessons.findIndex(function (l) { return l.id === lesson.id; });
      if (unlockedIndex !== -1 && idx > unlockedIndex) return 'locked';
      if (idx === unlockedIndex) return 'active';
    }
    if (lesson.id === resumeLessonId || prog) return 'active';
    return 'todo';
  }

  function firstIncompleteIndex(lessons, progress) {
    for (var i = 0; i < lessons.length; i++) {
      var lessonId = lessons[i] && lessons[i].id;
      var rec = progress.find(function (p) { return idOf(p.data.lesson) === lessonId; });
      if (!(rec && (rec.data.completed | 0) === 1)) return i;
    }
    return -1;
  }

  function hasVariant(scope, attr, value) {
    return !!scope.querySelector('[data-ms-show-if="' + attr + '"][data-ms-show-value="' + value + '"]');
  }

  // ============= FIRST LESSON PREVIEW =============

  function paintFirstLesson(root, modules, lessons) {
    var section = root.querySelector('[data-ms-code="first-lesson"]');
    if (!section) return;
    var lesson = lessons[0];
    if (!lesson) return;
    var mod = modules.find(function (m) { return m.id === idOf(lesson.data.module); });
    var minutes = lesson.data.duration_minutes || 0;

    fillField(section, 'first-lesson.title', lesson.data.title);
    fillField(section, 'first-lesson.description', lesson.data.description);
    fillField(section, 'first-lesson.duration_minutes', minutes);
    fillField(section, 'first-lesson.order', lesson.data.order);
    fillField(section, 'first-lesson.video_url', lesson.data.video_url);
    if (mod) fillField(section, 'first-module.order', mod.data.order);

    setLabel(section, 'first-lesson-duration', minutes + ' MIN');
    setLabel(section, 'first-lesson-meta',
      'LESSON ' + pad2(lesson.data.order) + ' · MODULE ' + pad2(mod ? mod.data.order : 1));

    section.querySelectorAll('[data-ms-code="detail-link"]').forEach(function (a) {
      setDetailLink(a, lesson.id);
    });

    // Preview thumb fallback:
    // If lesson.video_url is YouTube/Vimeo, derive a public thumbnail URL and
    // paint it on elements marked with the preview-thumb token.
    var thumbCandidates = deriveVideoThumbnailCandidates(lesson.data.video_url);
    if (thumbCandidates.length) {
      var thumbNodes = queryTokenAll(section, 'preview-thumb');
      thumbNodes.forEach(function (el) {
        if (el.tagName === 'IMG') {
          // For <img>, try high-res first then downgrade on load failure.
          setImgWithFallback(el, thumbCandidates);
        }
        else {
          // CSS backgrounds cannot reliably detect 404; use best candidate.
          el.style.backgroundImage = 'url("' + thumbCandidates[0] + '")';
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
        }
      });
    }
  }

  function deriveVideoThumbnailCandidates(videoUrl) {
    if (!videoUrl || typeof videoUrl !== 'string') return [];
    var parsed;
    try { parsed = new URL(videoUrl); } catch (e) { return []; }
    var host = (parsed.hostname || '').toLowerCase();

    // YouTube:
    // - youtube.com/watch?v=VIDEO_ID
    // - youtu.be/VIDEO_ID
    // - youtube.com/embed/VIDEO_ID
    if (host.indexOf('youtube.com') !== -1 || host.indexOf('youtu.be') !== -1) {
      var ytId = youtubeIdFromUrl(parsed);
      if (!ytId) return [];
      // Prefer high-res first, then degrade gracefully.
      return [
        'https://i.ytimg.com/vi_webp/' + ytId + '/maxresdefault.webp',
        'https://i.ytimg.com/vi/' + ytId + '/maxresdefault.jpg',
        'https://i.ytimg.com/vi/' + ytId + '/sddefault.jpg',
        'https://img.youtube.com/vi/' + ytId + '/hqdefault.jpg'
      ];
    }

    // Vimeo:
    // - vimeo.com/12345678
    // - player.vimeo.com/video/12345678
    // Preferred thumbnail endpoint requires no auth in many cases.
    if (host.indexOf('vimeo.com') !== -1) {
      var vmId = vimeoIdFromUrl(parsed);
      if (!vmId) return [];
      // Vumbnail variants: prefer large first.
      return [
        'https://vumbnail.com/' + vmId + '_large.jpg',
        'https://vumbnail.com/' + vmId + '.jpg',
        'https://vumbnail.com/' + vmId + '_medium.jpg'
      ];
    }

    return [];
  }

  function setImgWithFallback(img, urls) {
    if (!img || !urls || !urls.length) return;
    var i = 0;
    function tryNext() {
      if (i >= urls.length) return;
      img.setAttribute('src', urls[i++]);
    }
    img.onerror = function () { tryNext(); };
    tryNext();
  }

  function youtubeIdFromUrl(u) {
    if (!u) return null;
    var host = (u.hostname || '').toLowerCase();
    if (host.indexOf('youtu.be') !== -1) {
      var shortId = (u.pathname || '').replace(/^\/+/, '').split('/')[0];
      return shortId || null;
    }
    var v = u.searchParams.get('v');
    if (v) return v;
    var parts = (u.pathname || '').split('/').filter(Boolean);
    var embedIdx = parts.indexOf('embed');
    if (embedIdx !== -1 && parts[embedIdx + 1]) return parts[embedIdx + 1];
    return null;
  }

  function vimeoIdFromUrl(u) {
    if (!u) return null;
    var parts = (u.pathname || '').split('/').filter(Boolean);
    for (var i = parts.length - 1; i >= 0; i--) {
      if (/^\d+$/.test(parts[i])) return parts[i];
    }
    return null;
  }

  // ============= OUTCOMES =============
  // Renders cards from the `outcomes` table, scoped to this course and
  // sorted by `order`. Mark one card as the template with
  // [data-ms-code="outcome-template"]; inside it use:
  //   [data-ms-field="outcome.title"]       → h3 / heading
  //   [data-ms-field="outcome.description"] → p / subhead
  //   [data-ms-code="outcome-label"]        → "OUTCOME 01" tagline
  // Wrap the grid in [data-ms-code="outcomes"] so the whole section can
  // hide itself when no outcomes exist.

  function paintOutcomes(root, outcomes) {
    var section = root.querySelector('[data-ms-code="outcomes"]');
    var tpl = (section || root).querySelector('[data-ms-code="outcome-template"]');
    if (!tpl) return;
    var anchor = tpl.parentNode;

    anchor.querySelectorAll('[data-ms-clone="true"][data-ms-code="outcome-card"]')
      .forEach(function (n) { n.parentNode.removeChild(n); });
    tpl.style.display = 'none';

    if (!outcomes.length) {
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = '';

    outcomes.forEach(function (o, i) {
      var card = tpl.cloneNode(true);
      card.removeAttribute('data-ms-code');
      card.setAttribute('data-ms-clone', 'true');
      card.setAttribute('data-ms-code', 'outcome-card');
      card.style.display = '';

      fillField(card, 'outcome.title', o.data.title);
      fillField(card, 'outcome.description', o.data.description);
      fillField(card, 'outcome.order', o.data.order);

      setLabel(card, 'outcome-label', 'OUTCOME ' + pad2(o.data.order || (i + 1)));

      anchor.insertBefore(card, tpl);
    });
  }

  // ============= INSTRUCTOR =============

  function findInstructor(instructors, courseId) {
    var match = instructors.find(function (i) {
      return arrayOfIds(i.data.courses).indexOf(courseId) !== -1;
    });
    if (match) return match;
    if (DEBUG) {
      if (instructors.length) {
        console.warn(LABEL + ' no instructor matched courseId=' + courseId
          + ' — first instructor.courses raw value:', instructors[0].data.courses,
          '| parsed ids:', arrayOfIds(instructors[0].data.courses));
      } else {
        console.warn(LABEL + ' instructors table is empty');
      }
    }
    return null;
  }

  function paintInstructor(root, instructor) {
    var section = root.querySelector('[data-ms-code="instructor"]');
    if (!section) return;
    if (!instructor) { section.style.display = 'none'; return; }
    section.style.display = '';

    fillField(section, 'instructor.name', instructor.data.name);
    fillField(section, 'instructor.title', instructor.data.title);
    fillField(section, 'instructor.bio', instructor.data.bio);
    fillField(section, 'instructor.years_of_experience', instructor.data.years_of_experience);

    if (instructor.data.avatar) paintAvatar(section, instructor.data.avatar);
  }

  function paintAvatar(section, url) {
    var nodes = section.querySelectorAll('[data-ms-field="instructor.avatar"]');
    nodes.forEach(function (el) {
      if (el.tagName === 'IMG') {
        el.setAttribute('src', url);
      } else {
        el.style.backgroundImage = 'url("' + url + '")';
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.textContent = '';
      }
    });
  }

  // ============= ENROLLMENT WRITES =============

  function wireEnrollment(root, course, enrollment, savedCourse, lessons, progress, ms) {
    var enrollBtn = queryToken(root, 'enroll-btn');
    var reactivateBtn = queryToken(root, 'reactivate-btn');
    var dropBtn = queryToken(root, 'drop');
    var resetBtn = queryToken(root, 'hard-unenroll');
    var saveCourseBtns = queryTokenAll(root, 'save-course');

    // Visibility — drop only makes sense when there's an active/paused
    // enrollment to drop. Hard-unenroll is available whenever there's
    // anything to wipe (enrollment row OR any saved progress).
    var status = enrollment && enrollment.data && enrollment.data.status;
    var canDrop = status === 'active' || status === 'paused';
    var canReset = !!enrollment || (progress && progress.length > 0);
    if (dropBtn)  dropBtn.style.display  = canDrop  ? '' : 'none';
    if (resetBtn) resetBtn.style.display = canReset ? '' : 'none';

    paintSaveCourseState(root, !!savedCourse);

    if (enrollBtn) enrollBtn.addEventListener('click', function (e) {
      e.preventDefault(); enrollAction(ms, course, enrollment);
    });
    if (reactivateBtn) reactivateBtn.addEventListener('click', function (e) {
      e.preventDefault(); setStatus(ms, enrollment, 'active');
    });
    if (dropBtn) dropBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (!enrollment) return;
      openConfirm(root, 'drop-modal',
        'Drop this course? Your progress is kept and you can re-enroll any time.',
        function () { setStatus(ms, enrollment, 'dropped'); });
    });
    if (resetBtn) resetBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openConfirm(root, 'reset-modal',
        'Reset this course? This deletes your enrollment, lesson progress, saved lessons, saved courses, and activity for this course. This cannot be undone.',
        function () { hardUnenroll(ms, course, enrollment, lessons, progress); });
    });
    saveCourseBtns.forEach(function (saveCourseBtn) {
      saveCourseBtn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleSaveCourse(ms, course, savedCourse);
      });
    });
  }

  function paintSaveCourseState(root, saved) {
    // UI text/icon styling should come from Webflow state variants.
    // Script only flips state; it does not mutate button text.
    toggleVariants(root, 'save-course', saved ? 'saved' : 'unsaved');
  }

  async function toggleSaveCourse(ms, course, existing) {
    try {
      var member = await window.MSDataCache.getMember(ms);
      if (!member) return;
      if (existing) {
        var existingId = recordId(existing);
        if (existingId) {
          await writeWithRetry(function () {
            return ms.deleteDataRecord({ recordId: existingId });
          }, 'save-course');
        }
      } else {
        await writeWithRetry(function () {
          return ms.createDataRecord({
            table: TABLES.savedCourses,
            data: { owner: member.id, course: course.id, saved_at: new Date().toISOString() }
          });
        }, 'save-course');
      }
      window.MSDataCache.invalidate(TABLES.savedCourses);
      window.location.reload();
    } catch (err) {
      console.error(LABEL + ' toggle save course failed', err);
    }
  }

  async function enrollAction(ms, course, existing) {
    try {
      // If a row already exists (paused/dropped), reuse it by reactivating.
      if (existing) { await setStatus(ms, existing, 'active'); return; }
      var member = await window.MSDataCache.getMember(ms);
      if (!member) return;
      await writeWithRetry(function () {
        return ms.createDataRecord({
          table: TABLES.enrollment,
          data: { owner: member.id, course: course.id, enrolled_at: new Date().toISOString(), status: 'active' }
        });
      }, 'enroll');
      window.MSDataCache.invalidate(TABLES.enrollment);
      window.location.reload();
    } catch (err) { console.error(LABEL + ' enroll failed', err); }
  }

  async function setStatus(ms, enrollment, status) {
    if (!enrollment) return;
    var id = recordId(enrollment);
    if (!id) { console.error(LABEL + ' setStatus: enrollment has no id, aborting', enrollment); return; }
    try {
      // Memberstack expects `recordId`, not `id`, on update/delete APIs.
      await writeWithRetry(function () {
        return ms.updateDataRecord({ recordId: id, data: { status: status } });
      }, 'enrollment-status');
      window.MSDataCache.invalidate(TABLES.enrollment);
      window.location.reload();
    } catch (err) { console.error(LABEL + ' update enrollment failed', err); }
  }

  // Hard unenroll: deletes enrollment + lesson_progress + saved_courses +
  // saved_lessons + activity rows that belong to this course.
  async function hardUnenroll(ms, course, enrollment, lessons, progress) {
    try {
      var member = await window.MSDataCache.getMember(ms);
      if (!member) return;
      var courseId = course.id;
      var lessonIds = lessons.map(function (l) { return l.id; });
      var ownerWhere = { owner: { equals: member.id } };

      // Auxiliary cleanup tables (saved_*, activity) are best-effort: if one
      // isn't provisioned in this Memberstack project the query 404s. Swallow
      // that per-table so a missing table can't block the core reset
      // (enrollment + lesson_progress deletes).
      function loadOrEmpty(table) {
        return window.MSDataCache.load(ms, table, ownerWhere).catch(function (err) {
          console.warn(LABEL + ' hard unenroll: skipping "' + table + '" cleanup — '
            + ((err && (err.status || err.message)) || 'load failed'));
          return [];
        });
      }

      var ownedRows = await Promise.all([
        loadOrEmpty(TABLES.savedCourses),
        loadOrEmpty(TABLES.savedLessons),
        loadOrEmpty(TABLES.activity)
      ]);
      var savedCourses = ownedRows[0].filter(function (s) { return idOf(s.data && s.data.course) === courseId; });
      var savedLessons = ownedRows[1].filter(function (s) { return lessonIds.indexOf(idOf(s.data && s.data.lesson)) !== -1; });
      var activityRows = ownedRows[2].filter(function (a) { return lessonIds.indexOf(idOf(a.data && a.data.lesson)) !== -1; });

      // Build thunks (not in-flight promises) so the shared queue can
      // retry any individual delete that gets rate-limited. Skip any
      // record that's missing an id rather than firing /undefined.
      // Memberstack's deleteDataRecord infers the table from recordId.
      var jobs = [];
      function del(rec) {
        var id = recordId(rec);
        if (!id) return;
        jobs.push(function () { return ms.deleteDataRecord({ recordId: id }); });
      }

      if (enrollment) del(enrollment);
      progress.forEach(del);
      savedCourses.forEach(del);
      savedLessons.forEach(del);
      activityRows.forEach(del);

      if (DEBUG) console.log(LABEL + ' hard unenroll deleting', {
        enrollments: enrollment ? 1 : 0, lesson_progress: progress.length,
        saved_courses: savedCourses.length, saved_lessons: savedLessons.length,
        activity: activityRows.length, total: jobs.length
      });

      // Bounded concurrency + per-job 429 backoff. Default 4 in flight.
      var outcome = await window.MSDataCache.runWrites(jobs, { label: 'hard-unenroll' });

      [TABLES.enrollment, TABLES.progress, TABLES.savedCourses, TABLES.savedLessons, TABLES.activity].forEach(function (t) {
        window.MSDataCache.invalidate(t);
      });

      if (outcome.failures > 0) {
        console.error(LABEL + ' hard unenroll: ' + outcome.failures + ' of ' + jobs.length
          + ' deletes failed after retries — reloading anyway, retry the button to clean up the rest');
      }
      window.location.reload();
    } catch (err) { console.error(LABEL + ' hard unenroll failed', err); }
  }

  // ============= CONFIRM MODAL =============
  // Looks for [data-ms-code="<key>"] inside root (e.g. drop-modal, reset-modal).
  // Inside that scope, [data-ms-code="confirm-yes"] runs the action,
  // [data-ms-code="confirm-cancel"] (or [data-ms-code="confirm-backdrop"]) closes.
  // Falls back to native confirm() when no modal element is present.
  function openConfirm(root, key, fallbackMessage, onConfirm) {
    var modal = queryToken(root, key);
    if (!modal) {
      if (window.confirm(fallbackMessage)) onConfirm();
      return;
    }

    var yes = queryToken(modal, 'confirm-yes');
    var cancel = queryToken(modal, 'confirm-cancel');
    var backdrop = queryToken(modal, 'confirm-backdrop');

    function close() {
      modal.style.display = 'none';
      if (yes) yes.removeEventListener('click', onYes);
      if (cancel) cancel.removeEventListener('click', onNo);
      if (backdrop) backdrop.removeEventListener('click', onNo);
      document.removeEventListener('keydown', onKey);
    }
    function onYes(e) { e.preventDefault(); close(); onConfirm(); }
    function onNo(e)  { e.preventDefault(); close(); }
    // Escape-to-close keeps parity with normal modal UX.
    function onKey(e) { if (e.key === 'Escape') onNo(e); }

    if (yes)     yes.addEventListener('click', onYes);
    if (cancel)  cancel.addEventListener('click', onNo);
    if (backdrop) backdrop.addEventListener('click', onNo);
    document.addEventListener('keydown', onKey);

    // Use a real value (not '') so we override any CSS rule that hides
    // the modal by default (e.g. .modal_wrapper { display: none }).
    // Honor a per-modal override if you need block/grid:
    //   <div data-ms-code="drop-modal" data-modal-display="block">
    var openAs = modal.getAttribute('data-modal-display') || 'flex';
    modal.style.display = openAs;
  }

  // Make sure both modals start hidden, regardless of how Webflow rendered
  // them. Belt-and-suspenders for sites that don't add display:none in CSS.
  function hideModals(root) {
    queryTokenAll(root, 'drop-modal').concat(queryTokenAll(root, 'reset-modal'))
      .forEach(function (m) { m.style.display = 'none'; });
  }

  // ============= HELPERS =============

  function findCourse(courses, id, slug) {
    if (id) {
      var byId = courses.find(function (c) { return c.id === id; });
      if (byId) return byId;
    }
    if (slug) {
      var bySlug = courses.find(function (c) { return c.data && c.data.slug === slug; });
      if (bySlug) return bySlug;
    }
    return null;
  }

  function fillField(root, key, value) {
    if (value == null || value === '') return;
    root.querySelectorAll('[data-ms-field="' + key + '"]').forEach(function (el) {
      var flag = el.getAttribute('data-ms-code');
      // Same field key can render as text, padded number, image src, or bg-image.
      if (flag === 'bg-image')      el.style.backgroundImage = 'url("' + value + '")';
      else if (el.tagName === 'IMG') el.setAttribute('src', value);
      else if (flag === 'pad')       el.textContent = pad2(value);
      else                            el.textContent = value;
    });
  }

  function setLabel(root, key, value) {
    if (value == null) return;
    queryTokenAll(root, key).forEach(function (el) {
      el.textContent = value;
    });
  }

  function setText(root, sel, text) {
    if (text == null) return;
    var el = root.querySelector(sel);
    if (el) el.textContent = text;
  }

  function setEachText(root, sel, text) {
    if (text == null) return;
    root.querySelectorAll(sel).forEach(function (el) { el.textContent = text; });
  }

  function setTokenText(root, key, text) {
    if (text == null) return;
    queryTokenAll(root, key).forEach(function (el) { el.textContent = text; });
  }

  function toggleVariants(root, attr, activeValue) {
    // Declarative variant system:
    // keep only nodes whose [data-ms-show-value] matches activeValue.
    root.querySelectorAll('[data-ms-show-if="' + attr + '"]').forEach(function (n) {
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

  function clearClones(root) {
    root.querySelectorAll('[data-ms-clone="true"]').forEach(function (n) { n.parentNode.removeChild(n); });
  }


  function getUrlParam(name) {
    try { return new URL(window.location.href).searchParams.get(name); } catch (e) { return null; }
  }

  function idOf(ref) {
    // Normalize Memberstack REFERENCE values from many possible shapes.
    if (!ref) return null;
    if (typeof ref === 'string') return ref;
    if (Array.isArray(ref)) return idOf(ref[0]);
    if (typeof ref === 'object') return ref.id || ref._id || null;
    return null;
  }

  // Pull the record id off whatever wrapper Memberstack returned.
  // Different projects have surfaced this as id, _id, or recordId.
  function recordId(r) {
    if (!r) return null;
    var id = r.id || r._id || r.recordId;
    if (!id) {
      console.warn(LABEL + ' could not find id on record — keys:', Object.keys(r), r);
    }
    return id || null;
  }

  // Run a single write through MSDataCache.runWrites so it inherits 429
  // backoff + retry. Falls back to a plain call if runWrites is unavailable.
  function writeWithRetry(thunk, label) {
    if (window.MSDataCache && typeof window.MSDataCache.runWrites === 'function') {
      return window.MSDataCache.runWrites([thunk], { label: label, stopOnError: true })
        .then(function (o) { return o.results[0]; });
    }
    return Promise.resolve().then(thunk);
  }

  // Permissive — accepts arrays, comma-separated strings, single ids,
  // single objects, and {ids:[…]} / {records:[…]} wrappers. This matches
  // every shape we've seen Memberstack return for REFERENCE_MANY fields.
  function arrayOfIds(refs) {
    if (!refs) return [];
    if (Array.isArray(refs)) return refs.map(idOf).filter(Boolean);
    if (typeof refs === 'string') {
      return refs.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }
    if (typeof refs === 'object') {
      if (Array.isArray(refs.ids)) return refs.ids;
      if (Array.isArray(refs.records)) return refs.records.map(idOf).filter(Boolean);
      var single = idOf(refs);
      return single ? [single] : [];
    }
    return [];
  }

  function byOrder(a, b) { return (a.data.order || 0) - (b.data.order || 0); }

  function byModuleThenOrder(modules) {
    // Stable lesson ordering: module.order first, then lesson.order.
    var map = {};
    modules.forEach(function (m, i) { map[m.id] = (m.data.order != null ? m.data.order : i); });
    return function (a, b) {
      var ma = map[idOf(a.data.module)] || 0;
      var mb = map[idOf(b.data.module)] || 0;
      if (ma !== mb) return ma - mb;
      return (a.data.order || 0) - (b.data.order || 0);
    };
  }

  function pad2(n) {
    var x = parseInt(n, 10);
    if (isNaN(x)) return String(n == null ? '' : n);
    return x < 10 ? '0' + x : String(x);
  }

  function formatMonthYear(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function tsOf(dateStr) {
    if (!dateStr) return 0;
    var t = new Date(dateStr).getTime();
    return isNaN(t) ? 0 : t;
  }

  // ============= STATE SLOTS =============

  function showState(scope, key) {
    ['list-loading', 'list-empty', 'list-error'].forEach(function (k) {
      var el = scope.querySelector('[data-ms-code="' + k + '"]');
      if (el) el.style.display = (k === key ? '' : 'none');
    });
  }

  function showStateAll(root, key) {
    // Keep state messaging scoped to curriculum block for now.
    var s = root.querySelector('[data-ms-code="curriculum"]');
    if (s) showState(s, key);
  }

  function hideAllStates(root) {
    root.querySelectorAll('[data-ms-code="list-loading"], [data-ms-code="list-empty"], [data-ms-code="list-error"]')
      .forEach(function (el) { el.style.display = 'none'; });
  }

  function hideSection(root, code) {
    var el = root.querySelector('[data-ms-code="' + code + '"]');
    if (el) el.style.display = 'none';
  }

  function hideEnrollmentButtons(root) {
    root.querySelectorAll(tokenSelector('drop') + ','
      + tokenSelector('hard-unenroll') + ','
      + tokenSelector('enroll-btn') + ','
      + tokenSelector('reactivate-btn') + ','
      + tokenSelector('save-course'))
      .forEach(function (el) { el.style.display = 'none'; });
  }

  function tableConfig(root) {
    return {
      course: root.getAttribute('ms-code-table-course') || 'courses',
      module: root.getAttribute('ms-code-table-module') || 'modules',
      lesson: root.getAttribute('ms-code-table-lesson') || 'lessons',
      instructor: root.getAttribute('ms-code-table-instructor') || 'instructors',
      outcome: root.getAttribute('ms-code-table-outcome') || 'outcomes',
      progress: root.getAttribute('ms-code-table-progress') || 'lesson_progress',
      enrollment: root.getAttribute('ms-code-table-enrollment') || 'enrollments',
      savedCourses: root.getAttribute('ms-code-table-saved-courses') || 'saved_courses',
      savedLessons: root.getAttribute('ms-code-table-saved-lessons') || 'saved_lessons',
      activity: root.getAttribute('ms-code-table-activity') || 'activity'
    };
  }

  function tokenSelector(key) {
    return '[data-ms-code="' + key + '"]';
  }

  function queryToken(scope, key) {
    return scope ? scope.querySelector(tokenSelector(key)) : null;
  }

  function queryTokenAll(scope, key) {
    return scope ? Array.prototype.slice.call(scope.querySelectorAll(tokenSelector(key))) : [];
  }
})();
</script>
