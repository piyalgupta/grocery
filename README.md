# 🧺 Grocery Planner

A clean, mobile-first web app to plan your monthly grocery list, track family
consumption, get savings suggestions, and export a PDF to send to your store.

**No build step, no server** — just open `index.html` (or host it anywhere static).

## Features
- **Monthly list builder** — add items with quantity, unit, price & category.
- **Smart catalog** — pick from the dropdown and the right **unit, category and
  last price auto-fill**. New items you type are remembered automatically.
- **Last-price memory** — every item always carries its most recent price.
- **Save / Load / Save As** — store named lists, reload them next month, tweak,
  and save under a new name. Lists live in your browser (your personal repo).
- **PDF export** — one tap creates a tidy order sheet (item, qty, unit, price,
  total) to send to the grocery store.
- **Consumption dashboard** — spend by category, monthly trend, top consumed
  items, and **optimization suggestions** (bulk-buy, rising spend, waste, etc.).
- **Fully responsive** — works in portrait & landscape on phones, tablets,
  laptops and desktops.

## Usage
1. Open `index.html` in any modern browser.
2. Add items — start typing to use the smart dropdown.
3. Hit **💾 Save** (or **Save As**) to keep the list.
4. At month end, tap **📄 PDF** and send it to your store.
5. Check the **📊 Dashboard** for consumption insights.

## Tech
Vanilla HTML/CSS/JS · [Chart.js](https://www.chartjs.org/) ·
[jsPDF](https://github.com/parallax/jsPDF) + autotable · `localStorage` for data.

> Data is stored locally in your browser. Use **Save As** to keep monthly
> snapshots; export PDFs for sharing.
