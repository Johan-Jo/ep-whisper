// Unit tests for training data generator

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrainingDataGenerator } from '@/lib/training/generator';
import { MepsCatalog } from '@/lib/excel/catalog';
import type { MepsRow, Unit } from '@/lib/types';
import type { TrainingDataset, TrainingAnnotation } from '@/lib/training/types';

// Mock the catalog
vi.mock('@/lib/excel/catalog');

describe('TrainingDataGenerator', () => {
  let generator: TrainingDataGenerator;
  let mockCatalog: MepsCatalog;
  let mockTasks: MepsRow[];

  beforeEach(() => {
    mockCatalog = new MepsCatalog();
    
    mockTasks = [
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

    // Mock catalog methods
    vi.mocked(mockCatalog).getTaskCount = vi.fn().mockReturnValue(mockTasks.length);
    vi.mocked(mockCatalog).getAllTasks = vi.fn().mockReturnValue(mockTasks);
    vi.mocked(mockCatalog).getStatistics = vi.fn().mockReturnValue({
      totalTasks: mockTasks.length,
      surfaceTypeDistribution: {
        'vägg': 1,
        'tak': 1,
        'list': 1,
      },
      unitDistribution: {
        'm2': 2,
        'lpm': 1,
      },
      tasksWithSynonyms: mockTasks.length,
    });

    generator = new TrainingDataGenerator(mockCatalog);
  });

  describe('generateDataset', () => {
    it('should generate complete training dataset', async () => {
      const mallInstances = {
        'wall_tasks': [mockTasks[0]],
        'ceiling_tasks': [mockTasks[1]],
        'trim_tasks': [mockTasks[2]],
      };

      const dataset = await generator.generateDataset(mallInstances, {
        phrases_per_task: 5,
      });

      expect(dataset).toBeDefined();
      expect(dataset.version).toBe('1.0.0');
      expect(dataset.generated_at).toBeInstanceOf(Date);
      expect(dataset.mall_instances).toEqual(mallInstances);
      expect(dataset.annotations).toBeDefined();
      expect(dataset.statistics).toBeDefined();
    });

    it('should generate correct number of annotations', async () => {
      const mallInstances = {
        'test_mall': mockTasks,
      };

      const dataset = await generator.generateDataset(mallInstances, {
        phrases_per_task: 3,
      });

      // Should have 3 tasks × 3 phrases = 9 annotations (approximately)
      expect(dataset.annotations.length).toBeGreaterThan(0);
      expect(dataset.annotations.length).toBeLessThanOrEqual(15); // Allow some flexibility
    });

    it('should include correct statistics', async () => {
      const mallInstances = {
        'wall_tasks': [mockTasks[0]],
        'ceiling_tasks': [mockTasks[1]],
      };

      const dataset = await generator.generateDataset(mallInstances, {
        phrases_per_task: 2,
      });

      expect(dataset.statistics.total_phrases).toBeGreaterThan(0);
      expect(dataset.statistics.phrases_per_mall).toHaveProperty('wall_tasks');
      expect(dataset.statistics.phrases_per_mall).toHaveProperty('ceiling_tasks');
      expect(dataset.statistics.surface_type_distribution).toHaveProperty('vägg');
      expect(dataset.statistics.surface_type_distribution).toHaveProperty('tak');
    });

    it('should validate all annotations', async () => {
      const mallInstances = {
        'test_mall': [mockTasks[0]],
      };

      const dataset = await generator.generateDataset(mallInstances, {
        phrases_per_task: 3,
      });

      for (const annotation of dataset.annotations) {
        expect(annotation.mall).toBe('test_mall');
        expect(annotation.intent).toBe('paint');
        expect(annotation.meps_id).toBe(mockTasks[0].meps_id);
        expect(annotation.confidence).toBeGreaterThanOrEqual(0.9);
        expect(annotation.entities.surface_type).toBe('vägg');
        expect(annotation.context.surface_type).toBe('vägg');
        expect(annotation.metadata.source).toBe('synthetic');
        expect(annotation.metadata.generated_at).toBeInstanceOf(Date);
        expect(annotation.metadata.variation_id).toBeDefined();
      }
    });
  });

  describe('generateForMall', () => {
    it('should generate annotations for specific mall', async () => {
      const annotations = await generator.generateForMall('test_mall', [mockTasks[0]], {
        phrases_per_task: 3,
      });

      expect(annotations).toBeDefined();
      expect(annotations.length).toBeGreaterThan(0);
      expect(annotations.length).toBeLessThanOrEqual(5); // Allow some flexibility

      for (const annotation of annotations) {
        expect(annotation.mall).toBe('test_mall');
        expect(annotation.meps_id).toBe(mockTasks[0].meps_id);
      }
    });

    it('should handle multiple tasks in mall', async () => {
      const annotations = await generator.generateForMall('multi_mall', mockTasks, {
        phrases_per_task: 2,
      });

      expect(annotations).toBeDefined();
      expect(annotations.length).toBeGreaterThan(0);

      const mepsIds = annotations.map(a => a.meps_id);
      expect(mepsIds).toContain('MÅL-VÄGG-TÄCKMÅL-M2');
      expect(mepsIds).toContain('MÅL-TAK-TÄCKMÅL-M2');
      expect(mepsIds).toContain('MÅL-LIST-TÄCKMÅL-LPM');
    });
  });

  describe('generateWhitelistRules', () => {
    it('should generate correct whitelist rules', () => {
      const mallInstances = {
        'wall_tasks': [mockTasks[0]],
        'ceiling_tasks': [mockTasks[1]],
        'trim_tasks': [mockTasks[2]],
      };

      const whitelist = generator.generateWhitelistRules(mallInstances);

      expect(whitelist).toEqual({
        'wall_tasks': ['MÅL-VÄGG-TÄCKMÅL-M2'],
        'ceiling_tasks': ['MÅL-TAK-TÄCKMÅL-M2'],
        'trim_tasks': ['MÅL-LIST-TÄCKMÅL-LPM'],
      });
    });

    it('should handle empty mall instances', () => {
      const mallInstances = {
        'empty_mall': [],
        'populated_mall': [mockTasks[0]],
      };

      const whitelist = generator.generateWhitelistRules(mallInstances);

      expect(whitelist).toEqual({
        'empty_mall': [],
        'populated_mall': ['MÅL-VÄGG-TÄCKMÅL-M2'],
      });
    });
  });

  describe('generateGuardRailPrompts', () => {
    it('should generate guard rail prompts', () => {
      const prompts = generator.generateGuardRailPrompts();

      expect(prompts).toHaveProperty('unmatched_intent');
      expect(prompts).toHaveProperty('low_confidence');
      expect(prompts).toHaveProperty('ambiguous_surface');
      expect(prompts).toHaveProperty('invalid_quantity');
      expect(prompts).toHaveProperty('missing_context');

      // Check that prompts are in Swedish
      expect(prompts.unmatched_intent).toMatch(/jag hittade inte/i);
      expect(prompts.low_confidence).toMatch(/jag är inte säker/i);
      expect(prompts.ambiguous_surface).toMatch(/vilken yta/i);
      expect(prompts.invalid_quantity).toMatch(/antalet/i);
      expect(prompts.missing_context).toMatch(/rummet/i);
    });
  });

  describe('validateDatasetQuality', () => {
    it('should validate high-quality dataset', () => {
      const dataset: TrainingDataset = {
        version: '1.0.0',
        generated_at: new Date(),
        mall_instances: {},
        annotations: [],
        statistics: {
          total_phrases: 100,
          phrases_per_mall: {
            'mall1': 60,
            'mall2': 40,
          },
          surface_type_distribution: {
            'vägg': 40,
            'tak': 35,
            'golv': 25,
          },
          unit_distribution: {
            'm2': 70,
            'lpm': 20,
            'st': 10,
          },
        },
      };

      const quality = generator.validateDatasetQuality(dataset);

      expect(quality.isValid).toBe(true);
      expect(quality.issues).toHaveLength(0);
      expect(quality.recommendations).toContain('Dataset quality looks good!');
    });

    it('should identify low-quality dataset', () => {
      const dataset: TrainingDataset = {
        version: '1.0.0',
        generated_at: new Date(),
        mall_instances: {},
        annotations: [],
        statistics: {
          total_phrases: 100,
          phrases_per_mall: {
            'mall1': 5, // Too few phrases
            'mall2': 95,
          },
          surface_type_distribution: {
            'vägg': 95,
            'tak': 5, // Too low representation
            'golv': 0,
          },
          unit_distribution: {
            'm2': 95,
            'lpm': 5, // Too low representation
            'st': 0,
          },
        },
      };

      const quality = generator.validateDatasetQuality(dataset);

      expect(quality.isValid).toBe(false);
      expect(quality.issues.length).toBeGreaterThan(0);
      expect(quality.issues).toContain('Mall mall1 has only 5 phrases (minimum 50 recommended)');
      expect(quality.recommendations).toContain('Consider generating more phrases for underrepresented categories');
    });

    it('should handle empty dataset', () => {
      const dataset: TrainingDataset = {
        version: '1.0.0',
        generated_at: new Date(),
        mall_instances: {},
        annotations: [],
        statistics: {
          total_phrases: 0,
          phrases_per_mall: {},
          surface_type_distribution: {},
          unit_distribution: {},
        },
      };

      const quality = generator.validateDatasetQuality(dataset);

      expect(quality.isValid).toBe(false);
      expect(quality.issues.length).toBeGreaterThan(0);
    });
  });

  describe('context creation', () => {
    it('should create appropriate context for different units', () => {
      const wallTask = mockTasks[0]; // m2
      const trimTask = mockTasks[2]; // lpm

      const wallContext = (generator as any).createGenerationContext(wallTask);
      const trimContext = (generator as any).createGenerationContext(trimTask);

      expect(wallContext.unit).toBe('m2');
      expect(trimContext.unit).toBe('lpm');
      expect(wallContext.typical_quantities).toContain(50);
      expect(trimContext.typical_quantities).toContain(20);
    });

    it('should create context with appropriate layers', () => {
      const taskWithLayers = mockTasks[0]; // default_layers: 2
      const context = (generator as any).createGenerationContext(taskWithLayers);

      expect(context.typical_layers).toContain(2);
    });
  });
});
