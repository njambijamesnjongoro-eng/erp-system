const PDFDocument = require('pdfkit');

const money = (value) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const labelize = (value) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatValue = (value, type) => {
  if (value === null || value === undefined || value === '') return '-';
  if (type === 'currency') return money(value);
  if (type === 'percent') return `${Number(value || 0).toFixed(2)}%`;
  if (type === 'date') return new Date(value).toLocaleDateString('en-KE');
  if (typeof value === 'number') return new Intl.NumberFormat('en-KE').format(value);
  return String(value);
};

const drawKeyValues = (doc, items) => {
  items.filter(Boolean).forEach(({ label, value, type }) => {
    doc.font('Helvetica-Bold').fontSize(10).text(`${label}: `, { continued: true });
    doc.font('Helvetica').text(formatValue(value, type));
  });
  doc.moveDown(0.6);
};

const drawTable = (doc, columns, rows) => {
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const widths = columns.map((col) => col.width || Math.floor(usableWidth / columns.length));

  const ensureSpace = (height = 32) => {
    if (doc.y + height > doc.page.height - doc.page.margins.bottom) doc.addPage();
  };

  ensureSpace(42);
  doc.font('Helvetica-Bold').fontSize(9);
  let x = doc.page.margins.left;
  const headerY = doc.y;
  columns.forEach((col, index) => {
    doc.text(col.label, x, headerY, { width: widths[index], continued: false });
    x += widths[index];
  });
  doc.moveTo(doc.page.margins.left, headerY + 16).lineTo(doc.page.width - doc.page.margins.right, headerY + 16).strokeColor('#999').stroke();
  doc.y = headerY + 22;

  doc.font('Helvetica').fontSize(9);
  if (!rows.length) {
    doc.text('No records found.');
    doc.moveDown();
    return;
  }

  rows.forEach((row) => {
    ensureSpace(34);
    x = doc.page.margins.left;
    const y = doc.y;
    let maxHeight = 16;
    columns.forEach((col, index) => {
      const value = formatValue(row[col.key], col.type);
      const height = doc.heightOfString(value, { width: widths[index] - 6 });
      maxHeight = Math.max(maxHeight, height);
      doc.text(value, x, y, { width: widths[index] - 6 });
      x += widths[index];
    });
    doc.y = y + maxHeight + 8;
  });
};

const sendPdfReport = (res, { title, subtitle, filters = [], summary = [], sections = [], filename }) => {
  const doc = new PDFDocument({ margin: 48, size: 'A4', bufferPages: true });
  const safeFilename = filename || `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  doc.pipe(res);

  doc.font('Helvetica-Bold').fontSize(18).text(title);
  if (subtitle) {
    doc.moveDown(0.2).font('Helvetica').fontSize(10).fillColor('#555').text(subtitle);
    doc.fillColor('#000');
  }
  doc.moveDown(0.2).font('Helvetica').fontSize(9).fillColor('#555').text(`Generated: ${new Date().toLocaleString('en-KE')}`);
  doc.fillColor('#000').moveDown();

  if (filters.length) {
    doc.font('Helvetica-Bold').fontSize(12).text('Filters');
    doc.moveDown(0.3);
    drawKeyValues(doc, filters);
  }

  if (summary.length) {
    doc.font('Helvetica-Bold').fontSize(12).text('Summary');
    doc.moveDown(0.3);
    drawKeyValues(doc, summary);
  }

  sections.forEach((section) => {
    doc.moveDown(0.6);
    doc.font('Helvetica-Bold').fontSize(12).text(section.title || 'Details');
    doc.moveDown(0.4);
    if (section.summary?.length) drawKeyValues(doc, section.summary);
    drawTable(doc, section.columns || [], section.rows || []);
  });

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(8).fillColor('#777')
      .text(`Page ${i + 1} of ${range.count}`, 48, doc.page.height - 36, { align: 'right' });
  }

  doc.end();
};

module.exports = { sendPdfReport, money, labelize };
