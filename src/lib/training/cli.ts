// CLI tool for generating training data

import { TrainingDataGenerator } from './generator';
import { MepsCatalog } from '../excel/catalog';
import type { MepsRow } from '../types';

/**
 * CLI interface for training data generation
 */
export class TrainingDataCLI {
  private catalog: MepsCatalog;

  constructor() {
    this.catalog = new MepsCatalog();
  }

  /**
   * Load MEPS catalog from Excel file
   */
  async loadCatalog(filePath: string): Promise<void> {
    console.log(`Loading MEPS catalog from ${filePath}...`);
    const result = await this.catalog.loadFromFile(filePath);
    
    if (!result.success) {
      console.error('Validation result:', result);
      throw new Error(`Failed to load catalog: ${JSON.stringify(result.errors || result)}`);
    }
    
    console.log(`✅ Catalog loaded successfully with ${this.catalog.getStats().totalTasks} tasks`);
  }

  /**
   * Generate training data for all tasks
   */
  async generateForAllTasks(options?: {
    phrasesPerTask?: number;
    outputFormat?: 'json' | 'csv' | 'both';
    outputDir?: string;
  }): Promise<void> {
    console.log('Generating training data for all MEPS tasks...');
    
    // Get all tasks from catalog
    const allTasks = this.catalog.getAllTasks();
    
    // Create mall instances - group tasks by surface type for now
    const mallInstances: Record<string, MepsRow[]> = {
      'wall_tasks': allTasks.filter(task => task.surface_type === 'vägg'),
      'ceiling_tasks': allTasks.filter(task => task.surface_type === 'tak'),
      'floor_tasks': allTasks.filter(task => task.surface_type === 'golv'),
      'door_tasks': allTasks.filter(task => task.surface_type === 'dörr'),
      'window_tasks': allTasks.filter(task => task.surface_type === 'fönster'),
      'trim_tasks': allTasks.filter(task => task.surface_type === 'list'),
    };

    // Filter out empty mall instances
    const validMallInstances = Object.fromEntries(
      Object.entries(mallInstances).filter(([_, tasks]) => tasks.length > 0)
    );

    console.log(`Found ${Object.keys(validMallInstances).length} mall instances:`);
    for (const [mallId, tasks] of Object.entries(validMallInstances)) {
      console.log(`  - ${mallId}: ${tasks.length} tasks`);
    }

    // Generate training data
    const generator = new TrainingDataGenerator(this.catalog, {
      phrases_per_task: options?.phrasesPerTask || 15,
    });

    const dataset = await generator.generateDataset(validMallInstances);

    // Export results
    const outputDir = options?.outputDir || './training-data';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (options?.outputFormat === 'json' || options?.outputFormat === 'both') {
      const jsonPath = `${outputDir}/training-dataset-${timestamp}.json`;
      generator.exportToJson(dataset, jsonPath);
    }
    
    if (options?.outputFormat === 'csv' || options?.outputFormat === 'both') {
      const csvPath = `${outputDir}/training-dataset-${timestamp}.csv`;
      generator.exportToCsv(dataset, csvPath);
    }

    // Validate dataset quality
    console.log('\n📊 Dataset Quality Report:');
    const qualityReport = generator.validateDatasetQuality(dataset);
    
    if (qualityReport.isValid) {
      console.log('✅ Dataset quality: EXCELLENT');
    } else {
      console.log('⚠️  Dataset quality: NEEDS IMPROVEMENT');
    }

    if (qualityReport.issues.length > 0) {
      console.log('\nIssues found:');
      qualityReport.issues.forEach(issue => console.log(`  - ${issue}`));
    }

    if (qualityReport.recommendations.length > 0) {
      console.log('\nRecommendations:');
      qualityReport.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }

    // Generate whitelist rules
    const whitelist = generator.generateWhitelistRules(validMallInstances);
    const whitelistPath = `${outputDir}/whitelist-rules-${timestamp}.json`;
    require('fs').writeFileSync(whitelistPath, JSON.stringify(whitelist, null, 2));
    console.log(`\n📋 Whitelist rules exported to: ${whitelistPath}`);

    // Generate guard-rail prompts
    const guardRails = generator.generateGuardRailPrompts();
    const guardRailsPath = `${outputDir}/guard-rail-prompts-${timestamp}.json`;
    require('fs').writeFileSync(guardRailsPath, JSON.stringify(guardRails, null, 2));
    console.log(`🛡️  Guard-rail prompts exported to: ${guardRailsPath}`);
  }

