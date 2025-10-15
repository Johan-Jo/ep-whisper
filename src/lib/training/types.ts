// Training Data Generation Types

import { z } from 'zod';
import type { MepsRow, Unit } from '../types';

/**
 * Training data annotation schema with Zod validation
 */
export const TrainingAnnotationSchema = z.object({
  mall: z.string(), // Template instance ID
  intent: z.string(), // Parsed intent
  meps_id: z.string(), // Target MEPS task ID
  confidence: z.number().min(0).max(1), // Confidence score
  entities: z.record(z.any()), // Extracted entities
  context: z.object({
    room_type: z.string().optional(),
    surface_type: z.string(),
    quantity: z.number().optional(),
    unit: z.string().optional(),
  }),
  metadata: z.object({
    generated_at: z.date(),
    source: z.enum(['synthetic', 'user_input', 'augmented']),
    variation_id: z.string(),
  }),
});

export type TrainingAnnotation = z.infer<typeof TrainingAnnotationSchema>;

/**
 * Phrase variation template
 */
export interface PhraseTemplate {
  id: string;
  template: string;
  variables: string[];
  context_requirements: {
    surface_type?: string[];
    unit?: Unit[];
    has_quantity?: boolean;
    has_layers?: boolean;
  };
  frequency_weight: number; // How often to use this template (0-1)
}

/**
 * Swedish inflection rules
 */
export interface InflectionRule {
  pattern: RegExp;
  replacement: string;
  type: 'singular' | 'plural' | 'definite' | 'indefinite';
}

/**
 * Context-aware generation parameters
 */
export interface GenerationContext {
  room_type?: 'living_room' | 'bedroom' | 'kitchen' | 'bathroom' | 'hallway' | 'office';
  surface_type: 'vägg' | 'tak' | 'golv' | 'dörr' | 'fönster' | 'list';
  unit: Unit;
  typical_quantities: number[];
  typical_layers: number[];
}

/**
 * Training dataset structure
 */
export interface TrainingDataset {
  version: string;
  generated_at: Date;
  mall_instances: Record<string, MepsRow[]>;
  annotations: TrainingAnnotation[];
  statistics: {
    total_phrases: number;
    phrases_per_mall: Record<string, number>;
    surface_type_distribution: Record<string, number>;
    unit_distribution: Record<string, number>;
  };
}

/**
 * Phrase generation options
 */
export interface GenerationOptions {
  phrases_per_task: number;
  include_variations: boolean;
  include_quantities: boolean;
  include_layers: boolean;
  include_context: boolean;
  max_phrase_length: number;
  use_realistic_quantities: boolean;
}

/**
 * Generated phrase result
 */
export interface GeneratedPhrase {
  phrase: string;
  meps_id: string;
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  template_used: string;
  variations: string[];
}
