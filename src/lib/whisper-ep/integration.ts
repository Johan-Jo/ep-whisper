/**
 * Whisper-EP Integration with Existing System
 * Bridges the new structured approach with current conversation flow
 */

import { mapSwedishIntent, shouldUseCompositeMapping } from './intent-mapper';
import { validateJob } from './validator';
import { extractSlots, normalizeSlotValues } from './slot-extractor';

export interface WhisperEPResult {
  success: boolean;
  intent?: any;
  validation?: any;
  slots?: any;
  error?: string;
}

/**
 * Process Swedish voice input using Whisper-EP methodology
 */
export async function processWithWhisperEP(
  transcription: string,
  options: {
    useComposite?: boolean;
    temperature?: number;
    seed?: number;
  } = {}
): Promise<WhisperEPResult> {
  try {
    console.log('🎯 Whisper-EP processing:', transcription);
    
    // Step 1: Extract slots using regex → LLM fallback
    const slotResult = extractSlots(transcription);
    const normalizedSlots = normalizeSlotValues(slotResult);
    console.log('📊 Extracted slots:', normalizedSlots);
    
    // Step 2: Map to intent using structured output
    const intentResult = await mapSwedishIntent(transcription, {
      useComposite: options.useComposite,
      temperature: options.temperature || 0.1,
      seed: options.seed
    });
    
    if (!intentResult) {
      return {
        success: false,
        error: 'Failed to map intent'
      };
    }
    
    console.log('🎯 Mapped intent:', intentResult);
    
    // Step 3: Validate if composite job
    let validation = null;
    if (shouldUseCompositeMapping(transcription)) {
      validation = validateJob(intentResult as any);
      console.log('✅ Validation result:', validation);
    }
    
    return {
      success: true,
      intent: intentResult,
      validation,
      slots: normalizedSlots
    };
    
  } catch (error) {
    console.error('❌ Whisper-EP processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Convert Whisper-EP result to existing system format
 */
export function convertToExistingFormat(whisperResult: WhisperEPResult): {
  success: boolean;
  transcription?: string;
  parsedIntent?: any;
  mappedTasks?: any[];
  estimate?: any;
  error?: string;
} {
  if (!whisperResult.success || !whisperResult.intent) {
    return {
      success: false,
      error: whisperResult.error || 'No intent mapped'
    };
  }
  
  const intent = whisperResult.intent;
  
  // Handle single intent
  if ('intent_id' in intent) {
    return {
      success: true,
      transcription: intent.intent_label,
      parsedIntent: {
        tasks: [{
          action: intent.intent_id,
          surface: 'vägg', // Default, could be extracted from slots
          quantity: intent.coats || 2,
          unit: 'lager',
          confidence: 0.9
        }],
        confidence: 0.9,
        rawText: intent.intent_label,
        language: 'sv'
      }
    };
  }
  
  // Handle composite job
  if ('steps' in intent) {
    const tasks = intent.steps.map((step: any, index: number) => ({
      action: step.intent_id,
      surface: 'vägg', // Could be extracted from area/length
      quantity: step.coats || 1,
      unit: 'lager',
      confidence: 0.9,
      stepOrder: step.step_order
    }));
    
    return {
      success: true,
      transcription: intent.job_name,
      parsedIntent: {
        tasks,
        confidence: 0.9,
        rawText: intent.job_name,
        language: 'sv'
      }
    };
  }
  
  return {
    success: false,
    error: 'Unknown intent format'
  };
}

/**
 * Enhanced conversation parser using Whisper-EP
 */
export function parsePaintingTasksWithWhisperEP(transcription: string): string[] {
  // First try the new Whisper-EP approach
  const slotResult = extractSlots(transcription);
  
  if (slotResult.confidence > 0.7) {
    // High confidence regex extraction
    const tasks: string[] = [];
    
    // Map common Swedish painting phrases to tasks
    const lowerText = transcription.toLowerCase();
    
    if (lowerText.includes('måla') && lowerText.includes('vägg')) {
      tasks.push('måla väggar');
    }
    if (lowerText.includes('måla') && lowerText.includes('tak')) {
      tasks.push('måla tak');
    }
    if (lowerText.includes('grundmåla')) {
      tasks.push('grundmåla väggar');
    }
    if (lowerText.includes('spackla')) {
      tasks.push('spackla väggar');
    }
    
    // Add layer information if found
    if (slotResult.coats && slotResult.coats > 1) {
      return tasks.map(task => `${task} (${slotResult.coats} lager)`);
    }
    
    return tasks;
  }
  
  // Fallback to existing parser logic
  return parsePaintingTasksFallback(transcription);
}

/**
 * Fallback parser for when Whisper-EP confidence is low
 */
function parsePaintingTasksFallback(transcription: string): string[] {
  const text = transcription.toLowerCase();
  const tasks: string[] = [];
  
  // Common Swedish painting task patterns
  const taskPatterns = [
    { pattern: /grundmåla(tak|taket)/gi, task: 'grundmåla tak' },
    { pattern: /grundmåla\s+(?!tak)/gi, task: 'grundmåla' },
    { pattern: /målarbänka/gi, task: 'måla bänk' },
    { pattern: /måla\s+(väggar?|vägg|bäggar)/gi, task: 'måla väggar' },
    { pattern: /måla\s+(tak)/gi, task: 'måla tak' },
    { pattern: /måla\s+(golv)/gi, task: 'måla golv' },
    { pattern: /måla\s+(dörrar?|dörr)/gi, task: 'måla dörrar' },
    { pattern: /måla\s+(fönster|fönsterramar?)/gi, task: 'måla fönster' },
    { pattern: /måla\s+(lister?|golvlister?|taklister?)/gi, task: 'måla lister' },
    { pattern: /måla\s+(radiatorer?)/gi, task: 'måla radiatorer' },
    { pattern: /spackla\s+(\w+)/gi, task: 'spackla' },
    { pattern: /tapetsera/gi, task: 'tapetsera' },
    { pattern: /struk/gi, task: 'struk' },
  ];
  
  for (const { pattern, task } of taskPatterns) {
    if (pattern.test(text)) {
      tasks.push(task);
    }
  }
  
  return tasks;
}
