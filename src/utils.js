/* Generic, reusable helpers: DOM lookup, storage primitives, formatting.
   No app state lives here. */
(function (GP) {
  'use strict';

  /** Query a single element. */
  const $ = (selector) => document.querySelector(selector);

  /** Safely read & JSON-parse a localStorage key, falling back on missing/corrupt data. */
  const read = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };

  /** Serialize & persist a value to localStorage. */
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  /** Format a number as Indian-rupee currency, rounded to 2 decimals. */
  const money = (n) => '₹' + (Math.round((+n || 0) * 100) / 100).toLocaleString('en-IN');

  /** Short, collision-unlikely id for list items. */
  const uid = () => Math.random().toString(36).slice(2, 9);

  /** Title-case each word (e.g. "toor dal" -> "Toor Dal"). */
  const ucFirst = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

  /** Escape user-supplied text for safe interpolation into innerHTML. */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /** 'YYYY-MM' -> compact "Jun '26" (for chart ticks / chips). */
  const monthLabel = (m) => {
    const [y, mo] = String(m).split('-');
    return (MONTHS_SHORT[(+mo) - 1] || m) + " '" + String(y).slice(2);
  };

  /** 'YYYY-MM' -> full "June 2026" (for headings). */
  const monthLong = (m) => {
    const [y, mo] = String(m).split('-');
    return (MONTHS_LONG[(+mo) - 1] || m) + ' ' + y;
  };

  GP.utils = { $, read, write, money, uid, ucFirst, esc, monthLabel, monthLong };
})(window.GP = window.GP || {});
