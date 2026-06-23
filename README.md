# 🧺 Grocery Planner

A clean, mobile-first web app to plan your monthly grocery list, track family
consumption, get savings suggestions, and export a PDF to send to your store.

**No build step, no server** — just open `index.html` (or host it anywhere static).

A soft **neumorphic** UI — single-surface cards extruded with paired
light/dark shadows on a warm sage background, a fresh-produce green palette,
Newsreader + JetBrains Mono type, and crisp inline-SVG line icons.

## Features
- **Monthly list builder** — add items with quantity, unit, price & category.
- **Smart catalog** — pick from the dropdown and the right **unit, category and
  last price auto-fill**. New items you type are remembered automatically.
- **Last-price memory** — every item always carries its most recent price.
- **Per-month auto memory** — change the month picker and the working list for
  that month reloads automatically (past, current or a future month you're
  planning ahead for); a brand-new month opens blank and saves itself as you type.
- **Cross-device cloud sync** — data is committed to `data/grocery-data.json`
  in this repo on every manual save and auto-saved every 3 minutes, so the same
  lists are retrievable on any device that opens the app. Paste a GitHub token
  (repo scope) once when prompted on first save to enable writing.
- **Save / Load / Save As** — store named lists, reload them next month, tweak,
  and save under a new name. Lists live in your browser (your personal repo).
- **Per-item editing** — edit any cart item in place (name, qty, unit, price,
  category) without removing and re-adding it.
- **PDF export** — one tap creates a tidy order sheet (item, qty, unit, with a
  tick column) to send to the grocery store.
- **Consumption dashboard** — monthly spend trend, spend by category,
  **category mix over time**, **per-item price trends**, buying-habit
  frequency, top consumed items, plus **smart suggestions** (bulk-buy, rising
  spend, price creep, waste, etc.). Charts use currency-formatted axes and
  value/share tooltips.
- **Fully responsive** — works in portrait & landscape on phones, tablets,
  laptops and desktops.

## Usage
1. Open `index.html` in any modern browser.
2. Add items — start typing to use the smart dropdown.
3. Hit **💾 Save** (or **Save As**) to keep the list.
4. At month end, tap **📄 PDF** and send it to your store.
5. Check the **📊 Dashboard** for consumption insights.

## Tech
Vanilla HTML/CSS/JS (no framework, no build) · inline SVG icons ·
[Chart.js](https://www.chartjs.org/) ·
[jsPDF](https://github.com/parallax/jsPDF) + autotable · `localStorage` for data.

## Architecture
Still **zero build** — the code is split into small, single-responsibility
scripts under `src/`, each attaching to a shared `window.GP` namespace and
loaded in dependency order (so it keeps working from a plain `file://` open):

| File | Responsibility |
|------|----------------|
| `constants.js` | Config & seed data (units, categories, palette, seed catalog). |
| `utils.js` | Generic helpers — DOM lookup, safe storage read/write, formatting. |
| `store.js` | Model + persistence. Owns catalog/lists/current and all `localStorage` writes. |
| `analytics.js` | Pure domain logic — totals, aggregation, suggestions (no DOM). |
| `charts.js` | Chart.js wrapper with an instance registry. |
| `pdf.js` | jsPDF order-sheet export. |
| `views.js` | Render layer — state → DOM, no state mutation. |
| `app.js` | Controller — wires events to the store and orchestrates re-renders. |

> Data is stored locally in your browser. Use **Save As** to keep monthly
> snapshots; export PDFs for sharing.
