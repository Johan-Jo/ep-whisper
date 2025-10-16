/**
 * Whisper-EP Intent Mapper with Structured Outputs
 * Following the cursor guide specifications
 */

import { getOpenAIClient } from '../openai/client';
import { ADD_TASK_SCHEMA, COMPOSE_JOB_SCHEMA, AddTaskResult, ComposeJobResult } from './schemas';
import { SINGLE_INTENT_PROMPT, COMPOSITE_PROMPT } from './prompts';
import { extractSlots, normalizeSlotValues } from './slot-extractor';

export interface IntentMappingOptions {
  useComposite?: boolean;
  temperature?: number;
  seed?: number;
}

/**
 * Map Swedish text to single intent using structured output
 */
export async function mapToSingleIntent(
  text: string,
  options: IntentMappingOptions = {}
): Promise<AddTaskResult | null> {
  try {
    // First extract slots using regex
    const slotResult = extractSlots(text);
    const normalizedSlots = normalizeSlotValues(slotResult);
    
    // If confidence is low, use LLM fallback
    const shouldUseLLM = normalizedSlots.confidence < 0.7;
    
    if (!shouldUseLLM) {
      // Return structured result from regex extraction
      return {
        intent_id: "DEFAULT-PAINT",
        intent_label: "Måla väggar",
        ...normalizedSlots
      };
    }
    
    // Use LLM with structured output
    const messages = [
      { role: "system" as const, content: SINGLE_INTENT_PROMPT },
      { role: "user" as const, content: `Fras: "${text}"\nExtrakterade slots: ${JSON.stringify(normalizedSlots)}` }
    ];
    
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini", // Using available model
      temperature: options.temperature || 0.1,
      seed: options.seed,
      messages,
      tools: [{ type: "function", function: ADD_TASK_SCHEMA }],
      tool_choice: { type: "function", function: { name: "add_task" } }
    });
    
    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }
    
    const args = JSON.parse(toolCall.function.arguments);
    return args as AddTaskResult;
    
  } catch (error) {
    console.error('Error mapping to single intent:', error);
    return null;
  }
}

/**
 * Map Swedish text to composite job using structured output
 */
export async function mapToCompositeJob(
  text: string,
  options: IntentMappingOptions = {}
): Promise<ComposeJobResult | null> {
  try {
    const messages = [
      { role: "system" as const, content: COMPOSITE_PROMPT },
      { role: "user" as const, content: `Fras: "${text}"` }
    ];
    
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      temperature: options.temperature || 0.1,
      seed: options.seed,
      messages,
      tools: [{ type: "function", function: COMPOSE_JOB_SCHEMA }],
      tool_choice: { type: "function", function: { name: "compose_job" } }
    });
    
    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }
    
    const args = JSON.parse(toolCall.function.arguments);
    return args as ComposeJobResult;
    
  } catch (error) {
    console.error('Error mapping to composite job:', error);
    return null;
  }
}

/**
 * Auto-detect if text requires single intent or composite mapping
 */
export function shouldUseCompositeMapping(text: string): boolean {
  const compositeKeywords = [
    'och', 'samt', 'sedan', 'därefter', 'först', 'sen',
    'spackling', 'målning', 'grundning', 'tvätt', 'slip',
    'i- och på', 'bredspackling', 'skarvspackling'
  ];
  
  const lowerText = text.toLowerCase();
  return compositeKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Main mapping function that auto-detects single vs composite
 */
export async function mapSwedishIntent(
  text: string,
  options: IntentMappingOptions = {}
): Promise<AddTaskResult | ComposeJobResult | null> {
  const isComposite = shouldUseCompositeMapping(text);
  
  if (isComposite) {
    return await mapToCompositeJob(text, options);
  } else {
    return await mapToSingleIntent(text, options);
  }
}
