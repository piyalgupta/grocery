/* Thin wrapper around Chart.js. Keeps chart instances in a registry so each
   redraw destroys the previous instance (avoids the canvas-reuse error). */
(function (GP) {
  'use strict';

  const { $ } = GP.utils;
  const { PALETTE } = GP.constants;

  const registry = {};

  function baseOpts() {
    return { responsive: true, plugins: { legend: { labels: { boxWidth: 12, font: { size: 11 } } } } };
  }

  function destroy(id) {
    if (registry[id]) registry[id].destroy();
  }

  function render(id, config) {
    destroy(id);
    registry[id] = new Chart($('#' + id), config);
  }

  function doughnut(id, labels, data) {
    render(id, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: PALETTE }] },
      options: baseOpts()
    });
  }

  function line(id, labels, data) {
    render(id, {
      type: 'line',
      data: {
        labels,
        datasets: [{ data, label: 'Spend', borderColor: '#2e7d32', backgroundColor: 'rgba(46,125,50,.15)', fill: true, tension: .3 }]
      },
      options: { ...baseOpts(), plugins: { legend: { display: false } } }
    });
  }

  function bar(id, labels, data) {
    render(id, {
      type: 'bar',
      data: { labels, datasets: [{ data, label: 'Qty', backgroundColor: '#66bb6a' }] },
      options: { ...baseOpts(), plugins: { legend: { display: false } }, indexAxis: 'y' }
    });
  }

  GP.charts = { doughnut, line, bar };
})(window.GP = window.GP || {});
