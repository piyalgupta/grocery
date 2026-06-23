/* PDF export via jsPDF + autotable (loaded as globals from CDN). */
(function (GP) {
  'use strict';

  const { money } = GP.utils;

  /** Render the given list to a downloadable PDF order sheet. */
  function exportList(list) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const total = GP.analytics.listTotal(list.items);

    doc.setFontSize(18);
    doc.setTextColor(47, 158, 91);
    doc.text('Grocery Order', 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text('List: ' + list.name, 14, 26);
    doc.text('Month: ' + list.month, 14, 31);
    if (list.store) doc.text('Store: ' + list.store, 14, 36);

    doc.autoTable({
      startY: list.store ? 42 : 37,
      head: [['#', 'Item', 'Qty', 'Unit', 'Price/Unit', 'Amount']],
      body: list.items.map((i, n) => [n + 1, i.name, i.qty, i.unit, money(i.price), money((i.qty || 0) * (i.price || 0))]),
      foot: [[{ content: 'Estimated Total', colSpan: 5, styles: { halign: 'right' } }, money(total)]],
      theme: 'striped',
      headStyles: { fillColor: [47, 158, 91] },
      footStyles: { fillColor: [234, 246, 236], textColor: [31, 122, 68], fontStyle: 'bold' },
      styles: { fontSize: 9 }
    });

    doc.save((list.name || 'grocery').replace(/\s+/g, '_') + '.pdf');
  }

  GP.pdf = { exportList };
})(window.GP = window.GP || {});
