/* Cloud sync — persists all app data to a JSON file committed in this repo so
   the same lists are retrievable on any device that opens the app.
   Reads are public (raw GitHub); writes need a GitHub token with repo scope,
   entered once and kept in localStorage.

   Conflict resolution is a NON-DESTRUCTIVE MERGE rather than whole-document
   "newest write wins". The blob bundles four independent tables (catalog,
   saved lists, month history, the working list); a single document-level
   timestamp can't tell which table actually changed, so blindly adopting (or
   pushing) the whole blob silently destroys entries the other side never saw.
   Instead we union the keyed tables — an entry present on either side is never
   dropped — and only fall back to last-write-wins where a value is genuinely
   singular (the in-progress working list) or two devices edited the very same
   key. Convergence is driven by content equality, not the timestamp, so equal
   stamps with different content can no longer stall.

   Known, deliberate tradeoffs (both safer than losing data):
     • a list deleted on one device can be resurrected by another that still
       holds it — union never deletes;
     • concurrent edits to the same `gp_current` working list still LWW. */
(function (GP) {
  'use strict';

  // Data lives on its own branch so frequent autosaves never touch the
  // protected `main` history (which is reserved for code, merged via PRs).
  const OWNER = 'piyalgupta', REPO = 'grocery', BRANCH = 'gp-data';
  const PATH = 'data/grocery-data.json';
  const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;
  const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${PATH}`;
  const KEYS = ['gp_catalog', 'gp_lists', 'gp_months', 'gp_current'];

  let sha = null; // cached blob sha for the next commit

  const token = () => localStorage.getItem('gp_gh_token') || '';
  const stamp = () => +localStorage.getItem('gp_updatedAt') || 0;
  const setStamp = (n) => localStorage.setItem('gp_updatedAt', String(n));
  const b64 = (s) => btoa(unescape(encodeURIComponent(s)));
  const unb64 = (s) => decodeURIComponent(escape(atob(s)));

  function headers() {
    const h = { Accept: 'application/vnd.github+json' };
    if (token()) h.Authorization = 'Bearer ' + token();
    return h;
  }

  /* ---- table (de)serialization ---- */

  /** Read the four localStorage tables into a plain object. */
  function localTables() {
    const t = {};
    KEYS.forEach((k) => { try { t[k] = JSON.parse(localStorage.getItem(k)); } catch { t[k] = null; } });
    return t;
  }

  /** Write a merged set of tables back into localStorage. */
  function writeTables(t) {
    KEYS.forEach((k) => { if (k in t) localStorage.setItem(k, JSON.stringify(t[k] ?? null)); });
  }

  /** Pull just the four tables out of a decoded cloud blob. */
  function tablesOf(blob) {
    const t = {};
    KEYS.forEach((k) => { t[k] = (blob && k in blob) ? blob[k] : null; });
    return t;
  }

  /** Order-independent serialization, so equality ignores object key order. */
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
    }
    return JSON.stringify(v) ?? 'null';
  }
  const eqTables = (a, b) => KEYS.every((k) => stable(a[k] ?? null) === stable(b[k] ?? null));

  /* ---- merge ---- */

  /** Union two keyed maps. Keys on either side survive; for keys in both,
      `pick(localVal, remoteVal)` chooses the winner. */
  function unionMap(local, remote, pick) {
    const out = { ...(remote || {}) };
    Object.keys(local || {}).forEach((k) => {
      out[k] = (k in out) ? pick(local[k], out[k]) : local[k];
    });
    return out;
  }

  /** Non-destructive merge of local and remote tables.
      `localNewer` is the overall last-write-wins tie-breaker. */
  function merge(local, remote, localNewer) {
    const newer = (l, r) => (localNewer ? l : r);
    return {
      // Learned prices/units: union by item name, LWW on a clash.
      gp_catalog: unionMap(local.gp_catalog, remote.gp_catalog, newer),
      // Saved lists carry their own savedAt — prefer the more recently saved copy.
      gp_lists: unionMap(local.gp_lists, remote.gp_lists, (l, r) => {
        const ls = (l && l.savedAt) || '', rs = (r && r.savedAt) || '';
        if (ls !== rs) return ls > rs ? l : r;
        return newer(l, r);
      }),
      // Month history: union by 'YYYY-MM', LWW on a clash.
      gp_months: unionMap(local.gp_months, remote.gp_months, newer),
      // The single in-progress working list: nothing to union — last write wins.
      gp_current: localNewer ? (local.gp_current ?? remote.gp_current)
                             : (remote.gp_current ?? local.gp_current)
    };
  }

  /* ---- transport ---- */

  /** Adopt the public raw copy, merging (not clobbering) into local. Returns
      true if local data changed. Used by read-only devices (no token). */
  async function pull() {
    try {
      const r = await fetch(RAW + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return false;
      return reconcile(await r.json(), null, false) !== false;
    } catch { return false; }
  }

  /** Read the contents blob — gives both the sha (needed to commit) and the
      decoded payload (needed to merge) in one request. */
  async function fetchRemote() {
    try {
      const r = await fetch(API + '?ref=' + BRANCH + '&t=' + Date.now(), { headers: headers(), cache: 'no-store' });
      if (!r.ok) return { sha: null, data: null };
      const j = await r.json();
      let data = null;
      try { data = JSON.parse(unb64(j.content || '')); } catch { /* empty/invalid blob */ }
      return { sha: j.sha || null, data };
    } catch { return { sha: null, data: null }; }
  }

  /** PUT a merged set of tables to the repo. Returns 'ok', 'retry' (sha race)
      or false (failure). */
  async function commit(tables, ts) {
    const payload = { updatedAt: ts };
    KEYS.forEach((k) => { payload[k] = tables[k] ?? null; });
    const body = { message: 'Update grocery data', content: b64(JSON.stringify(payload, null, 2)), branch: BRANCH };
    if (sha) body.sha = sha;
    try {
      const r = await fetch(API, { method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { sha = (await r.json()).content.sha; return 'ok'; }
      if (r.status === 409 || r.status === 422) return 'retry';
      return false;
    } catch { return false; }
  }

  /** Reconcile local state against a decoded cloud blob.
      Returns 'pushed' (cloud updated), 'pulled' (local changed) or false
      (already converged / failure). `canPush` allows writing to the cloud. */
  async function reconcile(remoteBlob, remoteSha, canPush, retried) {
    if (remoteSha !== null) sha = remoteSha;
    const local = localTables();
    const ls = stamp();

    // No cloud blob yet (empty branch / first run): only a token holder can seed it.
    if (!remoteBlob) {
      if (!canPush) return false;
      const ts = ls || Date.now();
      const res = await commit(local, ts);
      if (res === 'retry' && !retried) { const r = await fetchRemote(); return reconcile(r.data, r.sha, true, true); }
      if (res === 'ok') { setStamp(ts); return 'pushed'; }
      return false;
    }

    const remote = tablesOf(remoteBlob);
    const rs = +remoteBlob.updatedAt || 0;
    const merged = merge(local, remote, ls > rs);
    const cloudChanged = !eqTables(merged, remote);
    const localChanged = !eqTables(merged, local);

    if (!cloudChanged && !localChanged) return false; // already converged

    // Cloud is missing something we hold — push the union (never the raw local
    // blob, which would clobber remote-only entries).
    if (cloudChanged && canPush) {
      const ts = Date.now();
      const res = await commit(merged, ts);
      if (res === 'retry' && !retried) { const r = await fetchRemote(); return reconcile(r.data, r.sha, true, true); }
      if (res === 'ok') { writeTables(merged); setStamp(ts); return localChanged ? 'pulled' : 'pushed'; }
      // Push failed: still adopt the merge locally so no remote data is lost;
      // the next reconcile re-attempts propagating our additions.
      writeTables(merged); setStamp(Math.max(ls, rs));
      return localChanged ? 'pulled' : false;
    }

    // Read-only device, or our copy was simply behind: adopt the merge locally.
    writeTables(merged);
    setStamp(cloudChanged ? Math.max(ls, rs) : rs);
    return localChanged ? 'pulled' : false;
  }

  /** Commit the current snapshot back to the repo, merging with the cloud copy
      first. Needs a token. Returns 'pushed' on a successful write, 'pulled'
      when a newer/extra cloud copy was merged in locally, or false on
      no-op / failure. */
  async function push() {
    if (!token()) return false;
    const remote = await fetchRemote();
    return reconcile(remote.data, remote.sha, true, false);
  }

  GP.sync = {
    pull,
    push,
    hasToken: () => !!token(),
    setToken: (t) => localStorage.setItem('gp_gh_token', t)
  };
})(window.GP = window.GP || {});
