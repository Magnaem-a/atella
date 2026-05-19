<!-- 💙 Script v0.1 💙 MS DATA CACHE — SHARED MEMBERSTACK DATA RECORDS CACHE -->
<!-- Load this BEFORE any dashboard-* script. Exposes window.MSDataCache. -->
<script>
(function () {
  'use strict';

  if (window.MSDataCache) return;

  var CONFIG = {
    PAGE_SIZE: 100,
    TTL_MS: 30000,
    MAX_RETRIES: 4,
    BASE_BACKOFF_MS: 750,
    MAX_BACKOFF_MS: 8000,
    STORAGE_PREFIX: 'ms-data-cache:',
    STORAGE_ENABLED: true,
    WRITE_CONCURRENCY: 4
  };

  var inflight = Object.create(null);
  var memberPromise = null;

  function keyFor(table, where) {
    return table + ':' + (where ? JSON.stringify(where) : 'all');
  }

  function readSession(key) {
    if (!CONFIG.STORAGE_ENABLED) return null;
    try {
      var raw = sessionStorage.getItem(CONFIG.STORAGE_PREFIX + key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.ts !== 'number') return null;
      if (Date.now() - parsed.ts > CONFIG.TTL_MS) return null;
      return parsed.records || null;
    } catch (e) { return null; }
  }

  function writeSession(key, records) {
    if (!CONFIG.STORAGE_ENABLED) return;
    try {
      sessionStorage.setItem(CONFIG.STORAGE_PREFIX + key, JSON.stringify({
        ts: Date.now(),
        records: records
      }));
    } catch (e) {  }
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function backoffMs(attempt, retryAfterSec) {
    if (retryAfterSec && !isNaN(retryAfterSec)) {
      return Math.min(retryAfterSec * 1000, CONFIG.MAX_BACKOFF_MS);
    }
    var base = Math.min(CONFIG.BASE_BACKOFF_MS * Math.pow(2, attempt), CONFIG.MAX_BACKOFF_MS);
    return base + Math.floor(Math.random() * 250);
  }

  function isRateLimited(err) {
    if (!err) return false;
    var status = err.status || err.statusCode || (err.response && err.response.status);
    if (status === 429) return true;
    var msg = (err.message || '').toLowerCase();
    return msg.indexOf('429') !== -1 || msg.indexOf('rate') !== -1 || msg.indexOf('too many') !== -1;
  }

  function retryAfterFromError(err) {
    if (!err) return null;
    var headers = (err.response && err.response.headers) || err.headers;
    if (!headers) return null;
    try {
      var v = typeof headers.get === 'function' ? headers.get('retry-after') : headers['retry-after'];
      var n = parseFloat(v);
      return isNaN(n) ? null : n;
    } catch (e) { return null; }
  }

  async function withRetry(fn, label) {
    var attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err) {
        if (!isRateLimited(err) || attempt >= CONFIG.MAX_RETRIES) throw err;
        var wait = backoffMs(attempt, retryAfterFromError(err));
        console.warn('[ms-data-cache] ' + (label || 'request') + ' rate-limited, retrying in ' + wait + 'ms (attempt ' + (attempt + 1) + ')');
        await delay(wait);
        attempt++;
      }
    }
  }

  async function fetchAllPages(ms, table, where) {
    var all = [], skip = 0, page = [];
    do {
      var q = { take: CONFIG.PAGE_SIZE, skip: skip };
      if (where) q.where = where;
      var r = await withRetry(function () {
        return ms.queryDataRecords({ table: table, query: q });
      }, 'queryDataRecords:' + table);
      page = (r && r.data && r.data.records) || [];
      all.push.apply(all, page);
      skip += page.length;
    } while (page.length === CONFIG.PAGE_SIZE);
    return all;
  }

  function load(ms, table, where) {
    if (!ms) return Promise.reject(new Error('memberstack not ready'));
    var key = keyFor(table, where);

    if (inflight[key]) return inflight[key];

    var cached = readSession(key);
    if (cached) {
      inflight[key] = Promise.resolve(cached);
      return inflight[key];
    }

    inflight[key] = fetchAllPages(ms, table, where)
      .then(function (records) {
        writeSession(key, records);
        return records;
      })
      .catch(function (err) {
        delete inflight[key];
        throw err;
      });

    return inflight[key];
  }

  function getMember(ms) {
    if (!ms) return Promise.reject(new Error('memberstack not ready'));
    if (memberPromise) return memberPromise;
    memberPromise = withRetry(function () {
      return ms.getCurrentMember();
    }, 'getCurrentMember').then(function (res) {
      return (res && (res.data || res)) || null;
    }).catch(function (err) {
      memberPromise = null;
      throw err;
    });
    return memberPromise;
  }

  function invalidate(table) {
    Object.keys(inflight).forEach(function (k) {
      if (!table || k.indexOf(table + ':') === 0) delete inflight[k];
    });
    if (!CONFIG.STORAGE_ENABLED) return;
    try {
      var prefix = CONFIG.STORAGE_PREFIX + (table ? (table + ':') : '');
      Object.keys(sessionStorage).forEach(function (k) {
        if (k.indexOf(prefix) === 0) sessionStorage.removeItem(k);
      });
    } catch (e) {  }
  }

  // ============= WRITE QUEUE =============
  // Run a list of write thunks with bounded concurrency. Each thunk goes
  // through withRetry so 429s back off instead of failing the batch.
  //
  //   var jobs = rows.map(function (r) {
  //     return function () { return ms.deleteDataRecord({ table: 'x', id: r.id }); };
  //   });
  //   var res = await window.MSDataCache.runWrites(jobs, { label: 'reset' });
  //   res.failures   // number of jobs that exhausted retries
  //   res.results    // array (one entry per job): value or { error }
  //
  // Notes:
  //   * Pass *thunks* (zero-arg functions returning a Promise), not already
  //     in-flight promises — withRetry needs to be able to call again.
  //   * Default concurrency is CONFIG.WRITE_CONCURRENCY (4). Override via
  //     options.concurrency.
  //   * stopOnError: true throws the first error and abandons the rest.
  async function runWrites(jobs, options) {
    options = options || {};
    if (!Array.isArray(jobs) || jobs.length === 0) return { results: [], failures: 0 };

    var concurrency = Math.max(1, options.concurrency || CONFIG.WRITE_CONCURRENCY);
    var label = options.label || 'write';
    var stopOnError = !!options.stopOnError;
    var results = new Array(jobs.length);
    var failures = 0;
    var cursor = 0;
    var aborted = false;
    var firstError = null;

    async function worker() {
      while (!aborted && cursor < jobs.length) {
        var idx = cursor++;
        var thunk = jobs[idx];
        if (typeof thunk !== 'function') {
          results[idx] = { error: new Error('runWrites: job ' + idx + ' is not a function') };
          failures++;
          continue;
        }
        try {
          results[idx] = await withRetry(thunk, label + '[' + idx + ']');
        } catch (err) {
          failures++;
          results[idx] = { error: err };
          if (stopOnError) {
            firstError = err;
            aborted = true;
            return;
          }
        }
      }
    }

    var workers = [];
    var n = Math.min(concurrency, jobs.length);
    for (var w = 0; w < n; w++) workers.push(worker());
    await Promise.all(workers);

    if (stopOnError && firstError) throw firstError;
    return { results: results, failures: failures };
  }

  function configure(overrides) {
    if (!overrides) return CONFIG;
    Object.keys(overrides).forEach(function (k) {
      if (k in CONFIG) CONFIG[k] = overrides[k];
    });
    return CONFIG;
  }

  window.MSDataCache = {
    load: load,
    getMember: getMember,
    invalidate: invalidate,
    runWrites: runWrites,
    configure: configure,
    _config: CONFIG
  };
})();
</script>