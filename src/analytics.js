/* Pure domain logic for the dashboard: totals, aggregation, suggestions.
   No DOM, no storage — easy to reason about and to unit-test. */
(function (GP) {
  'use strict';

  /** Sum of qty × price across a list's items. The app's single "total" formula. */
  function listTotal(items) {
    return items.reduce((sum, i) => sum + (i.qty || 0) * (i.price || 0), 0);
  }

  /**
   * Roll up every saved list into several views used by the dashboard:
   *   byCat        - spend per category (all-time)
   *   byMonth      - spend per month
   *   countByMonth - item count (basket size) per month
   *   byItem       - { qty, val, unit, months:Set } per item name (all-time)
   *   byCatMonth   - { month: { category: spend } } for category-mix-over-time
   *   itemByMonth  - { name: { month: { qty, val } } } for per-item price trends
   */
  function aggregate(lists) {
    const byCat = {}, byMonth = {}, countByMonth = {}, byItem = {}, byCatMonth = {}, itemByMonth = {};
    Object.values(lists).forEach((list) => {
      const m = list.month;
      byCatMonth[m] = byCatMonth[m] || {};
      countByMonth[m] = (countByMonth[m] || 0);
      list.items.forEach((i) => {
        const value = (i.qty || 0) * (i.price || 0);
        byCat[i.category] = (byCat[i.category] || 0) + value;
        byMonth[m] = (byMonth[m] || 0) + value;
        byCatMonth[m][i.category] = (byCatMonth[m][i.category] || 0) + value;
        countByMonth[m] += 1;
        const entry = (byItem[i.name] = byItem[i.name] || { qty: 0, val: 0, unit: i.unit, months: new Set() });
        entry.qty += i.qty || 0;
        entry.val += value;
        entry.months.add(m);
        const im = (itemByMonth[i.name] = itemByMonth[i.name] || {});
        const ie = (im[m] = im[m] || { qty: 0, val: 0 });
        ie.qty += i.qty || 0;
        ie.val += value;
      });
    });
    return { byCat, byMonth, countByMonth, byItem, byCatMonth, itemByMonth };
  }

  /**
   * Month-on-month spend comparison for the dashboard hero.
   * Takes `byMonth` (spend per month) and returns the latest month, how it
   * compares to the previous month and to two months ago, plus a short context
   * series (up to the last 6 months) for the trend bars.
   *
   * Each `change` is { diff, pct, dir } where dir is 'up' | 'down' | 'flat'.
   */
  function monthOnMonth(byMonth) {
    const months = Object.keys(byMonth).sort();
    const n = months.length;
    const at = (k) => (n - k >= 0 ? { month: months[n - k], spend: byMonth[months[n - k]] } : null);
    const current = at(1), prev = at(2), prev2 = at(3);

    const change = (cur, base) => {
      if (!cur || !base) return null;
      const diff = cur.spend - base.spend;
      const pct = base.spend ? Math.round((diff / base.spend) * 100) : (cur.spend ? 100 : 0);
      return { diff, pct, dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat' };
    };

    const trend = months.slice(-6);
    return {
      months: trend,
      series: trend.map((m) => byMonth[m]),
      currentIdx: trend.length - 1,
      current, prev, prev2,
      vsPrev: change(current, prev),
      vsPrev2: change(current, prev2)
    };
  }

  /** Average unit price of an item in a given month, or null if not bought. */
  function avgPrice(itemByMonth, name, month) {
    const e = itemByMonth[name] && itemByMonth[name][month];
    return e && e.qty ? e.val / e.qty : null;
  }

  /**
   * Per-item unit-price change between its first and latest purchase month.
   * Returns the biggest movers (up or down) — { name, pct, first, last } —
   * sorted by magnitude. Drives the "Biggest price movers" chart.
   */
  function priceMovers(agg, limit) {
    const { byItem, itemByMonth } = agg;
    const out = [];
    Object.entries(byItem).forEach(([name, d]) => {
      if (d.months.size < 2) return;
      const ms = [...d.months].sort();
      const first = avgPrice(itemByMonth, name, ms[0]);
      const last = avgPrice(itemByMonth, name, ms[ms.length - 1]);
      if (first && last && first !== last) {
        out.push({ name, pct: Math.round(((last - first) / first) * 100), first, last });
      }
    });
    return out.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, limit || 7);
  }

  /**
   * Plain-language readouts of what each chart is showing — the "headline"
   * behind every graph (top category, biggest spend, fastest-rising price…).
   * Returns [{ icon, label, text }] for the dashboard insights panel.
   */
  function chartInsights(agg) {
    const { money } = GP.utils;
    const { byCat, byItem, byMonth } = agg;
    const out = [];
    if (!Object.keys(byMonth).length) return out;

    const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const catTotal = catEntries.reduce((s, c) => s + c[1], 0) || 1;
    if (catEntries.length) {
      const [c, v] = catEntries[0];
      out.push({ icon: 'wallet', label: 'Top category', text: `${c} — ${money(v)} (${Math.round((v / catTotal) * 100)}% of spend)` });
    }

    const topVal = Object.entries(byItem).sort((a, b) => b[1].val - a[1].val)[0];
    if (topVal) out.push({ icon: 'trendingUp', label: 'Biggest spend', text: `${topVal[0]} — ${money(topVal[1].val)} total` });

    const freq = Object.entries(byItem).sort((a, b) => b[1].months.size - a[1].months.size)[0];
    if (freq && freq[1].months.size > 1) out.push({ icon: 'repeat', label: 'Most frequent', text: `${freq[0]} — bought in ${freq[1].months.size} months` });

    const topQty = Object.entries(byItem).sort((a, b) => b[1].qty - a[1].qty)[0];
    if (topQty) out.push({ icon: 'sparkles', label: 'Highest volume', text: `${topQty[0]} — ${Math.round(topQty[1].qty * 100) / 100} ${topQty[1].unit}` });

    const movers = priceMovers(agg);
    const up = movers.find((m) => m.pct > 0);
    if (up) out.push({ icon: 'flame', label: 'Fastest-rising price', text: `${up.name} — +${up.pct}% (${money(up.first)} → ${money(up.last)})` });
    const down = movers.find((m) => m.pct < 0);
    if (down) out.push({ icon: 'check', label: 'Best price drop', text: `${down.name} — ${down.pct}% (${money(down.first)} → ${money(down.last)})` });

    return out;
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

    const { byItem, byMonth, itemByMonth } = agg;
    const months = Object.keys(byMonth).sort();

    // 0) price-rise watch: a regular item whose unit price climbed the most
    //    between its first and latest purchase month (helps spot inflation).
    if (months.length >= 2) {
      let worst = null;
      Object.entries(byItem).forEach(([name, d]) => {
        if (d.months.size < 2) return;
        const ms = [...d.months].sort();
        const first = avgPrice(itemByMonth, name, ms[0]);
        const last = avgPrice(itemByMonth, name, ms[ms.length - 1]);
        if (first && last && last > first) {
          const pct = Math.round(((last - first) / first) * 100);
          if (pct >= 10 && (!worst || pct > worst.pct)) worst = { name, pct, first, last };
        }
      });
      if (worst) out.push({ icon: 'trendingUp', good: false, text: `${worst.name} unit price climbed ${worst.pct}% (${money(worst.first)} → ${money(worst.last)}) — watch for a cheaper brand or store.` });
    }

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

  GP.analytics = { listTotal, aggregate, avgPrice, suggestions, monthOnMonth, priceMovers, chartInsights };
})(window.GP = window.GP || {});
