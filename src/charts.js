/* Thin wrapper around Chart.js. Keeps chart instances in a registry so each
   redraw destroys the previous instance (avoids the canvas-reuse error).
   Canvases are sized manually from their parent box (responsive:false) so the
   glass chart cards keep a fixed height; callers re-render on resize. */
(function (GP) {
  'use strict';

  const { $ } = GP.utils;
  const { PALETTE } = GP.constants;

  const registry = {};

  /** Apply the global mono-font / muted-colour theme once. */
  function applyDefaults() {
    if (applyDefaults._done || !window.Chart) return;
    Chart.defaults.font.family = "'JetBrains Mono',monospace";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = '#8c95a3';
    applyDefaults._done = true;
  }

  function baseOpts() {
    return { responsive: false, maintainAspectRatio: false, animation: false };
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

  function doughnut(id, labels, data) {
    render(id, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: PALETTE, borderWidth: 2, borderColor: 'rgba(255,255,255,.7)' }] },
      options: { ...baseOpts(), cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10 } } } }
    });
  }

  function line(id, labels, data) {
    render(id, {
      type: 'line',
      data: {
        labels,
        datasets: [{ data, borderColor: '#2f9e5b', backgroundColor: 'rgba(47,158,91,.14)', fill: true, tension: .35, pointBackgroundColor: '#2f9e5b', borderWidth: 2 }]
      },
      options: { ...baseOpts(), plugins: { legend: { display: false } } }
    });
  }

  function bar(id, labels, data) {
    render(id, {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: '#3fae5a', borderRadius: 6 }] },
      options: { ...baseOpts(), indexAxis: 'y', plugins: { legend: { display: false } } }
    });
  }

  GP.charts = { doughnut, line, bar };
})(window.GP = window.GP || {});
