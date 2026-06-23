/* Cloud sync — persists all app data to a JSON file committed in this repo so
   the same lists are retrievable on any device that opens the app.
   Reads are public (raw GitHub); writes need a GitHub token with repo scope,
   entered once and kept in localStorage. "Newest write wins" via updatedAt. */
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
  const b64 = (s) => btoa(unescape(encodeURIComponent(s)));

  function headers() {
    const h = { Accept: 'application/vnd.github+json' };
    if (token()) h.Authorization = 'Bearer ' + token();
    return h;
  }

  /** Bundle every localStorage table into one payload. */
  function snapshot() {
    const data = { updatedAt: stamp() };
    KEYS.forEach((k) => { try { data[k] = JSON.parse(localStorage.getItem(k)); } catch { /* skip */ } });
    return data;
  }

  /** Adopt the remote copy if it is newer than the local one. Returns true if applied. */
  async function pull() {
    try {
      const r = await fetch(RAW + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return false;
      const data = await r.json();
      if (!data || !(data.updatedAt > stamp())) return false;
      KEYS.forEach((k) => { if (k in data) localStorage.setItem(k, JSON.stringify(data[k])); });
      localStorage.setItem('gp_updatedAt', data.updatedAt);
      return true;
    } catch { return false; }
  }

  async function fetchSha() {
    try {
      const r = await fetch(API + '?ref=' + BRANCH + '&t=' + Date.now(), { headers: headers(), cache: 'no-store' });
      sha = r.ok ? (await r.json()).sha : null;
    } catch { sha = null; }
  }

  /** Commit the current snapshot back to the repo. Needs a token. */
  async function push(_retried) {
    if (!token()) return false;
    if (sha === null) await fetchSha();
    const body = { message: 'Update grocery data', content: b64(JSON.stringify(snapshot(), null, 2)), branch: BRANCH };
    if (sha) body.sha = sha;
    try {
      const r = await fetch(API, { method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { sha = (await r.json()).content.sha; return true; }
      if (!_retried && (r.status === 409 || r.status === 422)) { await fetchSha(); return push(true); }
      return false;
    } catch { return false; }
  }

  GP.sync = {
    pull,
    push,
    hasToken: () => !!token(),
    setToken: (t) => localStorage.setItem('gp_gh_token', t)
  };
})(window.GP = window.GP || {});
