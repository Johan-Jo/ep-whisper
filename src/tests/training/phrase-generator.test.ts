// Unit tests for Swedish phrase generator

import { describe, it, expect, beforeEach } from 'vitest';
import { SwedishPhraseGenerator } from '@/lib/training/phrase-generator';
import type { MepsRow, Unit } from '@/lib/types';
import type { GenerationContext } from '@/lib/training/types';

describe('SwedishPhraseGenerator', () => {
  let generator: SwedishPhraseGenerator;
  let mockTask: MepsRow;
  let mockContext: GenerationContext;

  beforeEach(() => {
    generator = new SwedishPhraseGenerator({
      phrases_per_task: 5,
      include_variations: true,
      include_quantities: true,
      include_layers: true,
    });

    mockTask = {
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

    mockContext = {
      surface_type: 'vägg',
      unit: 'm2',
      typical_quantities: [20, 25, 30, 35, 40],
      typical_layers: [2],
    };
  });

  describe('generatePhrasesForTask', () => {
    it('should generate phrases for a valid task', () => {
      const phrases = generator.generatePhrasesForTask(mockTask, mockContext);
      
      expect(phrases).toBeDefined();
      expect(phrases.length).toBeGreaterThan(0);
      expect(phrases.length).toBeLessThanOrEqual(5);
    });

    it('should include correct meps_id in all phrases', () => {
      const phrases = generator.generatePhrasesForTask(mockTask, mockContext);
      
      for (const phrase of phrases) {
        expect(phrase.meps_id).toBe(mockTask.meps_id);
      }
    });

    it('should include correct intent in all phrases', () => {
      const phrases = generator.generatePhrasesForTask(mockTask, mockContext);
      
      for (const phrase of phrases) {
        expect(phrase.intent).toBe('paint');
      }
    });

    it('should generate Swedish phrases', () => {
      const phrases = generator.generatePhrasesForTask(mockTask, mockContext);
      
      for (const phrase of phrases) {
        expect(phrase.phrase).toMatch(/måla|täckmåla|grundmåla|spackla/);
        expect(phrase.phrase).toMatch(/vägg|tak|golv|dörr|fönster|list/);
      }
    });

    it('should include surface type in entities', () => {
      const phrases = generator.generatePhrasesForTask(mockTask, mockContext);
      
      for (const phrase of phrases) {
        expect(phrase.entities.surface_type).toBe('vägg');
      }
    });

    it('should include unit in entities', () => {
      const phrases = generator.generatePhrasesForTask(mockTask, mockContext);
      
      for (const phrase of phrases) {
        expect(phrase.entities.unit).toBe('m2');
      }
    });

    it('should have confidence scores between 0.9 and 1.0', () => {
      const phrases = generator.generatePhrasesForTask(mockTask, mockContext);
      
      for (const phrase of phrases) {
        expect(phrase.confidence).toBeGreaterThanOrEqual(0.9);
        expect(phrase.confidence).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe('phrase variations', () => {
    it('should generate different phrase templates', () => {
      const phrases = generator.generatePhrasesForTask(mockTask, mockContext);
      const templates = phrases.map(p => p.template_used);
      
      // Should have at least 2 different templates
      expect(new Set(templates).size).toBeGreaterThan(1);
    });

    it('should include quantity when appropriate', () => {
      const phrases = generator.generatePhrasesForTask(mockTask, mockContext);
      
      const phrasesWithQuantity = phrases.filter(p => 
        p.phrase.match(/\d+(?:[,.]\d+)?\s*(kvadratmeter|meter|stycken)/)
      );
      
      expect(phrasesWithQuantity.length).toBeGreaterThan(0);
    });

    it('should include layers when appropriate', () => {
      // Create a generator that explicitly includes layers
      const layersGenerator = new SwedishPhraseGenerator({
        phrases_per_task: 10,
        include_layers: true,
        include_quantities: false, // Focus on layers
      });
      
      const phrases = layersGenerator.generatePhrasesForTask(mockTask, mockContext);
      
      const phrasesWithLayers = phrases.filter(p => 
        p.phrase.match(/\d+\s*lager/)
      );
      
      expect(phrasesWithLayers.length).toBeGreaterThan(0);
    });

    it('should use proper Swedish surface forms', () => {
      const phrases = generator.generatePhrasesForTask(mockTask, mockContext);
      
      for (const phrase of phrases) {
        // Should use proper Swedish forms: väggar, väggarna, väggen
        expect(phrase.phrase).toMatch(/vägg(ar|arna|en)?/);
      }
    });
  });

  describe('different surface types', () => {
    it('should generate phrases for ceiling tasks', () => {
      const ceilingTask: MepsRow = {
        ...mockTask,
        meps_id: 'MÅL-TAK-TÄCKMÅL-M2',
        task_name_sv: 'Täckmåla tak',
        surface_type: 'tak',
      };

      const ceilingContext: GenerationContext = {
        ...mockContext,
        surface_type: 'tak',
      };

      const phrases = generator.generatePhrasesForTask(ceilingTask, ceilingContext);
      
      for (const phrase of phrases) {
        expect(phrase.phrase).toMatch(/tak(et)?/);
        expect(phrase.entities.surface_type).toBe('tak');
      }
    });

    it('should generate phrases for floor tasks', () => {
      const floorTask: MepsRow = {
        ...mockTask,
        meps_id: 'MÅL-GOLV-TÄCKMÅL-M2',
        task_name_sv: 'Täckmåla golv',
        surface_type: 'golv',
      };

      const floorContext: GenerationContext = {
        ...mockContext,
        surface_type: 'golv',
      };

      const phrases = generator.generatePhrasesForTask(floorTask, floorContext);
      
      for (const phrase of phrases) {
        expect(phrase.phrase).toMatch(/golv(et)?/);
        expect(phrase.entities.surface_type).toBe('golv');
      }
    });

    it('should generate phrases for trim tasks', () => {
      const trimTask: MepsRow = {
        ...mockTask,
        meps_id: 'MÅL-LIST-TÄCKMÅL-LPM',
        task_name_sv: 'Täckmåla lister',
        unit: 'lpm',
        surface_type: 'list',
      };

      const trimContext: GenerationContext = {
        ...mockContext,
        surface_type: 'list',
        unit: 'lpm',
      };

      const phrases = generator.generatePhrasesForTask(trimTask, trimContext);
      
      for (const phrase of phrases) {
        expect(phrase.phrase).toMatch(/list(er|erna|en)?/);
        expect(phrase.entities.surface_type).toBe('list');
        expect(phrase.entities.unit).toBe('lpm');
      }
    });
  });

  describe('different units', () => {
    it('should handle m2 units correctly', () => {
      const phrases = generator.generatePhrasesForTask(mockTask, mockContext);
      
      const phrasesWithUnit = phrases.filter(p => 
        p.phrase.includes('kvadratmeter')
      );
      
      expect(phrasesWithUnit.length).toBeGreaterThan(0);
    });

    it('should handle lpm units correctly', () => {
      const trimTask: MepsRow = {
        ...mockTask,
        meps_id: 'MÅL-LIST-TÄCKMÅL-LPM',
        unit: 'lpm',
      };

      const trimContext: GenerationContext = {
        ...mockContext,
        unit: 'lpm',
      };

      const phrases = generator.generatePhrasesForTask(trimTask, trimContext);
      
      const phrasesWithUnit = phrases.filter(p => 
        p.phrase.includes('meter') && !p.phrase.includes('kvadratmeter')
      );
      
      expect(phrasesWithUnit.length).toBeGreaterThan(0);
    });

    it('should handle st units correctly', () => {
      const doorTask: MepsRow = {
        ...mockTask,
        meps_id: 'MÅL-DÖRR-TÄCKMÅL-ST',
        unit: 'st',
      };

      const doorContext: GenerationContext = {
        ...mockContext,
        unit: 'st',
      };

      const phrases = generator.generatePhrasesForTask(doorTask, doorContext);
      
      const phrasesWithUnit = phrases.filter(p => 
        p.phrase.includes('stycken')
      );
      
      expect(phrasesWithUnit.length).toBeGreaterThan(0);
    });
  });

  describe('phrase length constraints', () => {
    it('should respect max phrase length', () => {
      const shortGenerator = new SwedishPhraseGenerator({
        max_phrase_length: 20,
      });

      const phrases = shortGenerator.generatePhrasesForTask(mockTask, mockContext);
      
      for (const phrase of phrases) {
        expect(phrase.phrase.length).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('entity extraction', () => {
    it('should extract quantity entities', () => {
      const phrases = generator.generatePhrasesForTask(mockTask, mockContext);
      
      const phrasesWithQuantity = phrases.filter(p => p.entities.quantity);
      
      for (const phrase of phrasesWithQuantity) {
        expect(typeof phrase.entities.quantity).toBe('number');
        expect(phrase.entities.quantity).toBeGreaterThan(0);
      }
    });

    it('should extract layer entities', () => {
      const phrases = generator.generatePhrasesForTask(mockTask, mockContext);
      
      const phrasesWithLayers = phrases.filter(p => p.entities.layers);
      
      for (const phrase of phrasesWithLayers) {
        expect(typeof phrase.entities.layers).toBe('number');
        expect(phrase.entities.layers).toBeGreaterThan(0);
      }
    });
  });
});
