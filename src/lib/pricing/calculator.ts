import { MepsRow, LineItem, EstimateTotals } from '../types';

export interface PricingConfig {
  labor_price_per_hour: number; // Default: 500 SEK
  global_markup_pct: number; // Default: 10%
}

const DEFAULT_CONFIG: PricingConfig = {
  labor_price_per_hour: 500,
  global_markup_pct: 10,
};

/**
 * Calculate unit price for a MEPS task
 * Formula: (labor_norm × labor_price) + material_cost
 */
export function calculateUnitPrice(
  task: MepsRow,
  config: PricingConfig = DEFAULT_CONFIG
): number {
  const laborPrice = task.price_labor_per_hour ?? config.labor_price_per_hour;
  const laborCost = task.labor_norm_per_unit * laborPrice;
  
  const materialCost = task.price_material_per_unit ?? 0;
  
  return laborCost + materialCost;
}

/**
 * Calculate line item for a task with quantity
 * Applies layers multiplier and markup
 */
export function calculateLineItem(
  task: MepsRow,
  quantity: number,
  layers: number = 1,
  config: PricingConfig = DEFAULT_CONFIG
): LineItem {
  const adjustedQuantity = quantity * layers;
  const unitPrice = calculateUnitPrice(task, config);
  
  // Apply markup (row-level or global)
  const markupPct = task.markup_pct ?? config.global_markup_pct;
  const priceWithMarkup = unitPrice * (1 + markupPct / 100);
  
  const subtotal = adjustedQuantity * priceWithMarkup;

  return {
    meps_id: task.meps_id,
    name: task.task_name_sv,
    unit: task.unit,
    qty: adjustedQuantity,
    unit_price: Math.round(priceWithMarkup * 100) / 100, // Round to 2 decimals
    subtotal: Math.round(subtotal * 100) / 100, // Round to 2 decimals
  };
}

/**
 * Calculate totals from line items
 */
export function calculateTotals(
  lineItems: LineItem[],
  config: PricingConfig = DEFAULT_CONFIG
): EstimateTotals {
  let labor_total = 0;
  let material_total = 0;

  // For detailed breakdown, we'd need to recalculate
  // For now, we'll use a simplified approach
  const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
  
  // Approximate labor/material split (simplified for MVP)
  // In reality, we'd track this during line item calculation
  labor_total = subtotal * 0.6; // Approximate 60% labor
  material_total = subtotal * 0.4; // Approximate 40% material
  
  const markup_total = subtotal - (subtotal / (1 + config.global_markup_pct / 100));
  const grand_total = subtotal;

  return {
    labor_total: Math.round(labor_total * 100) / 100,
    material_total: Math.round(material_total * 100) / 100,
    markup_total: Math.round(markup_total * 100) / 100,
    grand_total: Math.round(grand_total * 100) / 100,
  };
}

/**
 * Calculate detailed totals with proper labor/material tracking
 */
export function calculateDetailedTotals(
  tasks: Array<{ task: MepsRow; quantity: number; layers: number }>,
  config: PricingConfig = DEFAULT_CONFIG
): EstimateTotals {
  let labor_total = 0;
  let material_total = 0;

  for (const { task, quantity, layers } of tasks) {
    const adjustedQuantity = quantity * layers;
    const laborPrice = task.price_labor_per_hour ?? config.labor_price_per_hour;
    const laborCost = task.labor_norm_per_unit * laborPrice * adjustedQuantity;
    const materialCost = (task.price_material_per_unit ?? 0) * adjustedQuantity;

    labor_total += laborCost;
    material_total += materialCost;
  }

  const subtotal = labor_total + material_total;
  const markup_total = subtotal * (config.global_markup_pct / 100);
  const grand_total = subtotal + markup_total;

  return {
    labor_total: Math.round(labor_total * 100) / 100,
    material_total: Math.round(material_total * 100) / 100,
    markup_total: Math.round(markup_total * 100) / 100,
    grand_total: Math.round(grand_total * 100) / 100,
  };
}

/**
 * Swedish section labels for estimate grouping
 */
export const SWEDISH_SECTIONS = {
  PREP: 'Förberedelse',
  PAINT: 'Målning',
  FINISH: 'Finish',
} as const;

/**
 * Determine which section a task belongs to
 */
export function getTaskSection(task: MepsRow): keyof typeof SWEDISH_SECTIONS {
  const taskNameLower = task.task_name_sv.toLowerCase();
  const mepsIdLower = task.meps_id.toLowerCase();

  // Prep tasks
  if (
    task.prep_required ||
    taskNameLower.includes('spackla') ||
    taskNameLower.includes('slipa') ||
    taskNameLower.includes('grund') ||
    mepsIdLower.includes('spack') ||
    mepsIdLower.includes('slipa') ||
    mepsIdLower.includes('grund')
  ) {
    return 'PREP';
  }

  // Finish tasks (varnish, lacquer, etc.)
  if (
    taskNameLower.includes('lack') ||
    taskNameLower.includes('fernissa') ||
    taskNameLower.includes('finish')
  ) {
    return 'FINISH';
  }

  // Default to paint
  return 'PAINT';
}

/**
 * Group line items by section
 */
export function groupLineItemsBySection(lineItems: LineItem[], catalog: MepsCatalog): {
  [key in keyof typeof SWEDISH_SECTIONS]: LineItem[];
} {
  const grouped: any = {
    PREP: [],
    PAINT: [],
    FINISH: [],
  };

  for (const item of lineItems) {
    const task = catalog.getTask(item.meps_id);
    if (task) {
      const section = getTaskSection(task);
      grouped[section].push(item);
    }
  }

  return grouped;
}

