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
  let editingId = null; // id of the cart item currently in inline-edit mode
  const renderList = () => V.renderList(store, {
    onChange: onItemChange, onDelete: onItemDelete,
    onEdit: onItemEdit, onEditSave: onItemEditSave, onEditCancel: onItemEditCancel
  }, editingId);
  const renderSaved = () => V.renderSaved(store, { onLoad: onLoad, onDelete: onDeleteSaved });
  const renderDash = () => V.renderDash(store);

  let curView = 'list';
  function show(view) {
    curView = V.showView(view);
    // Defer the dashboard a tick so the chart boxes have their final layout
    // (charts size themselves from their parent's measured box).
    if (view === 'dashboard') setTimeout(renderDash, 60);
    if (view === 'saved') renderSaved();
  }

  // Charts use fixed pixel sizes, so re-render the dashboard on resize (debounced).
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (curView === 'dashboard') renderDash(); }, 150);
  });

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
    if (editingId === id) editingId = null;
    store.removeItem(id);
    renderList();
  }

  /* ---- full inline edit (name/qty/unit/price/category per item) ---- */
  function onItemEdit(id) {
    editingId = id;
    renderList();
  }

  function onItemEditCancel() {
    editingId = null;
    renderList();
  }

  function onItemEditSave(id, vals) {
    const it = store.findItem(id);
    if (!it) return;
    const name = ucFirst((vals.name || '').trim());
    if (!name) { V.toast('Enter an item name'); return; }
    it.name = name;
    it.qty = vals.qty;
    it.unit = vals.unit;
    it.price = vals.price;
    it.category = vals.category;
    store.persistCurrent();
    store.learn(name, { unit: it.unit, category: it.category, lastPrice: it.price });
    V.refreshDatalist(store);
    editingId = null;
    renderList();
    V.toast(name + ' updated');
  }

  $('#monthInput').addEventListener('change', (e) => {
    store.switchMonth(e.target.value);
    editingId = null;
    renderList();
    V.toast(GP.utils.monthLong(e.target.value));
  });
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
    syncPush(true);
  }

  /* ---- cloud sync (data committed to the repo, retrievable on any device) ---- */
  function syncPush(promptForToken) {
    if (!GP.sync.hasToken()) {
      if (!promptForToken) return;
      const t = prompt('Paste a GitHub token (repo scope) to sync your lists across devices.\nLeave blank to keep data on this device only:');
      if (!t || !t.trim()) return;
      GP.sync.setToken(t.trim());
    }
    GP.sync.push().then((ok) => { if (ok) V.toast('Synced to cloud ✓'); });
  }
  // Autosave to the repo every three minutes (only once a token is set).
  setInterval(() => GP.sync.push(), 180000);

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
  V.initIcons();
  V.initStaticSelects();
  V.refreshDatalist(store);
  renderList();

  // Pull the latest repo copy on open; reload to pick it up if it's newer.
  GP.sync.pull().then((changed) => { if (changed) location.reload(); });
})(window.GP = window.GP || {});
