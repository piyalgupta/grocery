/* Thin wrapper around Chart.js. Keeps chart instances in a registry so each
   redraw destroys the previous instance (avoids the canvas-reuse error).
   Canvases are sized manually from their parent box (responsive:false) so the
   glass chart cards keep a fixed height; callers re-render on resize. */
(function (GP) {
  'use strict';

  const { $, money } = GP.utils;
  const { PALETTE, CATMETA } = GP.constants;

  const registry = {};
  const GRID = 'rgba(140,149,163,.14)';

  /** Stable accent colour for a category (shared across every chart). */
  const catColor = (cat) => (CATMETA[cat] || [, '#8a93a0'])[1];

  /** Apply the global mono-font / muted-colour theme once. */
  function applyDefaults() {
    if (applyDefaults._done || !window.Chart) return;
    Chart.defaults.font.family = "'JetBrains Mono',monospace";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = '#8c95a3';
    applyDefaults._done = true;
  }

  function baseOpts() {
    return { responsive: false, maintainAspectRatio: false, animation: { duration: 600, easing: 'easeOutQuart' } };
  }

  /** A y-axis that renders ₹ currency ticks. */
  function moneyAxis(extra) {
    return { beginAtZero: true, grid: { color: GRID }, ticks: { callback: (v) => money(v) }, ...extra };
  }

  function destroy(id) {
    if (registry[id]) registry[id].destroy();
  }

  /** Size a canvas to fill its parent box, then (re)create the chart. */
  function render(id, config) {
    applyDefaults();
    const el = $('#' + id);
    if (!el || !el.parentElement) return;
    const r = el.parentElement.getBoundingClientRect();
    el.width = Math.max(r.width, 200);
    el.height = Math.max(r.height, 160);
    destroy(id);
    registry[id] = new Chart(el, config);
  }

  /** Spend-by-category doughnut with value + share tooltips. */
  function doughnut(id, labels, data) {
    const total = data.reduce((s, v) => s + v, 0) || 1;
    render(id, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: labels.map(catColor), borderWidth: 2, borderColor: 'rgba(255,255,255,.7)' }] },
      options: {
        ...baseOpts(), cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10 } },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${money(c.parsed)} (${Math.round((c.parsed / total) * 100)}%)` } }
        }
      }
    });
  }

  /** Monthly spend trend (area line) with ₹ axis + tooltip. */
  function line(id, labels, data) {
    render(id, {
      type: 'line',
      data: {
        labels,
        datasets: [{ data, label: 'Spend', borderColor: '#2f9e5b', backgroundColor: 'rgba(47,158,91,.14)', fill: true, tension: .35, pointBackgroundColor: '#2f9e5b', borderWidth: 2, pointRadius: 4 }]
      },
      options: {
        ...baseOpts(),
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ' ' + money(c.parsed.y) } } },
        scales: { y: moneyAxis(), x: { grid: { display: false } } }
      }
    });
  }

  /** Horizontal bar (e.g. top items by qty / frequency). `unit` formats tooltips. */
  function bar(id, labels, data, opts) {
    const o = opts || {};
    render(id, {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: o.color || '#3fae5a', borderRadius: 6 }] },
      options: {
        ...baseOpts(), indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: o.tipLabel ? { callbacks: { label: (c) => ' ' + o.tipLabel(c) } } : undefined
        },
        scales: {
          x: { beginAtZero: true, grid: { color: GRID }, ticks: o.moneyX ? { callback: (v) => money(v) } : { precision: 0 }, title: o.xTitle ? { display: true, text: o.xTitle, color: '#9aa3b0' } : undefined },
          y: { grid: { display: false } }
        }
      }
    });
  }

  /** Stacked bars of category spend per month (category mix over time). */
  function stackedBar(id, labels, cats, series) {
    render(id, {
      type: 'bar',
      data: { labels, datasets: cats.map((cat) => ({ label: cat, data: series[cat], backgroundColor: catColor(cat), borderWidth: 1, borderColor: 'rgba(255,255,255,.5)' })) },
      options: {
        ...baseOpts(),
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 8 } },
          tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${money(c.parsed.y)}` } }
        },
        scales: { x: { stacked: true, grid: { display: false } }, y: moneyAxis({ stacked: true }) }
      }
    });
  }

  /** Multiple line series sharing one x-axis (e.g. unit-price trends per item). */
  function multiLine(id, labels, series, opts) {
    const o = opts || {};
    render(id, {
      type: 'line',
      data: {
        labels,
        datasets: series.map((s, i) => ({
          label: s.label, data: s.data, borderColor: s.color || PALETTE[i % PALETTE.length],
          backgroundColor: 'transparent', tension: .3, borderWidth: 2, pointRadius: 3, spanGaps: true
        }))
      },
      options: {
        ...baseOpts(),
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 8 } },
          tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${money(c.parsed.y)}` } }
        },
        scales: { y: o.money ? moneyAxis() : { beginAtZero: true, grid: { color: GRID } }, x: { grid: { display: false } } }
      }
    });
  }

  GP.charts = { doughnut, line, bar, stackedBar, multiLine, catColor };
})(window.GP = window.GP || {});
