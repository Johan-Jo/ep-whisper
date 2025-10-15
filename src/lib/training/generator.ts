// Training Data Generator - Orchestrates phrase generation and creates datasets

import type { MepsRow, Unit } from '../types';
import type { 
  TrainingAnnotation, 
  TrainingDataset, 
  GenerationContext, 
  GenerationOptions,
  GeneratedPhrase 
} from './types';
import { TrainingAnnotationSchema } from './types';
import { SwedishPhraseGenerator } from './phrase-generator';
import { MepsCatalog } from '../excel/catalog';

/**
 * Training data generator class
 */
export class TrainingDataGenerator {
  private phraseGenerator: SwedishPhraseGenerator;
  private catalog: MepsCatalog;

  constructor(catalog: MepsCatalog, options?: Partial<GenerationOptions>) {
    this.catalog = catalog;
    this.phraseGenerator = new SwedishPhraseGenerator(options);
  }

  /**
   * Generate complete training dataset for all MEPS tasks
   */
  async generateDataset(
    mallInstances: Record<string, MepsRow[]>,
    options?: Partial<GenerationOptions>
  ): Promise<TrainingDataset> {
    const startTime = new Date();
    const annotations: TrainingAnnotation[] = [];
    const statistics = {
      total_phrases: 0,
      phrases_per_mall: {} as Record<string, number>,
      surface_type_distribution: {} as Record<string, number>,
      unit_distribution: {} as Record<string, number>,
    };

    // Generate phrases for each mall instance
    for (const [mallId, tasks] of Object.entries(mallInstances)) {
      console.log(`Generating phrases for mall ${mallId} with ${tasks.length} tasks`);
      
      let mallPhraseCount = 0;
      
      for (const task of tasks) {
        const context = this.createGenerationContext(task);
        const phrases = this.phraseGenerator.generatePhrasesForTask(task, context);
        
        // Convert phrases to training annotations
        for (const phrase of phrases) {
          const annotation = this.createTrainingAnnotation(mallId, phrase, task);
          
          if (this.validateAnnotation(annotation)) {
            annotations.push(annotation);
            mallPhraseCount++;
            statistics.total_phrases++;
            
            // Update statistics
            statistics.surface_type_distribution[context.surface_type] = 
              (statistics.surface_type_distribution[context.surface_type] || 0) + 1;
            statistics.unit_distribution[context.unit] = 
              (statistics.unit_distribution[context.unit] || 0) + 1;
          }
        }
      }
      
      statistics.phrases_per_mall[mallId] = mallPhraseCount;
    }

    const dataset: TrainingDataset = {
      version: '1.0.0',
      generated_at: startTime,
      mall_instances: mallInstances,
      annotations,
      statistics,
    };

    console.log(`Generated ${statistics.total_phrases} training phrases`);
    console.log('Statistics:', statistics);

    return dataset;
  }

  /**
   * Generate phrases for a specific mall instance
   */
  async generateForMall(
    mallId: string,
    tasks: MepsRow[],
    options?: Partial<GenerationOptions>
  ): Promise<TrainingAnnotation[]> {
    const annotations: TrainingAnnotation[] = [];

    for (const task of tasks) {
      const context = this.createGenerationContext(task);
      const phrases = this.phraseGenerator.generatePhrasesForTask(task, context);

      for (const phrase of phrases) {
        const annotation = this.createTrainingAnnotation(mallId, phrase, task);
        
        if (this.validateAnnotation(annotation)) {
          annotations.push(annotation);
        }
      }
    }

    return annotations;
  }

  /**
   * Create generation context from MEPS task
   */
  private createGenerationContext(task: MepsRow): GenerationContext {
    return {
      surface_type: task.surface_type || 'vägg',
      unit: task.unit,
      typical_quantities: this.getTypicalQuantitiesForUnit(task.unit),
      typical_layers: this.getTypicalLayersForTask(task),
    };
  }

