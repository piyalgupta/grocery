/* View layer: turns state into DOM. These functions only read from `store`
   and wire interaction callbacks passed in by the controller (app.js).
   They never mutate state or touch storage directly. */
(function (GP) {
  'use strict';

  const { $, money, esc } = GP.utils;
  const { UNITS, CATS, ICONS, CATMETA } = GP.constants;
  const { listTotal, aggregate, suggestions } = GP.analytics;

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
    $('#cartIc').innerHTML = icon('cart', 18, '#3f7a58');
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

  /** Render the current list, its rows and totals. `handlers` = { onChange, onDelete }. */
  function renderList(store, handlers) {
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
      const [iconName, color] = catMeta(it.category);
      const el = document.createElement('div');
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
          <button class="r-del" data-act="del" title="Remove" aria-label="Remove">${icon('x', 17)}</button>
        </div>`;
      el.querySelectorAll('input[data-act]').forEach((node) => node.addEventListener('change', (ev) => handlers.onChange(it.id, ev)));
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
    $('#kpiSpend').textContent = money(curTot);
    $('#kpiItems').textContent = cur.items.length;
    $('#kpiAvg').textContent = money(cur.items.length ? curTot / cur.items.length : 0);
    $('#kpiMonths').textContent = new Set(Object.values(store.lists).map((l) => l.month)).size;

    const agg = aggregate(store.lists);
    const { byCat, byMonth, byItem } = agg;

    GP.charts.doughnut('catChart', Object.keys(byCat), Object.values(byCat));
    const months = Object.keys(byMonth).sort();
    GP.charts.line('trendChart', months, months.map((m) => byMonth[m]));
    const top = Object.entries(byItem).sort((a, b) => b[1].qty - a[1].qty).slice(0, 8);
    GP.charts.bar('topChart', top.map((t) => t[0]), top.map((t) => Math.round(t[1].qty * 100) / 100));

    renderSuggestions(store, agg);
  }

  /** Render optimization suggestions from a pre-computed aggregate. */
  function renderSuggestions(store, agg) {
    const box = $('#suggestions');
    const res = suggestions(store.lists, agg);
    const items = res.items.length
      ? res.items
      : [{ icon: 'check', good: true, text: 'Looking efficient — no issues spotted this month.' }];
    box.innerHTML = items.map((s) => {
      const color = s.good ? '#2f9e5b' : '#d9882f';
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
