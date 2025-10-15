/**
 * Swedish formatting utilities for PDF generation
 */

/**
 * Format number with Swedish decimal comma
 * @example formatSwedishDecimal(26.7) → "26,7"
 */
export function formatSwedishDecimal(num: number, decimals: number = 1): string {
  return num.toFixed(decimals).replace('.', ',');
}

/**
 * Format currency with Swedish formatting (space thousand separator, comma decimal)
 * @example formatSwedishCurrency(25877.07) → "25 877,07 SEK"
 */
export function formatSwedishCurrency(amount: number, includeCurrency: boolean = true): string {
  const formatted = amount.toFixed(2);
  const [whole, decimal] = formatted.split('.');
  
  // Add space thousand separator
  const withThousands = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  const result = `${withThousands},${decimal}`;
  return includeCurrency ? `${result} SEK` : result;
}

/**
 * Format value with unit (m², lpm, st)
 * @example formatUnit(26.7, 'm2') → "26,7 m²"
 */
export function formatUnit(value: number, unit: string): string {
  const formattedValue = formatSwedishDecimal(value);
  
  // Convert unit to display format
  const unitDisplay = unit === 'm2' ? 'm²' : unit;
  
  return `${formattedValue} ${unitDisplay}`;
}

/**
 * Format date in Swedish format
 * @example formatDate(new Date()) → "2025-10-15"
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Format room dimensions for display
 * @example formatRoomDimensions(4.5, 3.2, 2.4) → "4,5×3,2×2,4m"
 */
export function formatRoomDimensions(width: number, length: number, height: number): string {
  return `${formatSwedishDecimal(width)}×${formatSwedishDecimal(length)}×${formatSwedishDecimal(height)}m`;
}

