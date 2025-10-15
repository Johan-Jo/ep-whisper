// Training Data Generation Module

export * from './types';
export * from './phrase-generator';
export * from './generator';
export * from './cli';

// Main exports for easy usage
export { SwedishPhraseGenerator } from './phrase-generator';
export { TrainingDataGenerator } from './generator';
export { TrainingDataCLI } from './cli';

// Re-export types for convenience
export type {
  TrainingAnnotation,
  TrainingDataset,
  GeneratedPhrase,
  GenerationContext,
  GenerationOptions,
  PhraseTemplate,
  InflectionRule,
} from './types';
