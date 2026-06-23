/* Cloud sync — persists all app data to a JSON file committed in this repo so
   the same lists are retrievable on any device that opens the app.
   Reads are public (raw GitHub); writes need a GitHub token with repo scope,
   entered once and kept in localStorage. "Newest write wins" via updatedAt:
   a push never clobbers a cloud copy that is newer than the local one — it
   adopts that copy instead, so an idle/stale tab can't overwrite fresh data
   saved on another device. */
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
  const unb64 = (s) => decodeURIComponent(escape(atob(s)));

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

  /** Write a remote payload into localStorage iff it is newer. Returns true if applied. */
  function adopt(data) {
    if (!data || !(+data.updatedAt > stamp())) return false;
    KEYS.forEach((k) => { if (k in data) localStorage.setItem(k, JSON.stringify(data[k])); });
    localStorage.setItem('gp_updatedAt', data.updatedAt);
    return true;
  }

  /** Adopt the public raw copy if it is newer than the local one. Returns true if applied. */
  async function pull() {
    try {
      const r = await fetch(RAW + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return false;
      return adopt(await r.json());
    } catch { return false; }
  }

  /** Read the contents blob — gives both the sha (needed to commit) and the
      decoded payload (needed to compare timestamps) in one request. */
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

  /** Commit the current snapshot back to the repo. Needs a token.
      Returns 'pushed' on a successful write, 'pulled' when the cloud copy was
      newer and got adopted locally instead, or false on no-op / failure. */
  async function push(_retried) {
    if (!token()) return false;
    const remote = await fetchRemote();
    sha = remote.sha;
    if (remote.data) {
      const rs = +remote.data.updatedAt || 0;
      // Newest write wins: take a more recent cloud copy rather than clobber it.
      if (rs > stamp()) return adopt(remote.data) ? 'pulled' : false;
      // Already in sync — skip a needless commit.
      if (rs === stamp()) return false;
    }
    const body = { message: 'Update grocery data', content: b64(JSON.stringify(snapshot(), null, 2)), branch: BRANCH };
    if (sha) body.sha = sha;
    try {
      const r = await fetch(API, { method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { sha = (await r.json()).content.sha; return 'pushed'; }
      if (!_retried && (r.status === 409 || r.status === 422)) return push(true);
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
