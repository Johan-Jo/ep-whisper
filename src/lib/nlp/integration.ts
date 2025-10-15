/**
 * NLP Integration Service
 * 
 * Integrates the NLP parser with the existing voice processing and pricing systems
 * to automatically generate estimates from Swedish voice commands.
 */

import { parseSwedishIntent, validateParsedIntent, formatParsedIntent, type ParsedIntent } from './parser';
import { mapSpokenTaskToMeps, calculateUnitPrice } from '@/lib/pricing/mapper';
import { type RoomCalculation, type MepsRow, type LineItem } from '@/lib/types';
import { type VoiceProcessingResult } from '@/lib/openai';
import { MepsCatalog } from '@/lib/excel/catalog';

export interface VoiceEstimateRequest {
  transcription: string;
  roomCalculation: RoomCalculation;
  mepsCatalog: MepsCatalog; // Changed from MepsRow[] to MepsCatalog
}

export interface VoiceEstimateResult {
  success: boolean;
  transcription: string;
  parsedIntent: ParsedIntent;
  mappedTasks: LineItem[];
  estimate: {
    subtotal: number;
    markup: number;
    total: number;
    currency: string;
  };
  errors?: string[];
}

/**
 * Generate estimate from voice command
 */
export async function generateEstimateFromVoice(
  request: VoiceEstimateRequest
): Promise<VoiceEstimateResult> {
  const errors: string[] = [];
  
  try {
    // Step 1: Parse the Swedish intent
    const parsedIntent = parseSwedishIntent(request.transcription);
    
    // Step 2: Validate the parsed intent
    if (!validateParsedIntent(parsedIntent)) {
      errors.push('Could not parse painting tasks from voice command');
      return {
        success: false,
        transcription: request.transcription,
        parsedIntent,
        mappedTasks: [],
        estimate: { subtotal: 0, markup: 0, total: 0, currency: 'SEK' },
        errors
      };
    }
    
    // Step 3: Map each parsed task to MEPS catalog
    const mappedTasks: LineItem[] = [];
    
    for (const task of parsedIntent.tasks) {
      try {
        // Create a spoken task description for the mapper
        const spokenTask = createSpokenTaskDescription(task);
        console.log('🔍 Mapping spoken task:', spokenTask);
        
        // Map to MEPS using existing mapper
        const mappingResult = mapSpokenTaskToMeps(spokenTask, request.mepsCatalog, task.surface);
        console.log('📋 Mapping result:', mappingResult);
        
        if (mappingResult && mappingResult.task) {
          const mepsTask = mappingResult.task;
          
          // Calculate quantity based on surface area
          const surfaceArea = getSurfaceArea(task.surface, request.roomCalculation);
          const quantity = surfaceArea * task.quantity; // Apply layers multiplier
          
          // Calculate unit price
          const unitPrice = calculateUnitPrice(mepsTask, {
            laborRateSek: mepsTask.price_labor_per_hour || 450,
            markupPct: 0.15
          });
          
          console.log('💰 Unit price:', unitPrice, 'Quantity:', quantity);
          
          // Create line item
          const lineItem: LineItem = {
            meps_id: mepsTask.meps_id,
            name: mepsTask.task_name_sv,
            unit: mepsTask.unit,
            qty: Math.round(quantity * 10) / 10, // Round to 1 decimal
            unit_price: Math.round(unitPrice * 100) / 100, // Round to 2 decimals
            subtotal: Math.round(unitPrice * quantity * 100) / 100
          };
          
          mappedTasks.push(lineItem);
        } else {
          console.warn('⚠️ Could not map task:', spokenTask);
          errors.push(`Could not map task: ${spokenTask}`);
        }
      } catch (error) {
        console.error('❌ Error mapping task:', task, error);
        errors.push(`Error mapping task ${task.action} ${task.surface}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Step 4: Calculate totals
    const subtotal = mappedTasks.reduce((sum, task) => sum + task.subtotal, 0);
    const markup = subtotal * 0.15; // 15% markup (could be configurable)
    const total = subtotal + markup;
    
    return {
      success: true,
      transcription: request.transcription,
      parsedIntent,
      mappedTasks,
      estimate: {
        subtotal,
        markup,
        total,
        currency: 'SEK'
      },
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      success: false,
      transcription: request.transcription,
      parsedIntent: { tasks: [], confidence: 0, rawText: request.transcription, language: 'sv' },
      mappedTasks: [],
      estimate: { subtotal: 0, markup: 0, total: 0, currency: 'SEK' },
      errors
    };
  }
}

/**
 * Get surface area from room calculation based on surface type
 */
function getSurfaceArea(surfaceType: string, roomCalc: RoomCalculation): number {
  switch (surfaceType) {
    case 'vägg':
      return roomCalc.walls_net;
    case 'tak':
      return roomCalc.ceiling_net;
    case 'golv':
      return roomCalc.floor_net;
    case 'dörr':
      return roomCalc.door_area;
    case 'fönster':
      return roomCalc.window_area;
    case 'list':
      return roomCalc.perimeter;
    default:
      return 0;
  }
}

/**
 * Create a spoken task description from parsed task for the mapper
 */
function createSpokenTaskDescription(task: any): string {
  const actionMap = {
    'paint': 'måla',
    'skim_coat': 'spackla',
    'prime': 'grundmåla',
    'topcoat': 'täckmåla'
  };
  
  const surfaceMap = {
    'vägg': 'väggar',
    'tak': 'tak',
    'dörr': 'dörrar',
    'fönster': 'fönster',
    'list': 'list',
    'golv': 'golv'
  };
  
  const action = actionMap[task.action as keyof typeof actionMap] || task.action;
  const surface = surfaceMap[task.surface as keyof typeof surfaceMap] || task.surface;
  
  return `${action} ${surface}`;
}

/**
 * Convert voice processing result to estimate request
 */
export function createEstimateRequestFromVoice(
  voiceResult: VoiceProcessingResult,
  roomCalculation: RoomCalculation,
  mepsCatalog: MepsRow[]
): VoiceEstimateRequest {
  return {
    transcription: voiceResult.transcription.text,
    roomCalculation,
    mepsCatalog
  };
}

/**
 * Format estimate result for display
 */
export function formatVoiceEstimateResult(result: VoiceEstimateResult): string {
  if (!result.success) {
    return `❌ Fel vid bearbetning: ${result.errors?.join(', ') || 'Okänt fel'}`;
  }
  
  const intentDescription = formatParsedIntent(result.parsedIntent);
  const estimate = result.estimate;
  
  return `✅ ${intentDescription}

📊 Uppskattning:
• Antal uppgifter: ${result.mappedTasks.length}
• Delsumma: ${estimate.subtotal.toLocaleString('sv-SE')} ${estimate.currency}
• Pålägg (15%): ${estimate.markup.toLocaleString('sv-SE')} ${estimate.currency}
• Totalt: ${estimate.total.toLocaleString('sv-SE')} ${estimate.currency}

${result.errors && result.errors.length > 0 ? `\n⚠️ Varningar: ${result.errors.join(', ')}` : ''}`;
}
