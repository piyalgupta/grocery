/* Pure domain logic for the dashboard: totals, aggregation, suggestions.
   No DOM, no storage — easy to reason about and to unit-test. */
(function (GP) {
  'use strict';

  /** Sum of qty × price across a list's items. The app's single "total" formula. */
  function listTotal(items) {
    return items.reduce((sum, i) => sum + (i.qty || 0) * (i.price || 0), 0);
  }

  /**
   * Roll up every saved list into three views:
   *   byCat   - spend per category
   *   byMonth - spend per month
   *   byItem  - { qty, val, unit, months:Set } per item name
   */
  function aggregate(lists) {
    const byCat = {}, byMonth = {}, byItem = {};
    Object.values(lists).forEach((list) => {
      list.items.forEach((i) => {
        const value = (i.qty || 0) * (i.price || 0);
        byCat[i.category] = (byCat[i.category] || 0) + value;
        byMonth[list.month] = (byMonth[list.month] || 0) + value;
        const entry = (byItem[i.name] = byItem[i.name] || { qty: 0, val: 0, unit: i.unit, months: new Set() });
        entry.qty += i.qty || 0;
        entry.val += value;
        entry.months.add(list.month);
      });
    });
    return { byCat, byMonth, byItem };
  }

  /**
   * Build optimization suggestions from an aggregate.
   * Returns { empty, items } where `empty` means there's no saved history yet.
   * Each item is { icon, good, text }: `icon` names a glyph in constants.ICONS
   * and `good` flags positive tips (the view styles them differently).
   */
  function suggestions(lists, agg) {
    const all = Object.values(lists);
    const { money } = GP.utils;
    const out = [];

    if (all.length === 0) {
      out.push({ icon: 'trendingUp', good: true, text: 'Save a few monthly lists to unlock consumption insights and savings tips.' });
      return { empty: true, items: out };
    }

    const { byItem, byMonth } = agg;
    const months = Object.keys(byMonth).sort();

    // 1) frequently repeated items -> bulk buy (top 2 by spend)
    Object.entries(byItem)
      .filter(([, d]) => d.months.size >= 3)
      .sort((a, b) => b[1].val - a[1].val)
      .slice(0, 2)
      .forEach(([name, d]) =>
        out.push({ icon: 'repeat', good: false, text: `${name} bought in ${d.months.size} months — consider buying in bulk to cut cost.` }));

    // 2) month-over-month spend change
    if (months.length >= 2) {
      const prev = byMonth[months[months.length - 2]];
      const last = byMonth[months[months.length - 1]];
      const diff = last - prev;
      const pct = prev ? Math.round((diff / prev) * 100) : 0;
      if (diff > 0) out.push({ icon: 'trendingUp', good: false, text: `Spend rose ${pct}% (${money(diff)}) vs previous month — review high-cost categories.` });
      else if (diff < 0) out.push({ icon: 'check', good: true, text: `Spend dropped ${Math.abs(pct)}% (${money(-diff)}) vs last month — keep it up.` });
    }

    // 3) biggest spend item
    const topVal = Object.entries(byItem).sort((a, b) => b[1].val - a[1].val)[0];
    if (topVal) out.push({ icon: 'wallet', good: false, text: `${topVal[0]} is your biggest spend (${money(topVal[1].val)} total) — compare brands or stores.` });

    // 4) rarely used
    const rare = Object.entries(byItem).filter(([, d]) => d.months.size === 1 && all.length >= 2);
    if (rare.length) out.push({ icon: 'sparkles', good: false, text: `${rare.slice(0, 3).map((r) => r[0]).join(', ')} bought only once — drop if unused to avoid waste.` });

    return { empty: false, items: out.slice(0, 6) };
  }

  GP.analytics = { listTotal, aggregate, suggestions };
})(window.GP = window.GP || {});
