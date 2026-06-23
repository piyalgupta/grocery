/* Model + persistence layer.
   Owns all app state (catalog, saved lists, current list) and is the ONLY
   module that talks to localStorage for domain data. The rest of the app reads
   `store.current` / `store.lists` and calls these methods to mutate + persist. */
(function (GP) {
  'use strict';

  const { LS, SEED, UNTITLED } = GP.constants;
  const { read, write } = GP.utils;

  class Store {
    constructor() {
      this.catalog = read(LS.catalog, null) || this._seedCatalog();
      this.lists = read(LS.lists, {});
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
    persistCurrent() { write(LS.current, this.current); }
    persistCatalog() { write(LS.catalog, this.catalog); }
    persistLists() { write(LS.lists, this.lists); }

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
