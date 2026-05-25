<!-- 💙 Script v0.1 💙 LESSON DETAIL PAGE -->
<script>
(function () {
  'use strict';

  var LABEL = '[lesson-detail]';
  // Player sizing fallback for embed-style containers
  // ([data-ms-code="video-player"] on a non-iframe node).
  // Preferred: control size in Webflow/CSS; this is a safety net.
  var VIDEO_PLAYER_MIN_HEIGHT = 'auto';

  // On lesson open, re-stamp last_watched_at at most once per this window,
  // so revisiting a lesson doesn't write to the API on every page load.
  var LAST_WATCHED_TOUCH_MS = 5 * 60 * 1000;

  document.addEventListener('DOMContentLoaded', function () { boot(); });

  async function boot() {
    var root = document.querySelector('[data-ms-code="lesson-page"]');
    if (!root) return;

    if (!window.$memberstackDom || !window.MSDataCache) {
      console.warn(LABEL + ' missing $memberstackDom or MSDataCache');
      return;
    }

    var ms = window.$memberstackDom;
    var TABLES = tableConfig(root);
    var idParam = root.getAttribute('ms-code-id-param') || 'id';
    var slugParam = root.getAttribute('ms-code-slug-param') || 'slug';
    var lessonId = getUrlParam(idParam);
    var lessonSlug = getUrlParam(slugParam);
    if (!lessonId && !lessonSlug) return;

    try {
      var member = await window.MSDataCache.getMember(ms);
      var ownerWhere = member ? { owner: { equals: member.id } } : null;

      var loaded = await Promise.all([
        mustLoad(ms, TABLES.course, null),
        mustLoad(ms, TABLES.module, null),
        mustLoad(ms, TABLES.lesson, null),
        safeLoad(ms, TABLES.breakdown, null),
        safeLoad(ms, TABLES.reference, null),
        ownerWhere ? mustLoad(ms, TABLES.progress, ownerWhere) : Promise.resolve([]),
        ownerWhere ? safeLoad(ms, TABLES.savedLessons, ownerWhere) : Promise.resolve([]),
        ownerWhere ? safeLoad(ms, TABLES.enrollment, ownerWhere) : Promise.resolve([])
      ]);

      var data = {
        courses: loaded[0],
        modules: loaded[1],
        lessons: loaded[2],
        breakdown: loaded[3],
        references: loaded[4],
        progress: loaded[5],
        savedLessons: loaded[6],
        enrollments: loaded[7],
        tables: TABLES,
        member: member,
        ms: ms
      };

      var lesson = findLesson(data.lessons, lessonId, lessonSlug);
      if (!lesson) return;

      render(root, lesson, data);
    } catch (err) {
      console.error(LABEL + ' boot failed', err);
    }
  }

  async function mustLoad(ms, table, where) {
    return window.MSDataCache.load(ms, table, where);
  }

  async function safeLoad(ms, table, where) {
    try {
      return await window.MSDataCache.load(ms, table, where);
    } catch (err) {
      var code = err && err.code;
      if (code === 'data-table-not-found') {
        console.warn(LABEL + ' optional table missing: ' + table + ' (continuing)');
        return [];
      }
      throw err;
    }
  }

  function render(root, lesson, data) {
    var moduleId = idOf(lesson.data.module);
    var courseId = idOf(lesson.data.course);

    var mod = data.modules.find(function (m) { return recordId(m) === moduleId; }) || null;
    var course = data.courses.find(function (c) { return recordId(c) === courseId; }) || null;

    var moduleLessons = data.lessons
      .filter(function (l) { return idOf(l.data.module) === moduleId; })
      .sort(byOrder);

    var progress = data.progress.filter(function (p) { return idOf(p.data.course) === courseId; });
    var moduleProgress = progress.filter(function (p) { return idOf(p.data.lesson) && moduleLessons.some(function (l) { return recordId(l) === idOf(p.data.lesson); }); });

    // Course-wide ordered lesson list — drives strict drip across modules,
    // so a sidebar row in Module 2 stays locked while Module 1 is unfinished.
    var courseModules = data.modules
      .filter(function (m) { return idOf(m.data.course) === courseId; })
      .sort(byOrder);
    var modOrder = Object.create(null);
    courseModules.forEach(function (m) { modOrder[recordId(m)] = m.data.order || 0; });
    var courseLessons = data.lessons
      .filter(function (l) { return idOf(l.data.course) === courseId; })
      .sort(function (a, b) {
        var modA = modOrder[idOf(a.data.module)] || 0;
        var modB = modOrder[idOf(b.data.module)] || 0;
        if (modA !== modB) return modA - modB;
        return (a.data.order || 0) - (b.data.order || 0);
      });
    var courseUnlockedIndex = firstIncompleteIndex(courseLessons, progress);

    applyPageMeta(root, lesson.data.title, lesson.data.description);

    paintBreadcrumbs(root, lesson, mod, course);
    paintHero(root, lesson, mod, moduleLessons, moduleProgress);
    paintVideo(root, lesson);
    paintBreakdown(root, lesson, data.breakdown);
    paintResources(root, lesson, data.references);
    paintLessonPagination(root, lesson, moduleLessons, data);
    paintSidebarCurriculum(root, lesson, mod, moduleLessons, moduleProgress, courseLessons, courseUnlockedIndex);
    wireMarkComplete(root, lesson, data.member, data.ms, data.progress, data.tables, data.enrollments);
    wireSaveActions(root, lesson, course, data.member, data.ms, data.savedLessons, data.tables);
    wireViewCourse(root, course);

    // Fire-and-forget: log that the member opened this lesson.
    recordLessonOpen(lesson, data.member, data.ms, data.progress, data.tables);
  }

  function paintBreadcrumbs(root, lesson, mod, course) {
    var learn = queryToken(root, 'crumb-learn');
    var c = queryToken(root, 'crumb-course');
    var m = queryToken(root, 'crumb-module');
    var l = queryToken(root, 'crumb-lesson');

    if (learn && !learn.getAttribute('href')) console.warn(LABEL + ' set href on crumb-learn in markup');
    if (c && course) setDetailLink(c, recordId(course));
    if (m && mod) setDetailLink(m, recordId(mod));
    if (l) setDetailLink(l, recordId(lesson));

    fillField(root, 'course.title', course && course.data.title);
    fillField(root, 'module.title', mod && mod.data.title);
    fillField(root, 'lesson.title', lesson.data.title);
  }

  function paintHero(root, lesson, mod, moduleLessons, moduleProgress) {
    var idx = moduleLessons.findIndex(function (l) { return recordId(l) === recordId(lesson); });
    var total = moduleLessons.length || (mod && mod.data.lesson_count) || 0;
    var done = moduleLessons.filter(function (l) { return isDone(recordId(l), moduleProgress); }).length;
    var pct = total > 0 ? Math.round(done / total * 100) : 0;
    var mins = parseInt(lesson.data.duration_minutes || 0, 10) || 0;

    fillField(root, 'lesson.title', lesson.data.title);
    fillField(root, 'lesson.description', lesson.data.description);
    fillField(root, 'lesson.duration_minutes', mins);
    fillField(root, 'lesson.order', lesson.data.order);
    fillField(root, 'module.title', mod && mod.data.title);
    fillField(root, 'module.order', mod && mod.data.order);
    fillField(root, 'module.lesson_count', total);

    setLabel(root, 'lesson-meta',
      'LESSON ' + pad2((idx + 1) || lesson.data.order) + ' OF ' + pad2(total) + ' · ' + mins + ' MIN');
    setLabel(root, 'module-progress-label', done + ' / ' + total + ' Lessons');
    // Progress fraction markup reused on lesson pages.
    queryTokenAll(root, 'progress-count').forEach(function (el) { el.textContent = String(done); });
    root.querySelectorAll('[data-ms-code="curriculum"] [data-ms-field="course.lesson_count"],[data-ms-code="curriculum"] [data-ms-field="module.lesson_count"]')
      .forEach(function (el) { el.textContent = String(total); });

    var fill = queryToken(root, 'progress-fill');
    if (fill) fill.style.width = pct + '%';
  }

  function paintVideo(root, lesson) {
    var rawUrl = lesson.data && lesson.data.video_url;
    if (!rawUrl) return;

    // Keep raw field available for debugging/simple text bindings.
    fillField(root, 'lesson.video_url', rawUrl);

    // Preferred embed target: iframe/video wrapper on lesson page.
    var playerNodes = queryTokenAll(root, 'video-player');
    var embedUrl = toEmbedUrl(rawUrl);
    playerNodes.forEach(function (el) {
      if (el.tagName === 'IFRAME') {
        el.setAttribute('src', embedUrl || rawUrl);
        el.setAttribute('allowfullscreen', 'true');
      } else if (el.tagName === 'VIDEO') {
        el.setAttribute('src', rawUrl);
        el.setAttribute('controls', 'true');
      } else if (embedUrl) {
        // For Webflow embed divs, inject a real iframe so video actually plays.
        if (!el.style.minHeight) el.style.minHeight = VIDEO_PLAYER_MIN_HEIGHT;
        el.innerHTML = '<iframe src="' + embedUrl + '"'
          + ' frameborder="0"'
          + ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"'
          + ' allowfullscreen'
          + ' style="width:100%;height:100%;border:0;"></iframe>';
        el.setAttribute('data-video-src', embedUrl);
      } else {
        el.setAttribute('data-video-src', rawUrl);
      }
    });

    // Optional CTA/link that should open the current lesson.
    root.querySelectorAll(tokenSelector('watch-lesson') + ',[data-ms-code="detail-link"]')
      .forEach(function (el) { setDetailLink(el, recordId(lesson)); });

    // Optional poster/thumbnail area for the player card.
    var thumbUrl = deriveVideoThumbnail(rawUrl);
    if (thumbUrl) {
      queryTokenAll(root, 'video-thumb').concat(queryTokenAll(root, 'preview-thumb')).forEach(function (el) {
        if (el.tagName === 'IMG') el.setAttribute('src', thumbUrl);
        else {
          el.style.backgroundImage = 'url("' + thumbUrl + '")';
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
        }
      });
    }
  }

  function paintLessonPagination(root, lesson, moduleLessons, data) {
    var i = moduleLessons.findIndex(function (l) { return recordId(l) === recordId(lesson); });
    var prev = i > 0 ? moduleLessons[i - 1] : null;
    var next = i >= 0 && i < moduleLessons.length - 1 ? moduleLessons[i + 1] : null;
    var prevLabel = '← Previous Lesson';
    var nextLabel = 'Next Lesson →';

    // Fall through to the neighbouring module when there's no prev/next in
    // the current one — so the last lesson of a module links to the first
    // lesson of the next module, and vice versa.
    if ((!prev || !next) && data && data.modules && data.lessons) {
      var courseId = idOf(lesson.data.course);
      var courseMods = data.modules
        .filter(function (m) { return idOf(m.data.course) === courseId; })
        .sort(byOrder);
      var modIdx = courseMods.findIndex(function (m) { return recordId(m) === idOf(lesson.data.module); });

      if (!prev && modIdx > 0) {
        var prevModId = recordId(courseMods[modIdx - 1]);
        var prevModLessons = data.lessons
          .filter(function (l) { return idOf(l.data.module) === prevModId; })
          .sort(byOrder);
        if (prevModLessons.length) {
          prev = prevModLessons[prevModLessons.length - 1];
          prevLabel = '← Previous Module';
        }
      }
      if (!next && modIdx !== -1 && modIdx < courseMods.length - 1) {
        var nextModId = recordId(courseMods[modIdx + 1]);
        var nextModLessons = data.lessons
          .filter(function (l) { return idOf(l.data.module) === nextModId; })
          .sort(byOrder);
        if (nextModLessons.length) {
          next = nextModLessons[0];
          nextLabel = 'Next Module →';
        }
      }
    }

    var prevCard = queryToken(root, 'prev-lesson') || queryToken(root, 'prev-module');
    var nextCard = queryToken(root, 'next-lesson') || queryToken(root, 'next-module');

    if (prevCard) {
      if (prev) {
        setDetailLink(prevCard, recordId(prev));
        setLabel(prevCard, 'prev-label', prevLabel);
        fillField(prevCard, 'lesson.title', prev.data.title);
      } else {
        prevCard.removeAttribute('href');
        setLabel(prevCard, 'prev-label', 'Current Lesson');
        fillField(prevCard, 'lesson.title', lesson.data.title);
      }
    }

    if (nextCard) {
      if (next) {
        setDetailLink(nextCard, recordId(next));
        setLabel(nextCard, 'next-label', nextLabel);
        fillField(nextCard, 'lesson.title', next.data.title);
      } else {
        nextCard.removeAttribute('href');
        setLabel(nextCard, 'next-label', 'Current Lesson');
        fillField(nextCard, 'lesson.title', lesson.data.title);
      }
    }
  }

  function paintBreakdown(root, lesson, rows) {
    var ctn = root.querySelector('[data-ms-code="lesson-breakdown"]');
    if (!ctn) return;
    var tpl = ctn.querySelector('[data-ms-code="breakdown-template"]');
    if (!tpl) return;

    clearClones(ctn);
    tpl.style.display = 'none';

    var list = (rows || [])
      .filter(function (r) { return idOf(r.data.lesson) === recordId(lesson); })
      .sort(byOrder);

    list.forEach(function (item) {
      var row = tpl.cloneNode(true);
      row.removeAttribute('data-ms-code');
      row.setAttribute('data-ms-clone', 'true');
      row.style.display = '';
      fillField(row, 'lesson_breakdown.content', item.data.content);
      tpl.parentNode.insertBefore(row, tpl);
    });
  }

  function paintResources(root, lesson, rows) {
    var ctn = root.querySelector('[data-ms-code="resources"]');
    if (!ctn) return;
    var tpl = ctn.querySelector('[data-ms-code="resource-template"]');
    if (!tpl) return;

    clearClones(ctn);
    tpl.style.display = 'none';

    var list = (rows || [])
      .filter(function (r) { return idOf(r.data.lesson) === recordId(lesson); })
      .sort(byOrder);

    setLabel(ctn, 'resources-count', String(list.length) + ' ITEMS');

    list.forEach(function (item) {
      var row = tpl.cloneNode(true);
      row.removeAttribute('data-ms-code');
      row.setAttribute('data-ms-clone', 'true');
      row.style.display = '';
      fillField(row, 'reference.title', item.data.title);
      fillField(row, 'reference.type', item.data.type);
      fillField(row, 'reference.url', item.data.url);
      if (item.data.url) row.setAttribute('href', item.data.url);
      tpl.parentNode.insertBefore(row, tpl);
    });
  }

  function wireMarkComplete(root, lesson, member, ms, progressRows, tables, enrollments) {
    var buttons = queryTokenAll(root, 'mark-complete');
    if (!buttons.length || !member || !ms) return;
    var lessonId = recordId(lesson);
    var courseId = idOf(lesson.data.course);
    var doneState = isDone(lessonId, progressRows || []);
    paintCompletionState(root, doneState);

    // Mark-complete requires an active enrolment for this course. Toggle an
    // optional `data-ms-show-if="enrolled"` variant group (`yes`/`no`) so the
    // design can show an "Enrol to track progress" CTA instead, and hide the
    // mark-complete buttons themselves when the member isn't enrolled.
    var enrolled = (enrollments || []).some(function (e) {
      if (idOf(e.data.course) !== courseId) return false;
      var s = String(e.data.status || 'active').toLowerCase();
      return s !== 'dropped';
    });
    toggleVariants(root, 'enrolled', enrolled ? 'yes' : 'no');
    if (!enrolled) {
      buttons.forEach(function (btn) { btn.style.display = 'none'; });
      return;
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', async function (e) {
        e.preventDefault();
        var now = new Date().toISOString();
        var payloadDone = {
          owner: member.id,
          lesson: lessonId,
          course: idOf(lesson.data.course),
          completed: 1,
          completed_at: now,
          last_watched_at: now
        };
        var payloadTodo = {
          owner: member.id,
          lesson: lessonId,
          course: idOf(lesson.data.course),
          completed: 0,
          completed_at: null,
          last_watched_at: now
        };
        try {
          // Re-read fresh: a lesson-open write (or another tab) may have
          // added a row since page load. Trusting the stale boot snapshot
          // here would create a duplicate instead of updating.
          var fresh = await loadProgressFresh(ms, tables, member.id);
          var existing = fresh.find(function (p) { return idOf(p.data.lesson) === lessonId; }) || null;
          if (existing) {
            await writeWithRetry(function () {
              return ms.updateDataRecord({
                recordId: recordId(existing),
                data: doneState ? payloadTodo : payloadDone
              });
            }, 'mark-complete');
          } else {
            await writeWithRetry(function () {
              return ms.createDataRecord({ table: tables.progress, data: payloadDone });
            }, 'mark-complete');
          }
          doneState = !doneState;
          paintCompletionState(root, doneState);
          window.MSDataCache.invalidate(tables.progress);
          window.location.reload();
        } catch (err) {
          console.error(LABEL + ' mark complete failed', err);
        }
      });
    });
  }

  // Records that the member opened this lesson: creates a lesson_progress
  // row (completed: 0) the first time, or re-stamps last_watched_at on
  // later visits. Re-reads fresh data before any create so it can never
  // insert a second row for the same lesson.
  async function recordLessonOpen(lesson, member, ms, progressRows, tables) {
    if (!lesson || !member || !ms || !window.MSDataCache) return;
    var lessonId = recordId(lesson);
    if (!lessonId) return;

    try {
      var existing = (progressRows || []).find(function (p) {
        return idOf(p.data.lesson) === lessonId;
      }) || null;

      // The boot snapshot can be stale (sessionStorage cache). If it shows
      // no row, re-confirm against fresh data before creating one.
      if (!existing) {
        var fresh = await loadProgressFresh(ms, tables, member.id);
        existing = fresh.find(function (p) { return idOf(p.data.lesson) === lessonId; }) || null;
      }

      var now = new Date().toISOString();

      if (existing) {
        // Row already exists — only re-stamp last_watched_at if it's stale,
        // to avoid an API write on every page load.
        var last = existing.data && existing.data.last_watched_at;
        var recent = last && (Date.now() - new Date(last).getTime()) < LAST_WATCHED_TOUCH_MS;
        if (recent) return;
        await writeWithRetry(function () {
          return ms.updateDataRecord({ recordId: recordId(existing), data: { last_watched_at: now } });
        }, 'lesson-open');
      } else {
        await writeWithRetry(function () {
          return ms.createDataRecord({
            table: tables.progress,
            data: {
              owner: member.id,
              lesson: lessonId,
              course: idOf(lesson.data.course),
              completed: 0,
              completed_at: null,
              last_watched_at: now
            }
          });
        }, 'lesson-open');
      }
      window.MSDataCache.invalidate(tables.progress);
    } catch (err) {
      console.error(LABEL + ' record lesson open failed', err);
    }
  }

  // Fresh, owner-scoped lesson_progress read — bypasses the 30s cache so
  // create-vs-update decisions are made against authoritative data.
  function loadProgressFresh(ms, tables, memberId) {
    window.MSDataCache.invalidate(tables.progress);
    return window.MSDataCache.load(ms, tables.progress, { owner: { equals: memberId } });
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

  function paintCompletionState(root, done) {
    var buttons = queryTokenAll(root, 'mark-complete');
    if (!buttons.length) return;
    buttons.forEach(function (btn) {
      var variant = String(btn.getAttribute('data-ms-show-value') || '');
      var activeState = done ? 'done' : 'todo';
      var isActiveVariant = variant === activeState || !variant;
      btn.setAttribute('aria-disabled', isActiveVariant ? 'false' : 'true');
      btn.classList.toggle('is-disabled', !isActiveVariant);
    });

    // UI copy/icons should be handled by Webflow state variants.
    toggleVariants(root, 'complete', done ? 'done' : 'todo');
  }

  function wireSaveActions(root, lesson, course, member, ms, savedLessons, tables) {
    if (!member || !ms) return;
    var lessonId = recordId(lesson);
    var courseId = course ? recordId(course) : idOf(lesson.data.course);

    var saveLessonBtns = queryTokenAll(root, 'save-lesson');

    var savedLessonRow = (savedLessons || []).find(function (r) { return idOf(r.data.lesson) === lessonId; }) || null;

    paintSaveState(root, 'lesson', !!savedLessonRow);

    saveLessonBtns.forEach(function (saveLessonBtn) {
      saveLessonBtn.addEventListener('click', async function (e) {
        e.preventDefault();
        try {
          if (savedLessonRow) {
            await writeWithRetry(function () {
              return ms.deleteDataRecord({ recordId: recordId(savedLessonRow) });
            }, 'save-lesson');
            savedLessonRow = null;
          } else {
            await writeWithRetry(function () {
              return ms.createDataRecord({
                table: tables.savedLessons,
                data: { owner: member.id, lesson: lessonId, course: courseId, saved_at: new Date().toISOString() }
              });
            }, 'save-lesson');
            var fresh = await window.MSDataCache.load(ms, tables.savedLessons, { owner: { equals: member.id } });
            savedLessonRow = fresh.find(function (r) { return idOf(r.data.lesson) === lessonId; }) || null;
          }
          window.MSDataCache.invalidate(tables.savedLessons);
          paintSaveState(root, 'lesson', !!savedLessonRow);
        } catch (err) {
          console.error(LABEL + ' toggle save lesson failed', err);
        }
      });
    });
  }

  function paintSaveState(root, kind, saved) {
    // UI copy/icons should be handled by Webflow state variants.
    toggleVariants(root, 'save-' + kind, saved ? 'saved' : 'unsaved');
  }

  function wireViewCourse(root, course) {
    if (!course) return;
    queryTokenAll(root, 'view-course').forEach(function (el) {
      setDetailLink(el, recordId(course));
    });
  }

  function paintSidebarCurriculum(root, lesson, mod, moduleLessons, moduleProgress, courseLessons, courseUnlockedIndex) {
    var ctn = root.querySelector('[data-ms-code="curriculum"]');
    if (!ctn) return;
    var tpl = ctn.querySelector('[data-ms-code="lesson-template"]');
    if (!tpl) return;

    clearClones(ctn);
    tpl.style.display = 'none';

    // module title link in sidebar header
    var moduleLink = queryToken(ctn, 'module-link');
    if (moduleLink && mod) setDetailLink(moduleLink, recordId(mod));
    fillField(ctn, 'module.title', mod && mod.data.title);

    // Lock is computed against the full course order, not just this module —
    // so a Module 2 row stays locked while any earlier lesson is incomplete.
    moduleLessons.forEach(function (l) {
      var row = tpl.cloneNode(true);
      row.removeAttribute('data-ms-code');
      row.setAttribute('data-ms-clone', 'true');
      row.style.display = '';

      var done = isDone(recordId(l), moduleProgress);
      var viewing = recordId(l) === recordId(lesson);
      var courseIdx = (courseLessons || []).findIndex(function (cl) { return cl.id === recordId(l); });
      // "active" = the resume lesson (course-wide first incomplete), so the
      // purple play icon marks where to continue — independent of which page
      // is open. "viewing" is tracked separately below.
      var isActive = !done && courseUnlockedIndex !== -1 && courseIdx === courseUnlockedIndex;
      var locked = !done && !viewing && courseUnlockedIndex !== -1 && courseIdx > courseUnlockedIndex;

      fillField(row, 'lesson.title', l.data.title);
      fillField(row, 'lesson.order', l.data.order);
      fillField(row, 'lesson.duration_minutes', l.data.duration_minutes || 0);

      var status = done ? 'done' : (isActive ? 'active' : (locked ? 'locked' : 'todo'));
      if (status === 'locked' && !row.querySelector('[data-ms-show-if="status"][data-ms-show-value="locked"]')) {
        status = 'todo';
      }
      // Expose the row's status as a data attribute so the whole row can be
      // styled in Webflow with a selector like `.lesson_item[data-status="active"]`.
      row.setAttribute('data-status', status);
      toggleVariants(row, 'status', status);

      // Mark the lesson whose page is currently open — independent of status,
      // so the row the member is viewing can get its own highlight (e.g. a
      // darker background) via `.lesson_item[data-current="true"]`. Also drives
      // an optional `data-ms-show-if="current"` (yes/no) variant group.
      if (viewing) row.setAttribute('data-current', 'true');
      toggleVariants(row, 'current', viewing ? 'yes' : 'no');

      if (locked) {
        row.removeAttribute('href');
        row.setAttribute('aria-disabled', 'true');
      } else {
        row.removeAttribute('aria-disabled');
        setDetailLink(row, recordId(l));
      }

      tpl.parentNode.insertBefore(row, tpl);
    });
  }

  function findLesson(lessons, id, slug) {
    if (id) {
      var hit = lessons.find(function (l) { return recordId(l) === id; });
      if (hit) return hit;
    }
    if (slug) {
      var bySlug = lessons.find(function (l) { return l.data && l.data.slug === slug; });
      if (bySlug) return bySlug;
    }
    return null;
  }

  function toEmbedUrl(url) {
    if (!url || typeof url !== 'string') return null;
    var u;
    try { u = new URL(url); } catch (e) { return null; }
    var host = (u.hostname || '').toLowerCase();

    if (host.indexOf('youtube.com') !== -1 || host.indexOf('youtu.be') !== -1) {
      var yt = youtubeId(u);
      return yt ? 'https://www.youtube.com/embed/' + yt : null;
    }
    if (host.indexOf('vimeo.com') !== -1) {
      var vm = vimeoId(u);
      return vm ? 'https://player.vimeo.com/video/' + vm : null;
    }
    return null;
  }

  function deriveVideoThumbnail(url) {
    if (!url || typeof url !== 'string') return null;
    var u;
    try { u = new URL(url); } catch (e) { return null; }
    var host = (u.hostname || '').toLowerCase();
    if (host.indexOf('youtube.com') !== -1 || host.indexOf('youtu.be') !== -1) {
      var yt = youtubeId(u);
      return yt ? 'https://i.ytimg.com/vi/' + yt + '/hqdefault.jpg' : null;
    }
    if (host.indexOf('vimeo.com') !== -1) {
      var vm = vimeoId(u);
      return vm ? 'https://vumbnail.com/' + vm + '.jpg' : null;
    }
    return null;
  }

  function youtubeId(u) {
    if (!u) return null;
    var host = (u.hostname || '').toLowerCase();
    if (host.indexOf('youtu.be') !== -1) {
      var shortId = (u.pathname || '').replace(/^\/+/, '').split('/')[0];
      return shortId || null;
    }
    var q = u.searchParams.get('v');
    if (q) return q;
    var parts = (u.pathname || '').split('/').filter(Boolean);
    var e = parts.indexOf('embed');
    if (e !== -1 && parts[e + 1]) return parts[e + 1];
    return null;
  }

  function vimeoId(u) {
    if (!u) return null;
    var parts = (u.pathname || '').split('/').filter(Boolean);
    for (var i = parts.length - 1; i >= 0; i--) {
      if (/^\d+$/.test(parts[i])) return parts[i];
    }
    return null;
  }

  function firstIncompleteIndex(lessons, progress) {
    for (var i = 0; i < lessons.length; i++) {
      if (!isDone(recordId(lessons[i]), progress)) return i;
    }
    return -1;
  }

  function isDone(lessonId, progress) {
    var rec = progress.find(function (p) { return idOf(p.data.lesson) === lessonId; });
    return !!(rec && (rec.data.completed | 0) === 1);
  }

  function fillField(scope, key, value) {
    if (value == null || value === '') return;
    scope.querySelectorAll('[data-ms-field="' + key + '"]').forEach(function (el) { el.textContent = value; });
  }

  function setLabel(scope, key, value) {
    if (value == null) return;
    queryTokenAll(scope, key).forEach(function (el) { el.textContent = value; });
  }

  function toggleVariants(scope, attr, value) {
    scope.querySelectorAll('[data-ms-show-if="' + attr + '"]').forEach(function (el) {
      el.style.display = el.getAttribute('data-ms-show-value') === String(value) ? '' : 'none';
    });
  }

  function setDetailLink(el, recId) {
    if (!el || !recId) return;
    var page = el.getAttribute('ms-code-detail-page');
    if (!page) return;
    var param = el.getAttribute('ms-code-id-param') || 'id';
    el.setAttribute('href', page + '?' + param + '=' + recId);
  }

  function clearClones(scope) {
    scope.querySelectorAll('[data-ms-clone="true"]').forEach(function (n) { n.parentNode.removeChild(n); });
  }


  function tableConfig(root) {
    return {
      course: root.getAttribute('ms-code-table-course') || 'courses',
      module: root.getAttribute('ms-code-table-module') || 'modules',
      lesson: root.getAttribute('ms-code-table-lesson') || 'lessons',
      progress: root.getAttribute('ms-code-table-progress') || 'lesson_progress',
      savedLessons: root.getAttribute('ms-code-table-saved-lessons') || 'saved_lessons',
      breakdown: root.getAttribute('ms-code-table-breakdown') || 'lesson_breakdown',
      reference: root.getAttribute('ms-code-table-reference') || 'reference',
      enrollment: root.getAttribute('ms-code-table-enrollment') || 'enrollments'
    };
  }

  function tokenSelector(token) {
    return '[data-ms-code="' + token + '"]';
  }

  // Update the tab title (and meta description) once the lesson resolves.
  // Optional `ms-code-title-suffix` on the page wrapper appends a brand suffix.
  function applyPageMeta(root, title, description) {
    if (title) {
      var suffix = root && root.getAttribute('ms-code-title-suffix');
      document.title = suffix ? (title + ' · ' + suffix) : title;
    }
    if (description) {
      var meta = document.head.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', String(description).slice(0, 320));
    }
  }

  function queryToken(scope, token) {
    return scope ? scope.querySelector(tokenSelector(token)) : null;
  }

  function queryTokenAll(scope, token) {
    return scope ? Array.prototype.slice.call(scope.querySelectorAll(tokenSelector(token))) : [];
  }

  function idOf(ref) {
    if (!ref) return null;
    if (typeof ref === 'string') return ref;
    if (Array.isArray(ref)) return idOf(ref[0]);
    if (typeof ref === 'object') return ref.id || ref._id || null;
    return null;
  }

  function recordId(rec) {
    if (!rec) return null;
    return rec.id || rec._id || rec.recordId || null;
  }

  function byOrder(a, b) { return (a.data.order || 0) - (b.data.order || 0); }
  function pad2(n) { var x = parseInt(n, 10); return isNaN(x) ? String(n || '') : (x < 10 ? '0' + x : String(x)); }
  function getUrlParam(name) { try { return new URL(window.location.href).searchParams.get(name); } catch (e) { return null; } }
})();
</script>
