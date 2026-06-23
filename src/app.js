/* Controller / bootstrap.
   Wires DOM events to store mutations and orchestrates re-renders.
   Depends on every other GP.* module, so it loads last. */
(function (GP) {
  'use strict';

  const { $, ucFirst, uid } = GP.utils;
  const { UNTITLED } = GP.constants;
  const V = GP.views;
  const store = new GP.Store();

  /* ---- render orchestration ---- */
  const renderList = () => V.renderList(store, { onChange: onItemChange, onDelete: onItemDelete });
  const renderSaved = () => V.renderSaved(store, { onLoad: onLoad, onDelete: onDeleteSaved });
  const renderDash = () => V.renderDash(store);

  function show(view) {
    V.showView(view);
    if (view === 'dashboard') renderDash();
    if (view === 'saved') renderSaved();
  }

  /* ---- add form: auto unit/price/category from catalog ---- */
  $('#itemName').addEventListener('input', (e) => {
    const name = e.target.value.trim();
    const c = store.lookup(name) || store.lookup(ucFirst(name));
    if (c) {
      $('#itemUnit').value = c.unit;
      $('#itemCat').value = c.category;
      if (c.lastPrice != null) $('#itemPrice').value = c.lastPrice;
    }
  });

  $('#btnAdd').addEventListener('click', () => {
    const name = ucFirst($('#itemName').value.trim());
    if (!name) { V.toast('Enter an item name'); return; }
    const unit = $('#itemUnit').value, category = $('#itemCat').value;
    const qty = +$('#itemQty').value || 0, price = +$('#itemPrice').value || 0;

    store.addItem({ id: uid(), name, qty, unit, price, category, bought: false });
    store.learn(name, { unit, category, lastPrice: price }); // catalog learns item + last price
    V.refreshDatalist(store);

    $('#itemName').value = ''; $('#itemQty').value = '1'; $('#itemPrice').value = '';
    renderList();
    V.toast(name + ' added');
    $('#itemName').focus();
  });

  /* ---- inline row edits ---- */
  function onItemChange(id, ev) {
    const it = store.findItem(id);
    if (!it) return;
    const act = ev.target.dataset.act;
    if (act === 'qty') it.qty = +ev.target.value || 0;
    if (act === 'price') {
      it.price = +ev.target.value || 0;
      store.setPrice(it.name, { unit: it.unit, category: it.category, lastPrice: it.price });
    }
    if (act === 'buy') it.bought = ev.target.checked;
    store.persistCurrent();
    renderList();
  }

  function onItemDelete(id) {
    store.removeItem(id);
    renderList();
  }

  $('#monthInput').addEventListener('change', (e) => { store.current.month = e.target.value; store.persistCurrent(); });
  $('#storeInput').addEventListener('input', (e) => { store.current.store = e.target.value; store.persistCurrent(); });

  /* ---- save / load ---- */
  $('#btnSave').addEventListener('click', () => {
    if (store.current.name === UNTITLED) return saveAs();
    doSave(store.current.name);
  });
  $('#btnSaveAs').addEventListener('click', saveAs);

  function saveAs() {
    const suggestion = store.current.name === UNTITLED
      ? store.current.month + ' Groceries'
      : store.current.name + ' copy';
    const n = prompt('Save list as:', suggestion);
    if (n && n.trim()) doSave(n.trim());
  }

  function doSave(name) {
    store.save(name);
    renderList();
    renderSaved();
    V.toast('Saved “' + name + '”');
  }

  function onLoad(name) {
    store.load(name);
    renderList();
    show('list');
    V.toast('Loaded “' + name + '”');
  }

  function onDeleteSaved(name) {
    if (confirm('Delete “' + name + '”?')) {
      store.remove(name);
      renderSaved();
      renderDash();
    }
  }

  $('#btnNew').addEventListener('click', () => {
    store.newCurrent();
    renderList();
    show('list');
    V.toast('New blank list');
  });

  /* ---- PDF ---- */
  $('#btnPdf').addEventListener('click', () => {
    if (!store.current.items.length) { V.toast('Add items first'); return; }
    GP.pdf.exportList(store.current);
    V.toast('PDF downloaded');
  });

  /* ---- tabs ---- */
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => show(t.dataset.view)));

  /* ---- init ---- */
  V.initStaticSelects();
  V.refreshDatalist(store);
  renderList();
})(window.GP = window.GP || {});
