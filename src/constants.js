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

  // Chart colour palette.
  const PALETTE = [
    '#2e7d32', '#66bb6a', '#f59e0b', '#ef6c00', '#26a69a',
    '#5c6bc0', '#ec407a', '#8d6e63', '#42a5f5', '#ab47bc'
  ];

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

  GP.constants = { LS, UNITS, CATS, UNTITLED, PALETTE, SEED };
})(window.GP = window.GP || {});
