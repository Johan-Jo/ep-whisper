#!/usr/bin/env tsx

/**
 * Test script for training data CLI functionality
 */

import { TrainingDataCLI } from '../src/lib/training/cli';
import { MepsCatalog } from '../src/lib/excel/catalog';

async function testTrainingCLI() {
  console.log('🧪 Testing Training Data CLI');
  
  try {
    const cli = new TrainingDataCLI();
    
    // Load the sample catalog
    console.log('📂 Loading sample catalog...');
    await cli.loadCatalog('excel/sample-meps.xlsx');
    
    // Show catalog stats
    console.log('\n📊 Catalog Statistics:');
    cli.showCatalogStats();
    
    // List tasks
    console.log('\n📋 Available Tasks:');
    cli.listTasks();
    
    // Generate training data for a small subset
    console.log('\n🎯 Generating training data for wall tasks...');
    await cli.generateForAllTasks({
      phrasesPerTask: 3,
      outputFormat: 'json',
      outputDir: './test-training-output',
    });
    
    console.log('\n✅ Training data CLI test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing training CLI:', error);
    process.exit(1);
  }
}

// Run the test
testTrainingCLI();
