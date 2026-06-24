/* Model + persistence layer.
   Owns all app state (catalog, saved lists, current list) and is the ONLY
   module that talks to localStorage for domain data. The rest of the app reads
   `store.current` / `store.lists` and calls these methods to mutate + persist. */
(function (GP) {
  'use strict';

  const { LS, SEED, UNTITLED } = GP.constants;
  const { read, write } = GP.utils;

  // Mark the moment of the latest local change so cloud sync can resolve
  // "newest wins" between devices.
  const touch = () => localStorage.setItem('gp_updatedAt', Date.now());

  class Store {
    constructor() {
      this.reload();
    }

    /** (Re)hydrate all in-memory state from localStorage. Called on construction
        and again after cloud sync rewrites the tables, so the UI can refresh in
        place instead of forcing a full-page reload. */
    reload() {
      this.catalog = read(LS.catalog, null) || this._seedCatalog();
      this.lists = read(LS.lists, {});
      this.months = read(LS.months, {});   // 'YYYY-MM' -> working list snapshot
      this.current = read(LS.current, null) || Store.newList();
    }

    /** Build the initial catalog from SEED and persist it. */
    _seedCatalog() {
      const catalog = {};
      for (const [name, [unit, category, lastPrice]] of Object.entries(SEED)) {
        catalog[name] = { unit, category, lastPrice };
      }
      write(LS.catalog, catalog);
      return catalog;
    }

    /** A fresh, empty list scoped to the current month. */
    static newList() {
      const d = new Date();
      return { name: UNTITLED, month: d.toISOString().slice(0, 7), store: '', items: [] };
    }

    /* ---- persistence ---- */
    // The working list is always mirrored into its month slot, so switching
    // months reloads exactly what was last entered for that month.
    persistCurrent() {
      this.months[this.current.month] = structuredClone(this.current);
      write(LS.current, this.current);
      write(LS.months, this.months);
      touch();
    }
    persistCatalog() { write(LS.catalog, this.catalog); touch(); }
    persistLists() { write(LS.lists, this.lists); touch(); }

    /** Switch the working list to `month`: reload its saved slot, or start blank. */
    switchMonth(month) {
      this.months[this.current.month] = structuredClone(this.current);
      if (this.months[month]) {
        this.current = structuredClone(this.months[month]);
      } else {
        this.current = Store.newList();
      }
      this.current.month = month;
      this.persistCurrent();
    }

    /* ---- catalog (learning index) ---- */
    lookup(name) { return this.catalog[name]; }
    catalogNames() { return Object.keys(this.catalog).sort(); }

    /** Learn an item: remember unit/category and keep the most recent known price. */
    learn(name, { unit, category, lastPrice }) {
      this.catalog[name] = {
        unit,
        category,
        lastPrice: lastPrice || this.catalog[name]?.lastPrice || 0
      };
      this.persistCatalog();
    }

    /** Overwrite the catalog price for an item (used when a price is edited inline). */
    setPrice(name, { unit, category, lastPrice }) {
      this.catalog[name] = { unit, category, lastPrice };
      this.persistCatalog();
    }

    /* ---- current-list items ---- */
    addItem(item) { this.current.items.push(item); this.persistCurrent(); }
    removeItem(id) { this.current.items = this.current.items.filter((x) => x.id !== id); this.persistCurrent(); }
    findItem(id) { return this.current.items.find((x) => x.id === id); }

    /* ---- saved lists ---- */
    /** Save the current list under `name` with a timestamp. */
    save(name) {
      this.current.name = name;
      this.lists[name] = { ...structuredClone(this.current), savedAt: new Date().toISOString() };
      this.persistLists();
      this.persistCurrent();
    }

    /** Load a saved list as the working copy (stripping the saved-at marker). */
    load(name) {
      this.current = structuredClone(this.lists[name]);
      delete this.current.savedAt;
      this.persistCurrent();
    }

    remove(name) { delete this.lists[name]; this.persistLists(); }
    newCurrent() { this.current = Store.newList(); this.persistCurrent(); }

    /** Saved list names, most-recently-saved first. */
    savedNames() {
      return Object.keys(this.lists).sort((a, b) =>
        (this.lists[b].savedAt || '').localeCompare(this.lists[a].savedAt || ''));
    }
  }

  GP.Store = Store;
})(window.GP = window.GP || {});
