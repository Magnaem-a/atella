<!-- 💙 Script v0.1 💙 NAV COURSE DROPDOWN -->
<script>
(function () {
  'use strict';

  var ROOT_SELECTOR = '[data-ms-code="nav-courses"]';
  var TEMPLATE_SELECTOR = '[data-ms-code="list-template"]';

  document.addEventListener('DOMContentLoaded', function () { boot(); });

  async function boot() {
    if (!window.$memberstackDom) return;

    var root = document.querySelector(ROOT_SELECTOR);
    if (!root) return;

    var table = root.getAttribute('ms-code-table') || 'courses';
    var perPage = parseInt(root.getAttribute('ms-code-per-page'), 10) || 0;

    try {
      var ms = window.$memberstackDom;
      var courses = await loadAll(ms, table);
      courses.sort(byOrderAsc);
      if (perPage > 0) courses = courses.slice(0, perPage);
      paintGrid(root, courses);
    } catch (err) {
      console.error('[nav-courses] boot failed', err);
    }
  }

  async function loadAll(ms, table) {
    if (window.MSDataCache && typeof window.MSDataCache.load === 'function') {
      return window.MSDataCache.load(ms, table, null);
    }
    var all = [];
    var offset = 0;
    var limit = 100;
    while (true) {
      var res = await ms.getData({ dataTableId: table, limit: limit, offset: offset });
      var rows = res && res.data ? res.data : [];
      all = all.concat(rows);
      if (rows.length < limit) break;
      offset += limit;
    }
    return all;
  }

  function paintGrid(root, courses) {
    var tpl = root.querySelector(TEMPLATE_SELECTOR);
    if (!tpl) return;

    clearClones(root);
    tpl.style.display = 'none';

    courses.forEach(function (course) {
      var card = tpl.cloneNode(true);
      card.removeAttribute('data-ms-code');
      card.setAttribute('data-ms-clone', 'true');
      card.style.display = '';

      var d = course.data || {};

      var img = card.querySelector('[data-ms-field="cover_image"]');
      if (img && d.cover_image) img.setAttribute('src', d.cover_image);

      setText(card, '[data-ms-field="title"]', d.title);
      setText(card, '[data-ms-field="description"]', d.description);
      setText(card, '[data-ms-field="category"]', d.category);
      setText(card, '[data-ms-code="lesson-count"]', formatCount(d.lesson_count, 'Lesson'));
      setText(card, '[data-ms-code="hours-estimate"]', formatHours(d.hours_estimate));

      var page = tpl.getAttribute('ms-code-detail-page') || '/course';
      var param = tpl.getAttribute('ms-code-id-param') || 'id';
      card.setAttribute('href', page + '?' + param + '=' + course.id);

      root.insertBefore(card, tpl);
    });
  }

  function formatCount(n, label) {
    var num = parseInt(n, 10) || 0;
    return num + ' ' + label + (num === 1 ? '' : 's');
  }

  function formatHours(val) {
    if (!val) return '';
    var n = parseFloat(val);
    if (isNaN(n)) return val;
    return n + ' Hour' + (n === 1 ? '' : 's');
  }

  function setText(root, sel, value) {
    if (value == null || value === '') return;
    var el = root.querySelector(sel);
    if (el) el.textContent = String(value);
  }

  function clearClones(root) {
    root.querySelectorAll('[data-ms-clone="true"]').forEach(function (n) { n.remove(); });
  }

  function byOrderAsc(a, b) {
    return (Number(a.data && a.data.order || 0)) - (Number(b.data && b.data.order || 0));
  }
})();
</script>
