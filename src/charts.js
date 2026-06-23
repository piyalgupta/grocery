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

  /**
   * Vertical "hero" bars for the month-on-month trend. The current month is
   * drawn in the deep accent; earlier months are a soft tint so the eye lands
   * on the latest. Value labels sit above each bar for instant readability.
   */
  function momBars(id, labels, data, currentIdx) {
    render(id, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map((_, i) => (i === currentIdx ? '#2f9e5b' : 'rgba(63,174,90,.28)')),
          borderRadius: 10, borderSkipped: false, maxBarThickness: 70
        }]
      },
      options: {
        ...baseOpts(),
        layout: { padding: { top: 24 } },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ' ' + money(c.parsed.y) } },
          valueLabels: { currentIdx }
        },
        scales: {
          y: moneyAxis({ ticks: { callback: (v) => money(v), maxTicksLimit: 4 } }),
          x: { grid: { display: false }, ticks: { font: { size: 12 } } }
        }
      },
      plugins: [valueLabelsPlugin]
    });
  }

  /** Draws the ₹ value above each hero bar (current month emphasised). */
  const valueLabelsPlugin = {
    id: 'valueLabels',
    afterDatasetsDraw(chart, _args, opts) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      meta.data.forEach((bar, i) => {
        const v = chart.data.datasets[0].data[i];
        if (v == null) return;
        const isCur = i === (opts.currentIdx ?? -1);
        ctx.font = (isCur ? '600 ' : '500 ') + (isCur ? 13 : 11) + "px 'JetBrains Mono',monospace";
        ctx.fillStyle = isCur ? '#2f7d4f' : '#8c95a3';
        ctx.fillText(money(v), bar.x, bar.y - 6);
      });
      ctx.restore();
    }
  };

  /** Horizontal bar (top items by qty / spend / % change).
      `opts`: { color | colors[], moneyX, pctX, xTitle, tipLabel }. */
  function bar(id, labels, data, opts) {
    const o = opts || {};
    const xTicks = o.moneyX ? { callback: (v) => money(v) }
      : o.pctX ? { callback: (v) => (v > 0 ? '+' : '') + v + '%' }
      : { precision: 0 };
    render(id, {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: o.colors || o.color || '#3fae5a', borderRadius: 6 }] },
      options: {
        ...baseOpts(), indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: o.tipLabel ? { callbacks: { label: (c) => ' ' + o.tipLabel(c) } } : undefined
        },
        scales: {
          x: { beginAtZero: true, grid: { color: GRID, zeroLineColor: GRID }, ticks: xTicks, title: o.xTitle ? { display: true, text: o.xTitle, color: '#9aa3b0' } : undefined },
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

  GP.charts = { doughnut, line, bar, stackedBar, multiLine, momBars, catColor };
})(window.GP = window.GP || {});