  /**
   * Generate training data for specific mall instance
   */
  async generateForMall(
    mallId: string,
    taskIds: string[],
    options?: {
      phrasesPerTask?: number;
      outputFormat?: 'json' | 'csv' | 'both';
      outputDir?: string;
    }
  ): Promise<void> {
    console.log(`Generating training data for mall ${mallId}...`);
    
    // Get specific tasks
    const tasks = taskIds.map(id => this.catalog.getTask(id)).filter(Boolean) as MepsRow[];
    
    if (tasks.length === 0) {
      throw new Error(`No tasks found for IDs: ${taskIds.join(', ')}`);
    }

    console.log(`Found ${tasks.length} tasks for mall ${mallId}`);

    // Generate training data
    const generator = new TrainingDataGenerator(this.catalog, {
      phrases_per_task: options?.phrasesPerTask || 15,
    });

    const annotations = await generator.generateForMall(mallId, tasks);

    // Export results
    const outputDir = options?.outputDir || './training-data';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (options?.outputFormat === 'json' || options?.outputFormat === 'both') {
      const jsonPath = `${outputDir}/mall-${mallId}-${timestamp}.json`;
      require('fs').writeFileSync(jsonPath, JSON.stringify(annotations, null, 2));
      console.log(`✅ Training data exported to: ${jsonPath}`);
    }
    
    if (options?.outputFormat === 'csv' || options?.outputFormat === 'both') {
      const csvPath = `${outputDir}/mall-${mallId}-${timestamp}.csv`;
      const headers = ['mall', 'intent', 'meps_id', 'confidence', 'surface_type', 'quantity', 'unit', 'generated_at', 'variation_id'];
      const csvRows = [headers.join(',')];
      
      for (const annotation of annotations) {
        const row = [
          annotation.mall,
          annotation.intent,
          annotation.meps_id,
          annotation.confidence.toString(),
          annotation.context.surface_type || '',
          annotation.context.quantity?.toString() || '',
          annotation.context.unit || '',
          annotation.metadata.generated_at.toISOString(),
          annotation.metadata.variation_id,
        ];
        csvRows.push(row.map(field => `"${field}"`).join(','));
      }
      
      require('fs').writeFileSync(csvPath, csvRows.join('\n'));
      console.log(`✅ Training data exported to CSV: ${csvPath}`);
    }

    console.log(`\n📊 Generated ${annotations.length} training phrases for mall ${mallId}`);
  }

  /**
   * Show catalog statistics
   */
  showCatalogStats(): void {
    const stats = this.catalog.getStats();
    
    console.log('\n📊 MEPS Catalog Statistics:');
    console.log(`  Total tasks: ${stats.totalTasks}`);
    console.log(`  Surface types:`);
    
    for (const [surfaceType, count] of Object.entries(stats.tasksBySurfaceType)) {
      if (count > 0) {
        console.log(`    - ${surfaceType}: ${count} tasks`);
      }
    }
    
    console.log(`  Units:`);
    for (const [unit, count] of Object.entries(stats.tasksByUnit)) {
      if (count > 0) {
        console.log(`    - ${unit}: ${count} tasks`);
      }
    }
  }

  /**
   * List all available tasks
   */
  listTasks(): void {
    const tasks = this.catalog.getAllTasks();
    
    console.log('\n📋 Available MEPS Tasks:');
    for (const task of tasks) {
      console.log(`  ${task.meps_id}: ${task.task_name_sv} (${task.unit}, ${task.surface_type})`);
      if (task.synonyms) {
        console.log(`    Synonyms: ${task.synonyms}`);
      }
    }
  }
}
