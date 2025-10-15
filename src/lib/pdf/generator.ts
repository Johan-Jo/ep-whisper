/**
 * PDF generation for estimate reports
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFEstimateData, PDFConfig, DEFAULT_PDF_CONFIG } from './types';
import {
  formatSwedishCurrency,
  formatSwedishDecimal,
  formatUnit,
  formatDate,
  formatRoomDimensions,
} from './formatters';

/**
 * Generate estimate PDF with Swedish formatting
 */
export function generateEstimatePDF(
  data: PDFEstimateData,
  config: PDFConfig = DEFAULT_PDF_CONFIG
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let currentY = config.margin;

  // Header
  currentY = addHeader(doc, data, config, currentY);
  currentY += 10;

  // Room Details
  currentY = addRoomDetails(doc, data, config, currentY);
  currentY += 10;

  // Line Items by Section
  currentY = addLineItemsTables(doc, data, config, currentY);
  currentY += 10;

  // Totals
  currentY = addTotals(doc, data, config, currentY);
  currentY += 15;

  // ROT Note
  addROTNote(doc, config, currentY);

  return doc;
}

/**
 * Add header with company name and document title
 */
function addHeader(
  doc: jsPDF,
  data: PDFEstimateData,
  config: PDFConfig,
  startY: number
): number {
  const { companyName, documentTitle, headerFontSize, primaryColor } = config;

  // Company name
  doc.setFontSize(headerFontSize);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, config.margin, startY);

  // Document title
  doc.setFontSize(headerFontSize - 2);
  doc.text(documentTitle, config.margin, startY + 8);

  // Date (right-aligned)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateStr = `Datum: ${formatDate(data.date)}`;
  const dateWidth = doc.getTextWidth(dateStr);
  doc.text(dateStr, config.pageWidth - config.margin - dateWidth, startY);

  return startY + 15;
}

/**
 * Add room details section
 */
function addRoomDetails(
  doc: jsPDF,
  data: PDFEstimateData,
  config: PDFConfig,
  startY: number
): number {
  const { margin, bodyFontSize, textColor } = config;
  const { roomName, geometry } = data;

  doc.setFontSize(bodyFontSize);
  doc.setTextColor(textColor);
  doc.setFont('helvetica', 'bold');

  // Room name
  doc.text(`Rum: ${roomName}`, margin, startY);

  // Dimensions
  doc.setFont('helvetica', 'normal');
  const dims = formatRoomDimensions(
    geometry.width,
    geometry.length,
    geometry.height
  );
  doc.text(`Dimensioner: ${dims}`, margin, startY + 6);

  // Areas summary
  doc.text(
    `Väggyta: ${formatUnit(geometry.walls_net, 'm2')} | ` +
    `Takyta: ${formatUnit(geometry.ceiling_net, 'm2')} | ` +
    `Golvyta: ${formatUnit(geometry.floor_net, 'm2')}`,
    margin,
    startY + 12
  );

  return startY + 18;
}

/**
 * Add line items tables organized by section
 */
