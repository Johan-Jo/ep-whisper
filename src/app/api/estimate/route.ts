import { NextResponse } from 'next/server';
import { calculateRoom } from '@/lib/geometry';
import { RoomGeometry } from '@/lib/types';

interface EstimateRequest {
  geometry: RoomGeometry;
  tasks: Array<{
    phrase: string;
    layers?: number;
  }>;
}

// Mock data for demo - in production this would come from Excel catalog
const MOCK_TASKS = [
  {
    meps_id: 'MÅL-VÄGG-SPACKEL-M2',
    task_name_sv: 'Bredspackla väggar',
    task_name_en: 'Wide fill walls',
    unit: 'm2',
    surface_type: 'vägg' as const,
    synonyms: 'bredspackla väggar,spackla väggar,vägg spackel',
    labor_norm_per_unit: 0.15,
    material_factor_per_unit: 0.8,
    default_layers: 1,
    prep_required: true,
    price_material_per_unit: 45.5,
    price_labor_per_hour: 650,
    markup_pct: 25,
  },
  {
    meps_id: 'MÅL-VÄGG-GRUND-M2',
    task_name_sv: 'Grundmåla väggar',
    task_name_en: 'Prime walls',
    unit: 'm2',
    surface_type: 'vägg' as const,
    synonyms: 'grundmåla väggar,grund väggar,vägg grund',
    labor_norm_per_unit: 0.08,
    material_factor_per_unit: 0.3,
    default_layers: 1,
    prep_required: false,
    price_material_per_unit: 32.0,
    price_labor_per_hour: 650,
    markup_pct: 25,
  },
  {
    meps_id: 'MÅL-VÄGG-TÄCK-M2',
    task_name_sv: 'Täckmåla väggar',
    task_name_en: 'Paint walls',
    unit: 'm2',
    surface_type: 'vägg' as const,
    synonyms: 'täckmåla väggar,måla väggar,vägg måla',
    labor_norm_per_unit: 0.12,
    material_factor_per_unit: 0.4,
    default_layers: 2,
    prep_required: false,
    price_material_per_unit: 58.0,
    price_labor_per_hour: 650,
    markup_pct: 25,
  },
  {
    meps_id: 'MÅL-TAK-TÄCK-M2',
    task_name_sv: 'Måla tak',
    task_name_en: 'Paint ceiling',
    unit: 'm2',
    surface_type: 'tak' as const,
    synonyms: 'måla tak,tak måla,tak målnig',
    labor_norm_per_unit: 0.15,
    material_factor_per_unit: 0.4,
    default_layers: 2,
    prep_required: false,
    price_material_per_unit: 58.0,
    price_labor_per_hour: 650,
    markup_pct: 25,
  },
];

function findTaskByPhrase(phrase: string) {
  const lowerPhrase = phrase.toLowerCase();
  return MOCK_TASKS.find(task => 
    task.synonyms.toLowerCase().includes(lowerPhrase) ||
    task.task_name_sv.toLowerCase().includes(lowerPhrase)
  );
}

function calculateQuantity(surfaceType: string, calculation: RoomCalculation): number {
  switch (surfaceType) {
    case 'vägg':
      return calculation.walls_net;
    case 'tak':
      return calculation.ceiling_net;
    case 'golv':
      return calculation.floor_net;
    default:
      return 0;
  }
}

function calculateLineItem(task: MepsRow, quantity: number, layers: number) {
  const laborHours = task.labor_norm_per_unit * quantity;
  const materialAmount = task.material_factor_per_unit * quantity;
  const laborCost = laborHours * task.price_labor_per_hour;
  const materialCost = materialAmount * task.price_material_per_unit;
  const subtotal = laborCost + materialCost;
  const markup = subtotal * (task.markup_pct / 100);
  const total = subtotal + markup;

  return {
    meps_id: task.meps_id,
    task_name: task.task_name_sv,
    unit: task.unit,
    quantity: Math.round(quantity * 100) / 100,
    layers,
    labor_hours: Math.round(laborHours * 100) / 100,
    material_amount: Math.round(materialAmount * 100) / 100,
    labor_cost: Math.round(laborCost),
    material_cost: Math.round(materialCost),
    subtotal: Math.round(subtotal),
    markup: Math.round(markup),
    total: Math.round(total),
    section: task.prep_required ? 'Förberedelse' : 'Målning',
  };
}

