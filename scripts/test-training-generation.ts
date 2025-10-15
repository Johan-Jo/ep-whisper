#!/usr/bin/env tsx

/**
 * Simple test script for training data generation
 */

import { SwedishPhraseGenerator } from '../src/lib/training/phrase-generator';
import type { MepsRow, Unit } from '../src/lib/types';

// Create a simple test task
const testTask: MepsRow = {
  meps_id: 'MÅL-VÄGG-TÄCKMÅL-M2',
  task_name_sv: 'Täckmåla väggar',
  unit: 'm2' as Unit,
  labor_norm_per_unit: 0.10,
  material_factor_per_unit: 0.13,
  default_layers: 2,
  surface_type: 'vägg',
  synonyms: 'måla väggar;färg vägg;täckmåla',
  price_labor_per_hour: 500,
  price_material_per_unit: 18,
};

// Create generator
const generator = new SwedishPhraseGenerator({
  phrases_per_task: 5,
  include_variations: true,
  include_quantities: true,
  include_layers: true,
});

// Generate phrases
console.log('🎯 Testing Swedish Phrase Generation');
console.log('Task:', testTask.task_name_sv);
console.log('MEPS ID:', testTask.meps_id);
console.log('Surface:', testTask.surface_type);
console.log('Unit:', testTask.unit);
console.log('');

const phrases = generator.generatePhrasesForTask(testTask, {
  surface_type: 'vägg',
  unit: 'm2',
  typical_quantities: [20, 25, 30, 35, 40],
  typical_layers: [2],
});

console.log(`✅ Generated ${phrases.length} phrases:`);
console.log('');

phrases.forEach((phrase, index) => {
  console.log(`${index + 1}. "${phrase.phrase}"`);
  console.log(`   Intent: ${phrase.intent}`);
  console.log(`   Confidence: ${(phrase.confidence * 100).toFixed(1)}%`);
  console.log(`   Entities:`, phrase.entities);
  console.log(`   Template: ${phrase.template_used}`);
  console.log('');
});

console.log('🎉 Training data generation test completed successfully!');
