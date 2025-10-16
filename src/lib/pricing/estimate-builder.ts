import { MepsRow, LineItem, EstimateTotals, RoomCalculation } from '../types';
import { MepsCatalog } from '../excel/catalog';
import {
  PricingConfig,
  calculateLineItem,
  calculateDetailedTotals,
  groupLineItemsBySection,
  calculateSectionTotals,
  SWEDISH_SECTIONS,
  calculateRotPotential,
  ROT_NOTE_SV,
} from './calculator';
import {
  mapSpokenTaskToMeps,
  resolveSurfaceType,
  selectQuantityBySurface,
  parseLayerCount,
  validateMepsId,
} from './mapper';

export interface TaskRequest {
  phrase: string; // Swedish phrase like "spackla väggar"
  quantity?: number; // Override quantity if not from room calculation
  layers?: number; // Override layer count (default from task or parsed)
}

export interface EstimateRequest {
  catalog: MepsCatalog;
  roomCalculation: RoomCalculation;
  tasks: TaskRequest[];
  config?: PricingConfig;
}

export interface EstimateSection {
  title: string;
  items: LineItem[];
  subtotal: number;
}

export interface CompleteEstimate {
  line_items: LineItem[];
  sections: EstimateSection[];
  totals: EstimateTotals;
  rot_info: {
    eligible_amount: number;
    potential_deduction: number;
    note: typeof ROT_NOTE_SV;
  };
  warnings: string[];
  unmapped_phrases: string[];
}

/**
 * Build a complete estimate from spoken Swedish tasks
 * This is the main entry point for Epic 4
 */
export function buildEstimate(request: EstimateRequest): CompleteEstimate {
  const { catalog, roomCalculation, tasks, config } = request;
  const lineItems: LineItem[] = [];
  const warnings: string[] = [];
  const unmapped_phrases: string[] = [];
  
  // Track tasks for detailed totals calculation
  const tasksForTotals: Array<{ task: MepsRow; quantity: number; layers: number }> = [];

  // Process each spoken task
  for (const taskRequest of tasks) {
    const { phrase, quantity: overrideQuantity, layers: overrideLayers } = taskRequest;

    // Map spoken phrase to MEPS task
    const surfaceType = resolveSurfaceType(phrase);
    const mappingResult = mapSpokenTaskToMeps(phrase, catalog, surfaceType);

    // Guard rail: Skip if no match found (never hallucinate)
    if (!mappingResult.task) {
      unmapped_phrases.push(phrase);
      warnings.push(
        `Kunde inte hitta uppgiften "${phrase}" i MEPS-katalogen. Hoppade över denna uppgift.`
      );
      continue;
    }

    // Guard rail: Validate meps_id exists
    if (!validateMepsId(mappingResult.task.meps_id, catalog)) {
      warnings.push(
        `MEPS-ID ${mappingResult.task.meps_id} finns inte i katalogen. Detta borde inte hända.`
      );
      continue;
    }

    const task = mappingResult.task;

    // Determine quantity
    let quantity: number;
    if (overrideQuantity !== undefined) {
      quantity = overrideQuantity;
    } else if (task.unit === 'st') {
      // For pieces, default to 1 unless specified
      quantity = 1;
    } else {
      // Auto-select quantity based on surface type and room calculation
      quantity = selectQuantityBySurface(surfaceType, roomCalculation, 1);
    }

    // Determine layer count
    let layers: number;
    if (overrideLayers !== undefined) {
      layers = overrideLayers;
    } else {
      // Try to parse from phrase or use task default
      const parsedLayers = parseLayerCount(phrase);
      layers = parsedLayers > 1 ? parsedLayers : (task.default_layers ?? 1);
    }

    // Skip if quantity is 0 (e.g., no applicable surface)
    if (quantity <= 0) {
      warnings.push(
        `Hoppar över "${task.task_name_sv}" (${task.meps_id}) eftersom kvantiteten är 0 för denna yta.`
      );
      continue;
    }

    // Low confidence warning
    if (mappingResult.confidence < 0.7) {
      warnings.push(
        `Låg matchningssäkerhet (${(mappingResult.confidence * 100).toFixed(0)}%) för "${phrase}" → "${task.task_name_sv}". Verifiera att detta är rätt uppgift.`
      );
    }

    // Calculate line item
    const lineItem = calculateLineItem(task, quantity, layers, config);
    lineItems.push(lineItem);

    // Track for totals
    tasksForTotals.push({ task, quantity, layers });
  }

  // Calculate detailed totals with proper labor/material breakdown
  const totals = calculateDetailedTotals(tasksForTotals, config);

  // Group line items by Swedish sections
  const groupedItems = groupLineItemsBySection(lineItems, catalog);
  const sectionTotals = calculateSectionTotals(groupedItems);

  // Build sections array
  const sections: EstimateSection[] = [
    {
      title: SWEDISH_SECTIONS.PREP,
      items: groupedItems.PREP,
      subtotal: Math.round(sectionTotals.PREP * 100) / 100,
    },
    {
      title: SWEDISH_SECTIONS.PAINT,
      items: groupedItems.PAINT,
      subtotal: Math.round(sectionTotals.PAINT * 100) / 100,
    },
    {
      title: SWEDISH_SECTIONS.FINISH,
      items: groupedItems.FINISH,
      subtotal: Math.round(sectionTotals.FINISH * 100) / 100,
    },
  ];

  // Calculate ROT information
  const rotPotential = calculateRotPotential(totals.labor_total);

  return {
    line_items: lineItems,
    sections,
    totals,
    rot_info: {
      eligible_amount: rotPotential.eligible_amount,
      potential_deduction: rotPotential.potential_deduction,
      note: ROT_NOTE_SV,
    },
    warnings,
    unmapped_phrases,
  };
}

/**
 * Quick estimate builder for single task
 * Useful for testing and simple scenarios
 */
export function buildSingleTaskEstimate(
  catalog: MepsCatalog,
  roomCalculation: RoomCalculation,
  phrase: string,
  config?: PricingConfig
): CompleteEstimate {
  return buildEstimate({
    catalog,
    roomCalculation,
    tasks: [{ phrase }],
    config,
  });
}

/**
 * Build estimate from array of task phrases
 * Convenience function for common use case
 */
export function buildEstimateFromPhrases(
  catalog: MepsCatalog,
  roomCalculation: RoomCalculation,
  phrases: string[],
  config?: PricingConfig
): CompleteEstimate {
  return buildEstimate({
    catalog,
    roomCalculation,
    tasks: phrases.map((phrase) => ({ phrase })),
    config,
  });
}

