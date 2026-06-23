/* View layer: turns state into DOM. These functions only read from `store`
   and wire interaction callbacks passed in by the controller (app.js).
   They never mutate state or touch storage directly. */
(function (GP) {
  'use strict';

  const { $, money, esc, monthLabel, monthLong } = GP.utils;
  const { UNITS, CATS, ICONS, CATMETA } = GP.constants;
  const { listTotal, aggregate, suggestions, monthOnMonth, priceMovers, chartInsights } = GP.analytics;

  /** Build an inline Lucide-style SVG for a named glyph. */
  function icon(name, size, color) {
    return `<svg width="${size || 22}" height="${size || 22}" viewBox="0 0 24 24" fill="none" stroke="${color || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;display:block">${ICONS[name] || ''}</svg>`;
  }

  /** [icon name, accent colour] for a category, with a neutral fallback. */
  const catMeta = (c) => CATMETA[c] || ['bag', '#8a93a0'];

  /** Inject the static (non-list) icons into their placeholder elements. */
  function initIcons() {
    $('#logo').innerHTML = icon('basket', 24);
    $('#calIc').innerHTML = icon('calendar', 18);
    $('#tabList').innerHTML = icon('list', 22);
    $('#tabDash').innerHTML = icon('chart', 22);
    $('#tabSaved').innerHTML = icon('bookmark', 22);
    $('#btnSave').innerHTML = icon('save', 20);
    $('#btnSaveAs').innerHTML = icon('copy', 20);
    $('#btnPdf').innerHTML = icon('download', 20);
    $('#btnAdd').innerHTML = icon('plus', 20);
    $('#btnNew').innerHTML = icon('plus', 20);
    $('#cartIc').innerHTML = icon('cart', 18, '#3f7d54');
  }

  /** Transient bottom toast. */
  function toast(message) {
    const t = $('#toast');
    t.textContent = message;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /** Populate a <select> with options, pre-selecting `selected`. */
  function fillSelect(el, options, selected) {
    el.innerHTML = options.map((o) => `<option ${o === selected ? 'selected' : ''}>${esc(o)}</option>`).join('');
  }

  /** Refresh the item-name autocomplete datalist from the catalog. */
  function refreshDatalist(store) {
    $('#catalogList').innerHTML = store.catalogNames().map((n) => `<option value="${esc(n)}">`).join('');
  }

  /** Static selects that never change after load. */
  function initStaticSelects() {
    fillSelect($('#itemUnit'), UNITS, 'kg');
    fillSelect($('#itemCat'), CATS, 'Vegetables');
  }

  /** Build the inline edit form for a single item (all fields editable). */
  function buildEditRow(el, it, handlers) {
    const [iconName, color] = catMeta(it.category);
    const unitOpts = UNITS.map((u) => `<option ${u === it.unit ? 'selected' : ''}>${esc(u)}</option>`).join('');
    const catOpts = CATS.map((c) => `<option ${c === it.category ? 'selected' : ''}>${esc(c)}</option>`).join('');
    el.className = 'row editing';
    el.innerHTML = `
      <div class="dot" style="background:${color}22;color:${color};border:1px solid ${color}40">${icon(iconName, 20)}</div>
      <div class="r-edit-form">
        <div class="edit-fld grow">
          <label>Item</label>
          <input class="e-name" type="text" value="${esc(it.name)}" aria-label="Item name">
        </div>
        <div class="edit-fld">
          <label>Qty</label>
          <input class="e-qty mono" type="number" min="0" step="0.25" value="${it.qty}" aria-label="Quantity">
        </div>
        <div class="edit-fld">
          <label>Unit</label>
          <select class="e-unit" aria-label="Unit">${unitOpts}</select>
        </div>
        <div class="edit-fld">
          <label>Price / unit</label>
          <input class="e-price mono" type="number" min="0" step="0.5" value="${it.price}" aria-label="Price per unit">
        </div>
        <div class="edit-fld">
          <label>Category</label>
          <select class="e-cat" aria-label="Category">${catOpts}</select>
        </div>
      </div>
      <div class="r-edit-actions">
        <button class="r-save" title="Save" aria-label="Save">${icon('check2', 18)}</button>
        <button class="r-cancel" title="Cancel" aria-label="Cancel">${icon('x', 17)}</button>
      </div>`;
    el.querySelector('.r-save').addEventListener('click', () => handlers.onEditSave(it.id, {
      name: el.querySelector('.e-name').value,
      qty: +el.querySelector('.e-qty').value || 0,
      unit: el.querySelector('.e-unit').value,
      price: +el.querySelector('.e-price').value || 0,
      category: el.querySelector('.e-cat').value
    }));
    el.querySelector('.r-cancel').addEventListener('click', () => handlers.onEditCancel());
    el.querySelector('.e-name').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') el.querySelector('.r-save').click(); });
  }

  /** Render the current list, its rows and totals.
      `handlers` = { onChange, onDelete, onEdit, onEditSave, onEditCancel }. */
  function renderList(store, handlers, editingId) {
    const cur = store.current;
    $('#curListName').textContent = cur.name;
    $('#storeInput').value = cur.store || '';
    $('#monthInput').value = cur.month;

    const box = $('#itemRows');
    box.innerHTML = '';
    $('#emptyList').style.display = cur.items.length ? 'none' : 'block';

    let total = 0;
    cur.items.forEach((it) => {
      const line = (it.qty || 0) * (it.price || 0);
      total += line;
      const el = document.createElement('div');

      if (it.id === editingId) {
        buildEditRow(el, it, handlers);
        box.appendChild(el);
        return;
      }

      const [iconName, color] = catMeta(it.category);
      el.className = 'row' + (it.bought ? ' bought' : '');
      el.innerHTML = `
        <input class="chk" type="checkbox" ${it.bought ? 'checked' : ''} data-act="buy" aria-label="Bought">
        <div class="dot" style="background:${color}22;color:${color};border:1px solid ${color}40">${icon(iconName, 20)}</div>
        <div class="r-main">
          <div class="r-name">${esc(it.name)}</div>
          <div class="r-cat">${esc(it.category)}</div>
        </div>
        <div class="r-edit-wrap">
          <input class="r-qty" type="number" min="0" step="0.25" value="${it.qty}" data-act="qty" aria-label="Quantity">
          <span class="r-unit">${esc(it.unit)}</span>
          <input class="r-price" type="number" min="0" step="0.5" value="${it.price}" data-act="price" aria-label="Price per unit">
          <span class="r-line">${money(line)}</span>
          <button class="r-edit" data-act="edit" title="Edit item" aria-label="Edit item">${icon('pencil', 16)}</button>
          <button class="r-del" data-act="del" title="Remove" aria-label="Remove">${icon('x', 17)}</button>
        </div>`;
      el.querySelectorAll('input[data-act]').forEach((node) => node.addEventListener('change', (ev) => handlers.onChange(it.id, ev)));
      el.querySelector('[data-act="edit"]').addEventListener('click', () => handlers.onEdit(it.id));
      el.querySelector('[data-act="del"]').addEventListener('click', () => handlers.onDelete(it.id));
      box.appendChild(el);
    });

    $('#itemCount').textContent = cur.items.length;
    $('#grandTotal').textContent = money(total);
  }

  /** Render the saved-lists view. `handlers` = { onLoad, onDelete }. */
  function renderSaved(store, handlers) {
    const box = $('#savedRows');
    const names = store.savedNames();
    $('#emptySaved').style.display = names.length ? 'none' : 'block';
    box.innerHTML = '';

    names.forEach((name) => {
      const l = store.lists[name];
      const tot = listTotal(l.items);
      const meta = `${l.month} · ${l.items.length} items · ${money(tot)}${l.store ? ' · ' + esc(l.store) : ''}`;
      const el = document.createElement('div');
      el.className = 'saved-row';
      el.innerHTML = `
        <div>
          <strong>${esc(name)}</strong>
          <div class="meta">${meta}</div>
        </div>
        <div class="saved-actions">
          <button class="btn-icon glass" data-a="load" title="Load list" aria-label="Load">${icon('folder', 20)}</button>
          <button class="btn-icon danger" data-a="del" title="Delete list" aria-label="Delete">${icon('trash', 20)}</button>
        </div>`;
      el.querySelector('[data-a="load"]').addEventListener('click', () => handlers.onLoad(name));
      el.querySelector('[data-a="del"]').addEventListener('click', () => handlers.onDelete(name));
      box.appendChild(el);
    });
  }

  /** Render the dashboard: KPIs, charts and suggestions (one aggregate pass). */
  function renderDash(store) {
    const cur = store.current;
    const curTot = listTotal(cur.items);

    const agg = aggregate(store.lists);
    const { byCat, byMonth, byItem, byCatMonth, itemByMonth } = agg;
    const months = Object.keys(byMonth).sort();
    const lifetime = months.reduce((s, m) => s + byMonth[m], 0);

    // Hero: month-on-month spend (the headline story of the dashboard)
    renderHero(monthOnMonth(byMonth));

    // KPIs (current basket + lifetime habits)
    $('#kpiSpend').textContent = money(curTot);
    $('#kpiItems').textContent = cur.items.length;
    $('#kpiAvg').textContent = money(cur.items.length ? curTot / cur.items.length : 0);
    $('#kpiMonths').textContent = months.length;
    $('#kpiMonthAvg').textContent = money(months.length ? lifetime / months.length : 0);
    $('#kpiLifetime').textContent = money(lifetime);

    // Six square charts (3×2 on desktop) ------------------------------------

    // 1) Spend by category (doughnut) — where the budget splits
    GP.charts.doughnut('catChart', Object.keys(byCat), Object.values(byCat));

    // 2) Where your money goes — top items by total spend
    const spend = Object.entries(byItem).sort((a, b) => b[1].val - a[1].val).slice(0, 8);
    GP.charts.bar('spendChart', spend.map((s) => s[0]), spend.map((s) => Math.round(s[1].val)), {
      color: '#c0823e', moneyX: true, xTitle: 'Total spend',
      tipLabel: (c) => money(c.parsed.x)
    });

    // 3) Biggest price movers — unit-price % change, first → latest month
    const movers = priceMovers(agg);
    GP.charts.bar('moverChart', movers.map((m) => m.name), movers.map((m) => m.pct), {
      colors: movers.map((m) => (m.pct > 0 ? '#d9663f' : '#3fae5a')),
      pctX: true, xTitle: '% change · first → latest month',
      tipLabel: (c) => {
        const m = movers[c.dataIndex];
        return `${m.pct > 0 ? '+' : ''}${m.pct}%  (${money(m.first)} → ${money(m.last)})`;
      }
    });

    // 4) Category spend over time (stacked) — how the basket mix shifts
    const cats = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]);
    const series = {};
    cats.forEach((c) => { series[c] = months.map((m) => (byCatMonth[m] && byCatMonth[m][c]) || 0); });
    GP.charts.stackedBar('catTrendChart', months, cats, series);

    // 5) Buying habits — how often each item is purchased (months it appears in)
    const freq = Object.entries(byItem)
      .sort((a, b) => b[1].months.size - a[1].months.size || b[1].qty - a[1].qty)
      .slice(0, 8);
    GP.charts.bar('freqChart', freq.map((f) => f[0]), freq.map((f) => f[1].months.size), {
      color: '#9b5bd6', xTitle: 'Months purchased',
      tipLabel: (c) => c.parsed.x + (c.parsed.x === 1 ? ' month' : ' months')
    });

    // 6) Top consumed items by quantity
    const top = Object.entries(byItem).sort((a, b) => b[1].qty - a[1].qty).slice(0, 8);
    GP.charts.bar('topChart', top.map((t) => t[0]), top.map((t) => Math.round(t[1].qty * 100) / 100), {
      color: '#3fae5a', xTitle: 'Quantity',
      tipLabel: (c) => (Math.round(c.parsed.x * 100) / 100) + ' ' + (byItem[c.label] ? byItem[c.label].unit : '')
    });

    renderInsights(store, agg);
  }

  /** One delta chip ("vs last month  ▲ 12%  +₹450"), coloured by direction:
      spending more reads as a warning, spending less as a win. */
  function deltaChip(label, ch) {
    if (!ch) {
      return `<div class="delta-card flat"><span class="delta-cap">${esc(label)}</span>`
        + `<strong class="delta-val">—</strong><span class="delta-sub">not enough history</span></div>`;
    }
    const arrow = ch.dir === 'up' ? '▲' : ch.dir === 'down' ? '▼' : '▬';
    const sign = ch.diff > 0 ? '+' : ch.diff < 0 ? '−' : '';
    return `<div class="delta-card ${ch.dir}">
      <span class="delta-cap">${esc(label)}</span>
      <strong class="delta-val">${arrow} ${Math.abs(ch.pct)}%</strong>
      <span class="delta-sub">${sign}${money(Math.abs(ch.diff))}</span>
    </div>`;
  }

  /** Render the month-on-month hero: latest month's spend, deltas vs the two
      prior months, and a compact trend-bar chart. */
  function renderHero(mom) {
    const hasData = mom.current != null;
    $('#heroEmpty').hidden = hasData;
    $('#heroBody').style.display = hasData ? '' : 'none';
    $('#heroMonth').textContent = hasData ? monthLong(mom.current.month) : 'Month-on-month';
    $('#heroAmount').textContent = money(hasData ? mom.current.spend : 0);

    const prevLabel = mom.prev ? 'vs ' + monthLabel(mom.prev.month) : 'vs last month';
    const prev2Label = mom.prev2 ? 'vs ' + monthLabel(mom.prev2.month) : 'vs 2 months ago';
    $('#heroDeltas').innerHTML = deltaChip(prevLabel, mom.vsPrev) + deltaChip(prev2Label, mom.vsPrev2);

    if (hasData) GP.charts.momBars('momChart', mom.months.map(monthLabel), mom.series, mom.currentIdx);
  }

  /** Render the insights panel: smart suggestions + plain-language readouts
      of what each chart is showing ("Top category", "Biggest spend"…). */
  function renderInsights(store, agg) {
    renderSuggestions(store, agg);
    const box = $('#takeaways');
    const items = chartInsights(agg);
    box.innerHTML = items.length
      ? items.map((t) => `<div class="takeaway"><span class="tk-ic">${icon(t.icon, 18, '#3f7d54')}</span>`
          + `<span class="tk-body"><span class="tk-label">${esc(t.label)}</span>`
          + `<span class="tk-text">${esc(t.text)}</span></span></div>`).join('')
      : '<div class="takeaway muted-takeaway">Save monthly lists to see what your charts reveal.</div>';
  }

  /** Render optimization suggestions from a pre-computed aggregate. */
  function renderSuggestions(store, agg) {
    const box = $('#suggestions');
    const res = suggestions(store.lists, agg);
    const items = res.items.length
      ? res.items
      : [{ icon: 'check', good: true, text: 'Looking efficient — no issues spotted this month.' }];
    box.innerHTML = items.map((s) => {
      const color = s.good ? '#3f7d54' : '#b3742f';
      return `<div class="sug ${s.good ? 'good' : 'warn'}"><span class="sug-ic">${icon(s.icon, 20, color)}</span><span>${esc(s.text)}</span></div>`;
    }).join('');
  }

  /** Toggle the active tab + view; returns the activated view id. */
  function showView(view) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + view));
    return view;
  }

  GP.views = {
    toast, icon, initIcons, fillSelect, refreshDatalist, initStaticSelects,
    renderList, renderSaved, renderDash, showView
  };
})(window.GP = window.GP || {});
