/* Static configuration & seed data for Grocery Planner.
   Pure data — no DOM, no side effects. */
(function (GP) {
  'use strict';

  // localStorage keys (the app's "tables")
  const LS = { catalog: 'gp_catalog', lists: 'gp_lists', current: 'gp_current' };

  const UNITS = ['kg', 'g', 'L', 'ml', 'dozen', 'pcs', 'packet', 'bottle', 'can', 'bunch', 'loaf'];

  const CATS = [
    'Vegetables', 'Fruits', 'Dairy', 'Grains & Pulses', 'Spices & Oil',
    'Snacks', 'Beverages', 'Household', 'Personal Care', 'Other'
  ];

  // Default for a brand-new list (sentinel name used to decide Save vs Save As).
  const UNTITLED = 'Untitled';

  // Chart colour palette (matches the category accent colours).
  const PALETTE = [
    '#3fae5a', '#e8553b', '#3a9ec4', '#d6a32a', '#d9582f',
    '#c0823e', '#8a6d4f', '#9b5bd6', '#e36aa0', '#8a93a0'
  ];

  // Category -> [icon name, accent colour]. Drives the coloured item dots.
  const CATMETA = {
    'Vegetables': ['leaf', '#3fae5a'], 'Fruits': ['apple', '#e8553b'], 'Dairy': ['milk', '#3a9ec4'],
    'Grains & Pulses': ['sprout', '#d6a32a'], 'Spices & Oil': ['flame', '#d9582f'], 'Snacks': ['cookie', '#c0823e'],
    'Beverages': ['coffee', '#8a6d4f'], 'Household': ['home', '#9b5bd6'], 'Personal Care': ['droplet', '#e36aa0'],
    'Other': ['bag', '#8a93a0']
  };

  // Inline Lucide-style icon path data, injected as SVGs by the view layer.
  const ICONS = {
    basket: '<path d="m5 11 4-7"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.8 11 1.7 7.4a2 2 0 0 0 2 1.6h9a2 2 0 0 0 2-1.6l1.7-7.4"/><path d="m9 11 1 9"/><path d="m15 11-1 9"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    chart: '<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12" y="6" width="3" height="11" rx="1"/><rect x="17" y="13" width="3" height="4" rx="1"/>',
    bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    folder: '<path d="M6 14l1.5-2.9A2 2 0 0 1 9.24 10H21a1 1 0 0 1 .96 1.27l-1.42 5A2 2 0 0 1 18.62 18H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v1"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
    apple: '<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06z"/><path d="M10 2c1 .5 2 2 2 5"/>',
    milk: '<path d="M8 2h8"/><path d="M9 2v2.79a4 4 0 0 1-.67 2.22l-.66.98A4 4 0 0 0 7 10.21V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.79a4 4 0 0 0-.67-2.22l-.66-.98A4 4 0 0 1 15 4.79V2"/><path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"/>',
    sprout: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    cookie: '<path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/>',
    coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
    droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C4 11.1 3 13 3 15a7 7 0 0 0 7 7z"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    trendingUp: '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
    check: '<path d="M21.8 10A10 10 0 1 1 12 2c2.5 0 4.8.9 6.6 2.4"/><path d="m9 11 3 3L22 4"/>',
    wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5"/><path d="M3 5v14a2 2 0 0 0 2 2h16a1 1 0 0 0 1-1v-4"/><path d="M18 12a.5.5 0 0 0 0 1h.01"/>',
    sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>'
  };

  // Seed catalog: name -> [unit, category, lastPrice]
  const SEED = {
    'Rice': ['kg', 'Grains & Pulses', 60], 'Wheat Flour': ['kg', 'Grains & Pulses', 45], 'Toor Dal': ['kg', 'Grains & Pulses', 140],
    'Sugar': ['kg', 'Grains & Pulses', 45], 'Salt': ['kg', 'Spices & Oil', 25], 'Cooking Oil': ['L', 'Spices & Oil', 150],
    'Milk': ['L', 'Dairy', 60], 'Curd': ['kg', 'Dairy', 70], 'Paneer': ['g', 'Dairy', 90], 'Butter': ['g', 'Dairy', 55], 'Eggs': ['dozen', 'Dairy', 75],
    'Onion': ['kg', 'Vegetables', 35], 'Potato': ['kg', 'Vegetables', 30], 'Tomato': ['kg', 'Vegetables', 40], 'Garlic': ['g', 'Vegetables', 30],
    'Ginger': ['g', 'Vegetables', 25], 'Spinach': ['bunch', 'Vegetables', 20], 'Banana': ['dozen', 'Fruits', 50], 'Apple': ['kg', 'Fruits', 180],
    'Tea': ['g', 'Beverages', 60], 'Coffee': ['g', 'Beverages', 120], 'Bread': ['loaf', 'Snacks', 40], 'Biscuits': ['packet', 'Snacks', 30],
    'Turmeric': ['g', 'Spices & Oil', 20], 'Chilli Powder': ['g', 'Spices & Oil', 25], 'Detergent': ['kg', 'Household', 120],
    'Dish Soap': ['bottle', 'Household', 95], 'Toothpaste': ['pcs', 'Personal Care', 55], 'Soap': ['pcs', 'Personal Care', 35],
    'Shampoo': ['bottle', 'Personal Care', 180]
  };

  GP.constants = { LS, UNITS, CATS, UNTITLED, PALETTE, CATMETA, ICONS, SEED };
})(window.GP = window.GP || {});
