import { RoomGeometry, RoomCalculation, LineItem, EstimateTotals } from '../types';
import { SWEDISH_SECTIONS } from '../pricing/calculator';

/**
 * Format room geometry summary in Swedish
 */
export function formatGeometrySummary(
  geometry: RoomGeometry,
  calculation: RoomCalculation
): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('                    RUMSMÅTT / ROOM DIMENSIONS');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Bredd (W):           ${formatSwedishNumber(geometry.W)} m`);
  lines.push(`Längd (L):           ${formatSwedishNumber(geometry.L)} m`);
  lines.push(`Höjd (H):            ${formatSwedishNumber(geometry.H)} m`);
  lines.push(`Omkrets:             ${formatSwedishNumber(2 * (geometry.W + geometry.L))} lpm`);
  lines.push('');

  // Openings
  if (geometry.doors.length > 0 || geometry.windows.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('ÖPPNINGAR / OPENINGS');
    lines.push('───────────────────────────────────────────────────────────');
    
    if (geometry.doors.length > 0) {
      lines.push(`Dörrar:              ${geometry.doors.length} st`);
      geometry.doors.forEach((door, i) => {
        const w = door.w ?? 0.9;
        const h = door.h ?? 2.1;
        const sides = door.sides ?? 1;
        lines.push(`  ${i + 1}. ${formatSwedishNumber(w)}m × ${formatSwedishNumber(h)}m${sides === 2 ? ' (båda sidor)' : ''}`);
      });
    }

    if (geometry.windows.length > 0) {
      lines.push(`Fönster:             ${geometry.windows.length} st`);
      geometry.windows.forEach((window, i) => {
        lines.push(`  ${i + 1}. ${formatSwedishNumber(window.w)}m × ${formatSwedishNumber(window.h)}m`);
      });
    }
    lines.push('');
  }

  // Wardrobes
  if (geometry.wardrobes.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('GARDEROBER / WARDROBES');
    lines.push('───────────────────────────────────────────────────────────');
    geometry.wardrobes.forEach((wardrobe, i) => {
      const coverage = wardrobe.coverage_pct ?? 100;
      lines.push(`  ${i + 1}. Längd: ${formatSwedishNumber(wardrobe.length)}m (täckning ${coverage}%)`);
    });
    lines.push('');
  }

  // Calculated areas
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('                    BERÄKNADE YTOR / CALCULATED AREAS');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Väggar brutto:       ${formatSwedishNumber(calculation.walls_gross)} m²`);
  lines.push(`Väggar netto:        ${formatSwedishNumber(calculation.walls_net)} m²`);
  lines.push(`Tak:                 ${formatSwedishNumber(calculation.ceiling_net)} m²`);
  lines.push(`Golv:                ${formatSwedishNumber(calculation.floor_net)} m²`);
  lines.push('');
  lines.push(`Avdrag öppningar:    ${formatSwedishNumber(calculation.openings_total)} m²`);
  lines.push(`Avdrag garderober:   ${formatSwedishNumber(calculation.wardrobes_deduction)} m²`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Format estimate table with line items
 */
export function formatEstimateTable(
  lineItems: LineItem[],
  totals: EstimateTotals,
  groupedBySection?: { [key: string]: LineItem[] }
): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════════════════════════════');
  lines.push('                                    OFFERT / ESTIMATE');
  lines.push('═══════════════════════════════════════════════════════════════════════════════════════');
  lines.push('');

  // Table header
  lines.push('─'.repeat(93));
  lines.push(
    padRight('MEPS KOD', 25) +
    padRight('ARBETSMOMENT', 30) +
    padRight('ANTAL', 10) +
    padRight('ENHET', 8) +
    padRight('À-PRIS', 12) +
    padRight('SUMMA', 12)
  );
  lines.push('─'.repeat(93));

  if (groupedBySection) {
    // Display by sections
    for (const [sectionKey, sectionItems] of Object.entries(groupedBySection)) {
      if (sectionItems.length === 0) continue;

      const sectionName = SWEDISH_SECTIONS[sectionKey as keyof typeof SWEDISH_SECTIONS];
      lines.push('');
      lines.push(`▸ ${sectionName.toUpperCase()}`);
      lines.push('');

      let sectionTotal = 0;
      for (const item of sectionItems) {
        lines.push(formatLineItem(item));
        sectionTotal += item.subtotal;
      }

      lines.push('─'.repeat(93));
      lines.push(
        padRight('', 73) +
        padRight('Delsumma:', 12) +
        padLeft(formatSwedishNumber(sectionTotal) + ' kr', 12)
      );
    }
  } else {
    // Display all items without grouping
    for (const item of lineItems) {
      lines.push(formatLineItem(item));
    }
  }

  // Totals
  lines.push('═'.repeat(93));
  lines.push(
    padRight('', 73) +
    padRight('Arbetskostnad:', 12) +
    padLeft(formatSwedishNumber(totals.labor_total) + ' kr', 12)
  );
  lines.push(
    padRight('', 73) +
    padRight('Materialkostnad:', 12) +
    padLeft(formatSwedishNumber(totals.material_total) + ' kr', 12)
  );
  lines.push(
    padRight('', 73) +
    padRight('Påslag:', 12) +
    padLeft(formatSwedishNumber(totals.markup_total) + ' kr', 12)
  );
  lines.push('─'.repeat(93));
  lines.push(
    padRight('', 73) +
    padRight('TOTALT:', 12) +
    padLeft(formatSwedishNumber(totals.grand_total) + ' kr', 12)
  );
  lines.push('═'.repeat(93));

  return lines.join('\n');
}

/**
 * Format a single line item row
 */
function formatLineItem(item: LineItem): string {
  return (
    padRight(item.meps_id, 25) +
    padRight(item.name, 30) +
    padRight(formatSwedishNumber(item.qty), 10) +
    padRight(item.unit, 8) +
    padRight(formatSwedishNumber(item.unit_price) + ' kr', 12) +
    padLeft(formatSwedishNumber(item.subtotal) + ' kr', 12)
  );
}

/**
 * Add ROT note for Swedish tax deduction
 */
export function formatRotNote(): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════════════════════════════');
  lines.push('                                    ROT-AVDRAG');
  lines.push('═══════════════════════════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('OBS! ROT-avdraget beräknas inte i detta underlag.');
  lines.push('Kontakta er revisor eller skattekonsult för korrekt beräkning av ROT-avdrag.');
  lines.push('');
  lines.push('Arbetskostnaden ovan kan vara berättigad till ROT-avdrag enligt Skatteverkets regler.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Format number in Swedish style (comma as decimal separator)
 */
export function formatSwedishNumber(num: number): string {
  return num.toFixed(1).replace('.', ',');
}

/**
 * Pad string to the right
 */
function padRight(str: string, length: number): string {
  return str.padEnd(length, ' ');
}

/**
 * Pad string to the left
 */
function padLeft(str: string, length: number): string {
  return str.padStart(length, ' ');
}

/**
 * Create complete estimate output
 */
export function formatCompleteEstimate(
  geometry: RoomGeometry,
  calculation: RoomCalculation,
  lineItems: LineItem[],
  totals: EstimateTotals,
  groupedBySection?: { [key: string]: LineItem[] }
): string {
  const sections: string[] = [];

  sections.push(formatGeometrySummary(geometry, calculation));
  sections.push('');
  sections.push(formatEstimateTable(lineItems, totals, groupedBySection));
  sections.push(formatRotNote());

  return sections.join('\n');
}

