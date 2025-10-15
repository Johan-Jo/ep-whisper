#!/usr/bin/env tsx

/**
 * Simple test script for training data generation without Excel dependencies
 */

import { TrainingDataGenerator } from '../src/lib/training/generator';
import { MepsCatalog } from '../src/lib/excel/catalog';
import type { MepsRow, Unit } from '../src/lib/types';

// Create mock tasks
const mockTasks: MepsRow[] = [
  {
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
  },
  {
    meps_id: 'MÅL-TAK-TÄCKMÅL-M2',
    task_name_sv: 'Täckmåla tak',
    unit: 'm2' as Unit,
    labor_norm_per_unit: 0.12,
    material_factor_per_unit: 0.15,
    default_layers: 2,
    surface_type: 'tak',
    synonyms: 'måla tak;färg tak;täckmåla tak',
    price_labor_per_hour: 500,
    price_material_per_unit: 20,
  },
  {
    meps_id: 'MÅL-LIST-TÄCKMÅL-LPM',
    task_name_sv: 'Täckmåla lister',
    unit: 'lpm' as Unit,
    labor_norm_per_unit: 0.08,
    material_factor_per_unit: 0.10,
    default_layers: 2,
    surface_type: 'list',
    synonyms: 'måla list;färg list;täckmåla list',
    price_labor_per_hour: 500,
    price_material_per_unit: 15,
  },
];

async function testTrainingGeneration() {
  console.log('🧪 Testing Training Data Generation');
  
  try {
    // Create mock catalog
    const catalog = new MepsCatalog();
    await catalog.loadFromRows(mockTasks);
    
    console.log(`✅ Mock catalog loaded with ${catalog.getStats().totalTasks} tasks`);
    
    // Create generator
    const generator = new TrainingDataGenerator(catalog, {
      phrases_per_task: 3,
    });
    
    // Create mall instances
    const mallInstances = {
      'wall_tasks': [mockTasks[0]],
      'ceiling_tasks': [mockTasks[1]],
      'trim_tasks': [mockTasks[2]],
    };
    
    console.log('\n🎯 Generating training dataset...');
    const dataset = await generator.generateDataset(mallInstances);
    
    console.log('\n📊 Dataset Statistics:');
    console.log(`  Total phrases: ${dataset.statistics.total_phrases}`);
    console.log(`  Phrases per mall:`);
    for (const [mallId, count] of Object.entries(dataset.statistics.phrases_per_mall)) {
      console.log(`    - ${mallId}: ${count}`);
    }
    console.log(`  Surface type distribution:`);
    for (const [surfaceType, count] of Object.entries(dataset.statistics.surface_type_distribution)) {
      console.log(`    - ${surfaceType}: ${count}`);
    }
    
    console.log('\n📝 Sample Annotations:');
    dataset.annotations.slice(0, 5).forEach((annotation, index) => {
      console.log(`  ${index + 1}. Mall: ${annotation.mall}`);
      console.log(`     MEPS ID: ${annotation.meps_id}`);
      console.log(`     Intent: ${annotation.intent}`);
      console.log(`     Confidence: ${(annotation.confidence * 100).toFixed(1)}%`);
      console.log(`     Surface: ${annotation.context.surface_type}`);
      console.log(`     Quantity: ${annotation.context.quantity || 'N/A'}`);
      console.log('');
    });
    
    // Test whitelist generation
    console.log('📋 Whitelist Rules:');
    const whitelist = generator.generateWhitelistRules(mallInstances);
    for (const [mallId, mepsIds] of Object.entries(whitelist)) {
      console.log(`  ${mallId}: ${mepsIds.join(', ')}`);
    }
    
    // Test guard rail prompts
    console.log('\n🛡️  Guard Rail Prompts:');
    const guardRails = generator.generateGuardRailPrompts();
    for (const [key, prompt] of Object.entries(guardRails)) {
      console.log(`  ${key}: "${prompt}"`);
    }
    
    // Test dataset quality validation
    console.log('\n🔍 Dataset Quality Validation:');
    const quality = generator.validateDatasetQuality(dataset);
    console.log(`  Valid: ${quality.isValid ? '✅' : '❌'}`);
    if (quality.issues.length > 0) {
      console.log('  Issues:');
      quality.issues.forEach(issue => console.log(`    - ${issue}`));
    }
    if (quality.recommendations.length > 0) {
      console.log('  Recommendations:');
      quality.recommendations.forEach(rec => console.log(`    - ${rec}`));
    }
    
    console.log('\n✅ Training data generation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing training generation:', error);
    process.exit(1);
  }
}

// Run the test
testTrainingGeneration();
