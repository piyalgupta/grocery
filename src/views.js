/* View layer: turns state into DOM. These functions only read from `store`
   and wire interaction callbacks passed in by the controller (app.js).
   They never mutate state or touch storage directly. */
(function (GP) {
  'use strict';

  const { $, money } = GP.utils;
  const { UNITS, CATS } = GP.constants;
  const { listTotal, aggregate, suggestions } = GP.analytics;

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
    el.innerHTML = options.map((o) => `<option ${o === selected ? 'selected' : ''}>${o}</option>`).join('');
  }

  /** Refresh the item-name autocomplete datalist from the catalog. */
  function refreshDatalist(store) {
    $('#catalogList').innerHTML = store.catalogNames().map((n) => `<option value="${n}">`).join('');
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
      const el = document.createElement('div');
      el.className = 'row' + (it.bought ? ' bought' : '');
      el.innerHTML = `
        <div class="r-chk"><input class="chk" type="checkbox" ${it.bought ? 'checked' : ''} data-act="buy"></div>
        <div class="r-name">${it.name}<div class="r-sub">${it.category}</div></div>
        <div class="r-edit-wrap"><input class="r-edit" type="number" min="0" step="0.25" value="${it.qty}" data-act="qty"></div>
        <div class="r-edit-wrap"><span class="r-sub">${it.unit}</span></div>
        <div class="r-edit-wrap"><input class="r-edit" type="number" min="0" step="0.5" value="${it.price}" data-act="price"></div>
        <div class="r-sub-wrap r-sub">${it.qty} ${it.unit} × ${money(it.price)}</div>
        <div class="r-total">${money(line)}</div>
        <div class="r-actions"><button class="icon-btn del" data-act="del">🗑</button></div>`;
      el.querySelectorAll('[data-act]').forEach((node) => node.addEventListener('change', (ev) => handlers.onChange(it.id, ev)));
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
      const el = document.createElement('div');
      el.className = 'saved-row';
      el.innerHTML = `<div><strong>${name}</strong><div class="meta">${l.month} • ${l.items.length} items • ${money(tot)}${l.store ? ' • ' + l.store : ''}</div></div>
        <div class="r-actions">
          <button class="btn ghost" data-a="load">Load</button>
          <button class="btn danger" data-a="del">Delete</button>
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
    const ul = $('#suggestions');
    const res = suggestions(store.lists, agg);
    if (res.empty) {
      ul.innerHTML = '<li class="good">Save a few monthly lists to unlock consumption insights and savings tips. 📈</li>';
      return;
    }
    ul.innerHTML = res.items.map((t) => {
      const good = t.startsWith('✅||');
      return `<li class="${good ? 'good' : ''}">${t.replace('✅||', '✅ ')}</li>`;
    }).join('') || '<li class="good">Looking efficient — no issues spotted this month. 🎉</li>';
  }

  /** Toggle the active tab + view; returns the activated view id. */
  function showView(view) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + view));
    return view;
  }

  GP.views = {
    toast, fillSelect, refreshDatalist, initStaticSelects,
    renderList, renderSaved, renderDash, showView
  };
})(window.GP = window.GP || {});