  /**
   * Create training annotation from generated phrase
   */
  private createTrainingAnnotation(
    mallId: string,
    phrase: GeneratedPhrase,
    task: MepsRow
  ): TrainingAnnotation {
    return {
      mall: mallId,
      intent: phrase.intent,
      meps_id: phrase.meps_id,
      confidence: phrase.confidence,
      entities: phrase.entities,
      context: {
        surface_type: phrase.entities.surface_type as string,
        quantity: phrase.entities.quantity as number,
        unit: phrase.entities.unit as string,
      },
      metadata: {
        generated_at: new Date(),
        source: 'synthetic',
        variation_id: `${phrase.meps_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
    };
  }

  /**
   * Validate training annotation using Zod schema
   */
  private validateAnnotation(annotation: TrainingAnnotation): boolean {
    try {
      // Basic validation without Zod for now
      return !!(
        annotation.mall &&
        annotation.intent &&
        annotation.meps_id &&
        annotation.confidence >= 0 &&
        annotation.confidence <= 1 &&
        annotation.entities &&
        annotation.context &&
        annotation.metadata
      );
    } catch (error) {
      console.warn('Invalid annotation:', error);
      return false;
    }
  }

  /**
   * Get typical quantities for a unit type
   */
  private getTypicalQuantitiesForUnit(unit: Unit): number[] {
    switch (unit) {
      case 'm2':
        return [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100];
      case 'lpm':
        return [5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50];
      case 'st':
        return [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
      default:
        return [1, 2, 3, 4, 5];
    }
  }

  /**
   * Get typical layers for a task
   */
  private getTypicalLayersForTask(task: MepsRow): number[] {
    if (task.default_layers) {
      return [task.default_layers];
    }
    
    // Default based on task type
    if (task.task_name_sv.toLowerCase().includes('grundmåla')) {
      return [1];
    } else if (task.task_name_sv.toLowerCase().includes('täckmåla')) {
      return [2];
    } else {
      return [1, 2];
    }
  }

  /**
   * Export training dataset to JSON
   */
  exportToJson(dataset: TrainingDataset, filePath: string): void {
    const fs = require('fs');
    const jsonString = JSON.stringify(dataset, null, 2);
    fs.writeFileSync(filePath, jsonString, 'utf8');
    console.log(`Training dataset exported to ${filePath}`);
  }

  /**
   * Export training dataset to CSV for analysis
   */
  exportToCsv(dataset: TrainingDataset, filePath: string): void {
    const fs = require('fs');
    const headers = [
      'mall',
      'intent',
      'meps_id',
      'confidence',
      'surface_type',
      'quantity',
      'unit',
      'phrase',
      'generated_at',
      'variation_id',
    ];

    const csvRows = [headers.join(',')];
    
    for (const annotation of dataset.annotations) {
      const row = [
        annotation.mall,
        annotation.intent,
        annotation.meps_id,
        annotation.confidence.toString(),
        annotation.context.surface_type || '',
        annotation.context.quantity?.toString() || '',
        annotation.context.unit || '',
        '', // phrase would need to be reconstructed
        annotation.metadata.generated_at.toISOString(),
        annotation.metadata.variation_id,
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
    }

    fs.writeFileSync(filePath, csvRows.join('\n'), 'utf8');
    console.log(`Training dataset exported to CSV: ${filePath}`);
  }

  /**
   * Generate whitelist filtering rules for LLM inference
   */
  generateWhitelistRules(mallInstances: Record<string, MepsRow[]>): Record<string, string[]> {
    const whitelist: Record<string, string[]> = {};

    for (const [mallId, tasks] of Object.entries(mallInstances)) {
      whitelist[mallId] = tasks.map(task => task.meps_id);
    }

    return whitelist;
  }

  /**
   * Generate guard-rail prompts for unmatched intents
   */
  generateGuardRailPrompts(): Record<string, string> {
    return {
      'unmatched_intent': 'Jag hittade inte uppgiften i katalogen. Kan du försöka säga det på ett annat sätt?',
      'low_confidence': 'Jag är inte säker på vad du menar. Kan du upprepa det?',
      'ambiguous_surface': 'Vilken yta menar du? Vägg, tak, golv, dörr, fönster eller list?',
      'invalid_quantity': 'Det antalet verkar inte rimligt. Kan du kontrollera storleken?',
      'missing_context': 'Behöver jag veta mer om rummet för att ge en korrekt uppskattning?',
    };
  }

  /**
   * Validate training dataset quality
   */
  validateDatasetQuality(dataset: TrainingDataset): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check minimum phrases per mall
    for (const [mallId, count] of Object.entries(dataset.statistics.phrases_per_mall)) {
      if (count < 50) {
        issues.push(`Mall ${mallId} has only ${count} phrases (minimum 50 recommended)`);
      }
    }

    // Check surface type distribution
    const totalPhrases = dataset.statistics.total_phrases;
    for (const [surfaceType, count] of Object.entries(dataset.statistics.surface_type_distribution)) {
      const percentage = (count / totalPhrases) * 100;
      if (percentage < 5) {
        issues.push(`Surface type ${surfaceType} has low representation (${percentage.toFixed(1)}%)`);
      }
    }

    // Check unit distribution
    for (const [unit, count] of Object.entries(dataset.statistics.unit_distribution)) {
      const percentage = (count / totalPhrases) * 100;
      if (percentage < 5) {
        issues.push(`Unit ${unit} has low representation (${percentage.toFixed(1)}%)`);
      }
    }

    // Check annotation quality
    const invalidAnnotations = dataset.annotations.filter(ann => 
      ann.confidence < 0.8 || !ann.entities.surface_type
    );
    
    if (invalidAnnotations.length > 0) {
      issues.push(`${invalidAnnotations.length} annotations have low quality`);
    }

    // Generate recommendations
    if (issues.length === 0) {
      recommendations.push('Dataset quality looks good!');
    } else {
      recommendations.push('Consider generating more phrases for underrepresented categories');
      recommendations.push('Review and improve low-confidence annotations');
      recommendations.push('Ensure balanced representation across all surface types and units');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }
}