export async function POST(request: Request) {
  try {
    const body: EstimateRequest = await request.json();

    // Calculate geometry
    const calculation = calculateRoom(body.geometry);

    // Map tasks and calculate line items
    const lineItems: LineItem[] = [];
    const unmappedTasks: string[] = [];

    for (const taskInput of body.tasks) {
      const task = findTaskByPhrase(taskInput.phrase);

      if (!task) {
        unmappedTasks.push(taskInput.phrase);
        continue;
      }

      const layers = taskInput.layers || task.default_layers || 1;
      const quantity = calculateQuantity(task.surface_type, calculation);

      if (quantity > 0) {
        const lineItem = calculateLineItem(task, quantity, layers);
        lineItems.push(lineItem);
      }
    }

    // Calculate totals
    const totals = {
      labor_cost: lineItems.reduce((sum, item) => sum + item.labor_cost, 0),
      material_cost: lineItems.reduce((sum, item) => sum + item.material_cost, 0),
      subtotal: lineItems.reduce((sum, item) => sum + item.subtotal, 0),
      markup: lineItems.reduce((sum, item) => sum + item.markup, 0),
      total: lineItems.reduce((sum, item) => sum + item.total, 0),
    };

    // Format output (Swedish style)
    const formatNumber = (num: number) => num.toLocaleString('sv-SE');
    const formatArea = (num: number) => num.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    let estimate = `=== RUMSBERÄKNING ===\n`;
    estimate += `Rum: ${body.geometry.W.toLocaleString('sv-SE', { minimumFractionDigits: 1 })}m × ${body.geometry.L.toLocaleString('sv-SE', { minimumFractionDigits: 1 })}m × ${body.geometry.H.toLocaleString('sv-SE', { minimumFractionDigits: 1 })}m\n`;
    estimate += `Väggar brutto: ${formatArea(calculation.walls_gross)}m²\n`;
    estimate += `Väggar netto: ${formatArea(calculation.walls_net)}m²\n`;
    estimate += `Tak brutto: ${formatArea(calculation.ceiling_gross)}m²\n`;
    estimate += `Tak netto: ${formatArea(calculation.ceiling_net)}m²\n`;
    estimate += `Golv brutto: ${formatArea(calculation.floor_gross)}m²\n`;
    estimate += `Golv netto: ${formatArea(calculation.floor_net)}m²\n\n`;

    estimate += `=== OFFERT ===\n\n`;

    // Group by section
    const forberedelse = lineItems.filter(item => item.section === 'Förberedelse');
    const malning = lineItems.filter(item => item.section === 'Målning');

    if (forberedelse.length > 0) {
      estimate += `FÖRBEREDELSE\n`;
      estimate += `${'='.repeat(50)}\n`;
      for (const item of forberedelse) {
        estimate += `${item.task_name} (${item.layers} lager)\n`;
        estimate += `  ${item.meps_id} | ${item.quantity}${item.unit} | ${formatNumber(item.total)} kr\n`;
      }
      estimate += `\n`;
    }

    if (malning.length > 0) {
      estimate += `MÅLNING\n`;
      estimate += `${'='.repeat(50)}\n`;
      for (const item of malning) {
        estimate += `${item.task_name} (${item.layers} lager)\n`;
        estimate += `  ${item.meps_id} | ${item.quantity}${item.unit} | ${formatNumber(item.total)} kr\n`;
      }
      estimate += `\n`;
    }

    estimate += `SUMMERING\n`;
    estimate += `${'='.repeat(50)}\n`;
    estimate += `Arbete: ${formatNumber(totals.labor_cost)} kr\n`;
    estimate += `Material: ${formatNumber(totals.material_cost)} kr\n`;
    estimate += `Pålägg (${25}%): ${formatNumber(totals.markup)} kr\n`;
    estimate += `Totalt: ${formatNumber(totals.total)} kr\n\n`;
    estimate += `OBS: ROT-avdrag ej inkluderat i beräkningen.\n`;

    return NextResponse.json({
      success: true,
      estimate,
      calculation,
      lineItems,
      totals,
      unmappedTasks,
    });
  } catch (error) {
    console.error('Estimate generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate estimate', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}