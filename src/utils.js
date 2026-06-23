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

  GP.utils = { $, read, write, money, uid, ucFirst };
})(window.GP = window.GP || {});
