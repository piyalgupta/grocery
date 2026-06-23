/* PDF export via jsPDF + autotable (loaded as globals from CDN). */
(function (GP) {
  'use strict';

  /** Render the given list to a downloadable PDF order sheet. */
  function exportList(list) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(63, 125, 84);
    doc.text('Grocery Order', 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text('List: ' + list.name, 14, 26);
    doc.text('Month: ' + list.month, 14, 31);
    if (list.store) doc.text('Store: ' + list.store, 14, 36);

    doc.autoTable({
      startY: list.store ? 42 : 37,
      head: [['#', 'Item', 'Qty', 'Unit', '✓']],
      body: list.items.map((i, n) => [n + 1, i.name, i.qty, i.unit, '']),
      theme: 'striped',
      headStyles: { fillColor: [90, 156, 110] },
      styles: { fontSize: 9 },
      columnStyles: { 4: { cellWidth: 16, halign: 'center' } }
    });

    doc.save((list.name || 'grocery').replace(/\s+/g, '_') + '.pdf');
  }

  GP.pdf = { exportList };
})(window.GP = window.GP || {});