function addLineItemsTables(
  doc: jsPDF,
  data: PDFEstimateData,
  config: PDFConfig,
  startY: number
): number {
  const { margin, tableFontSize, primaryColor, textColor } = config;
  let currentY = startY;

  // Group line items by section
  const sections = groupLineItemsBySection(data.lineItems);

  for (const [sectionName, items] of Object.entries(sections)) {
    if (items.length === 0) continue;

    // Section header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text(sectionName.toUpperCase(), margin, currentY);
    currentY += 8;

    // Table data
    const tableData = items.map((item) => [
      item.meps_id || '',
      item.task_name_sv,
      formatUnit(item.quantity, item.unit),
      formatSwedishCurrency(item.unitPrice, false),
      formatSwedishCurrency(item.lineTotal, false),
    ]);

    // Draw table
    autoTable(doc, {
      startY: currentY,
      head: [['Kod', 'Uppgift', 'Antal', 'Pris/enhet', 'Summa']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [191, 255, 0], // Lime accent
        textColor: [0, 0, 0],      // Black text
        fontStyle: 'bold',
        fontSize: tableFontSize,
      },
      bodyStyles: {
        fontSize: tableFontSize,
        textColor: [51, 51, 51],   // Dark gray
      },
      columnStyles: {
        0: { cellWidth: 25 },  // Kod
        1: { cellWidth: 70 },  // Uppgift
        2: { cellWidth: 30 },  // Antal
        3: { cellWidth: 30 },  // Pris/enhet
        4: { cellWidth: 30 },  // Summa
      },
      margin: { left: margin, right: margin },
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;

    // Section subtotal
    const sectionTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Delsumma ${sectionName}: ${formatSwedishCurrency(sectionTotal)}`,
      config.pageWidth - margin - 60,
      currentY
    );
    currentY += 10;
  }

  return currentY;
}

/**
 * Add totals section
 */
function addTotals(
  doc: jsPDF,
  data: PDFEstimateData,
  config: PDFConfig,
  startY: number
): number {
  const { margin, bodyFontSize, primaryColor } = config;
  const rightX = config.pageWidth - margin - 70;

  doc.setFontSize(bodyFontSize + 2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text('TOTALT', margin, startY);

  doc.setFontSize(bodyFontSize);
  doc.setFont('helvetica', 'normal');

  // Calculate labor and material totals
  const laborTotal = data.lineItems.reduce(
    (sum, item) => sum + (item.quantity * item.laborNormPerUnit * 450), // Assuming 450 SEK/h
    0
  );
  const materialTotal = data.lineItems.reduce(
    (sum, item) => sum + (item.quantity * (item.materialPricePerUnit || 0)),
    0
  );

  let currentY = startY + 8;

  doc.text('Arbete:', rightX - 20, currentY);
  doc.text(formatSwedishCurrency(laborTotal), rightX + 20, currentY);
  currentY += 6;

  doc.text('Material:', rightX - 20, currentY);
  doc.text(formatSwedishCurrency(materialTotal), rightX + 20, currentY);
  currentY += 6;

  doc.text('Delsumma:', rightX - 20, currentY);
  doc.text(formatSwedishCurrency(data.subtotal), rightX + 20, currentY);
  currentY += 6;

  doc.text(`Pålägg (${data.markupPercent}%):`, rightX - 20, currentY);
  doc.text(formatSwedishCurrency(data.markup), rightX + 20, currentY);
  currentY += 8;

  // Grand total with line
  doc.setLineWidth(0.5);
  doc.line(rightX - 25, currentY - 2, config.pageWidth - margin, currentY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(bodyFontSize + 2);
  doc.text('TOTALT:', rightX - 20, currentY + 3);
  doc.text(formatSwedishCurrency(data.total), rightX + 20, currentY + 3);

  return currentY + 10;
}

/**
 * Add ROT note footer
 */
function addROTNote(
  doc: jsPDF,
  config: PDFConfig,
  startY: number
): void {
  const { margin, bodyFontSize, textColor } = config;

  doc.setFontSize(bodyFontSize);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor);
  doc.text('ROT-AVDRAG', margin, startY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodyFontSize - 1);
  
  const rotText = [
    'Med ROT-avdrag kan du få tillbaka 30% av arbetskostnaden (max 75 000 SEK per person och år).',
    'ROT-avdrag gäller för renovering, ombyggnad och tillbyggnad av permanentbostad.',
    'Kontakta Skatteverket eller din rådgivare för mer information om villkor och ansökan.',
  ];

  let currentY = startY + 6;
  rotText.forEach((line) => {
    doc.text(line, margin, currentY, { maxWidth: config.pageWidth - 2 * margin });
    currentY += 5;
  });
}

/**
 * Group line items by section
 */
function groupLineItemsBySection(lineItems: LineItem[]): Record<string, LineItem[]> {
  const sections: Record<string, LineItem[]> = {
    'Förberedelse': [],
    'Målning': [],
    'Avslutning': [],
  };

  lineItems.forEach((item) => {
    const taskLower = item.task_name_sv.toLowerCase();
    
    if (taskLower.includes('täck') || taskLower.includes('maskera') || 
        taskLower.includes('flytta') || taskLower.includes('spackla') ||
        taskLower.includes('slipa')) {
      sections['Förberedelse'].push(item);
    } else if (taskLower.includes('städ') || taskLower.includes('återställ')) {
      sections['Avslutning'].push(item);
    } else {
      sections['Målning'].push(item);
    }
  });

  return sections;
}

