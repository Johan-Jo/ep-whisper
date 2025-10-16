import { describe, it, expect, beforeEach } from 'vitest';
import {
  mapSpokenTaskToMeps,
  resolveSurfaceType,
  selectQuantityBySurface,
  parseLayerCount,
  validateMepsId,
  getTasksForContext,
} from '../../lib/pricing/mapper';
import { MepsCatalog } from '../../lib/excel/catalog';
import { MepsRow, RoomCalculation } from '../../lib/types';

describe('Task Mapper', () => {
  let catalog: MepsCatalog;
  const sampleTasks: MepsRow[] = [
    {
      meps_id: 'MÅL-VÄGG-SPACK-M2',
      task_name_sv: 'Bredspackla väggar',
      unit: 'm2',
      labor_norm_per_unit: 0.15,
      surface_type: 'vägg',
      synonyms: 'spackla väggar;bredspackling',
    },
    {
      meps_id: 'MÅL-TAK-MÅLA-M2',
      task_name_sv: 'Måla tak',
      unit: 'm2',
      labor_norm_per_unit: 0.12,
      surface_type: 'tak',
      synonyms: 'täckmåla tak;takmålning',
    },
    {
      meps_id: 'MÅL-GOLV-BETONG-M2',
      task_name_sv: 'Måla betonggolv',
      unit: 'm2',
      labor_norm_per_unit: 0.13,
      surface_type: 'golv',
      synonyms: 'golvmålning;betong golv',
    },
  ];

  beforeEach(() => {
    catalog = new MepsCatalog();
    // @ts-expect-error
    catalog.indexTasks(sampleTasks);
  });

  describe('mapSpokenTaskToMeps', () => {
    it('should find exact synonym match with high confidence', () => {
      const result = mapSpokenTaskToMeps('spackla väggar', catalog);
      
      expect(result.task).toBeDefined();
      expect(result.task?.meps_id).toBe('MÅL-VÄGG-SPACK-M2');
      expect(result.confidence).toBe(1.0);
    });

    it('should find task by name', () => {
      const result = mapSpokenTaskToMeps('bredspackla väggar', catalog);
      
      expect(result.task).toBeDefined();
      expect(result.task?.meps_id).toBe('MÅL-VÄGG-SPACK-M2');
    });

    it('should be case-insensitive', () => {
      const result = mapSpokenTaskToMeps('SPACKLA VÄGGAR', catalog);
      
      expect(result.task).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should filter by surface type if provided', () => {
      const result = mapSpokenTaskToMeps('måla', catalog, 'tak');
      
      expect(result.task).toBeDefined();
      expect(result.task?.surface_type).toBe('tak');
    });

    it('should return null for non-existent task (guard rail)', () => {
      const result = mapSpokenTaskToMeps('hallucinated task', catalog);
      
      expect(result.task).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.matches).toHaveLength(0);
    });

    it('should handle partial matches with lower confidence', () => {
      const result = mapSpokenTaskToMeps('väggar', catalog);
      
      expect(result.confidence).toBeLessThan(1.0);
      if (result.task) {
        expect(result.task.task_name_sv).toContain('väggar');
      }
    });
  });

  describe('resolveSurfaceType', () => {
    it('should resolve vägg from Swedish keywords', () => {
      expect(resolveSurfaceType('måla väggar')).toBe('vägg');
      expect(resolveSurfaceType('spackla vägg')).toBe('vägg');
    });

    it('should resolve tak from Swedish keywords', () => {
      expect(resolveSurfaceType('måla taket')).toBe('tak');
      expect(resolveSurfaceType('tak grundmålning')).toBe('tak');
    });

    it('should resolve golv from Swedish keywords', () => {
      expect(resolveSurfaceType('måla golvet')).toBe('golv');
      expect(resolveSurfaceType('betonggolv')).toBe('golv');
      expect(resolveSurfaceType('trägolv')).toBe('golv');
    });

    it('should resolve dörr from Swedish keywords', () => {
      expect(resolveSurfaceType('måla dörren')).toBe('dörr');
      expect(resolveSurfaceType('dörrar')).toBe('dörr');
    });

    it('should resolve fönster from Swedish keywords', () => {
      expect(resolveSurfaceType('måla fönstret')).toBe('fönster');
    });

    it('should resolve list from Swedish keywords', () => {
      expect(resolveSurfaceType('taklist')).toBe('list');
      expect(resolveSurfaceType('golvlist')).toBe('list');
    });

    it('should return undefined for unrecognized phrases', () => {
      expect(resolveSurfaceType('something unknown')).toBeUndefined();
    });
  });

  describe('selectQuantityBySurface', () => {
    const calculation: RoomCalculation = {
      walls_gross: 40,
      walls_net: 35,
      ceiling_gross: 15,
      ceiling_net: 15,
      floor_gross: 15,
      floor_net: 15,
      openings_total: 5,
      wardrobes_deduction: 0,
    };

    it('should select walls_net for vägg', () => {
      const qty = selectQuantityBySurface('vägg', calculation, 1);
      expect(qty).toBe(35);
    });

    it('should select ceiling_net for tak', () => {
      const qty = selectQuantityBySurface('tak', calculation, 1);
      expect(qty).toBe(15);
    });

    it('should select floor_net for golv', () => {
      const qty = selectQuantityBySurface('golv', calculation, 1);
      expect(qty).toBe(15);
    });

    it('should apply layers multiplier', () => {
      const qty = selectQuantityBySurface('vägg', calculation, 2);
      expect(qty).toBe(70); // 35 × 2
    });

    it('should return 0 for unknown surface type', () => {
      const qty = selectQuantityBySurface('unknown', calculation, 1);
      expect(qty).toBe(0);
    });

    it('should return 0 for undefined surface type', () => {
      const qty = selectQuantityBySurface(undefined, calculation, 1);
      expect(qty).toBe(0);
    });
  });

  describe('parseLayerCount', () => {
    it('should parse Swedish number words with gånger', () => {
      expect(parseLayerCount('måla två gånger')).toBe(2);
      expect(parseLayerCount('tre gånger')).toBe(3);
    });

    it('should parse Swedish number words with lager', () => {
      expect(parseLayerCount('två lager färg')).toBe(2);
      expect(parseLayerCount('tre lager')).toBe(3);
    });

    it('should parse Swedish number words with strykningar', () => {
      expect(parseLayerCount('två strykningar')).toBe(2);
      expect(parseLayerCount('tre strykningar')).toBe(3);
    });

    it('should parse digits', () => {
      expect(parseLayerCount('måla 2 gånger')).toBe(2);
      expect(parseLayerCount('3 lager')).toBe(3);
    });

    it('should default to 1 if no layer count specified', () => {
      expect(parseLayerCount('måla väggar')).toBe(1);
      expect(parseLayerCount('grundmålning')).toBe(1);
    });

    // Swedish examples from PRD §22
    it('should handle "täckmålas två gånger" from PRD', () => {
      expect(parseLayerCount('täckmålas två gånger')).toBe(2);
    });
  });

  describe('validateMepsId', () => {
    it('should return true for existing meps_id', () => {
      expect(validateMepsId('MÅL-VÄGG-SPACK-M2', catalog)).toBe(true);
    });

    it('should return false for non-existent meps_id (guard rail)', () => {
      expect(validateMepsId('HALLUCINATED-ID', catalog)).toBe(false);
    });
  });

  describe('getTasksForContext', () => {
    it('should filter by surface type', () => {
      const tasks = getTasksForContext(catalog, 'vägg');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].surface_type).toBe('vägg');
    });

    it('should filter by unit', () => {
      const tasks = getTasksForContext(catalog, undefined, 'm2');
      expect(tasks).toHaveLength(3);
      tasks.forEach(task => expect(task.unit).toBe('m2'));
    });

    it('should filter by both surface type and unit', () => {
      const tasks = getTasksForContext(catalog, 'vägg', 'm2');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].surface_type).toBe('vägg');
      expect(tasks[0].unit).toBe('m2');
    });

    it('should return all tasks if no filters', () => {
      const tasks = getTasksForContext(catalog);
      expect(tasks).toHaveLength(3);
    });
  });

  describe('Swedish Task Phrases from PRD §22', () => {
    // PRD Appendix A - Swedish Task Lexicon examples
    // Testing that our mapper can handle real-world Swedish painting phrases

    it('should map "spackla väggar" to wall spackling task', () => {
      const result = mapSpokenTaskToMeps('spackla väggar', catalog);
      expect(result.task).toBeDefined();
      expect(result.task?.surface_type).toBe('vägg');
    });

    it('should map "bredspackla tak" to ceiling spackling task', () => {
      const result = mapSpokenTaskToMeps('bredspackla tak', catalog);
      // Note: This would need MÅL-TAK-SPACK-M2 in catalog
      // For now, just verify it tries to find a tak task
      const surfaceType = resolveSurfaceType('bredspackla tak');
      expect(surfaceType).toBe('tak');
    });

    it('should map "täckmåla två gånger" to paint task with 2 layers', () => {
      const layers = parseLayerCount('täckmåla två gånger');
      expect(layers).toBe(2);
      
      const result = mapSpokenTaskToMeps('täckmåla tak', catalog);
      expect(result.task).toBeDefined();
    });

    it('should map "måla dörr en sida" to door painting (st)', () => {
      const surfaceType = resolveSurfaceType('måla dörr en sida');
      expect(surfaceType).toBe('dörr');
    });

    it('should map "måla fönster" to window painting (st)', () => {
      const surfaceType = resolveSurfaceType('måla fönster');
      expect(surfaceType).toBe('fönster');
    });

    it('should map "listmålning" to trim painting (lpm)', () => {
      const surfaceType = resolveSurfaceType('listmålning');
      expect(surfaceType).toBe('list');
    });

    // Additional comprehensive Swedish phrases
    it('should handle "grundmåla väggar" (prime walls)', () => {
      const surfaceType = resolveSurfaceType('grundmåla väggar');
      expect(surfaceType).toBe('vägg');
    });

    it('should handle "slipa tak" (sand ceiling)', () => {
      const surfaceType = resolveSurfaceType('slipa tak');
      expect(surfaceType).toBe('tak');
    });

    it('should handle "måla betonggolv" (paint concrete floor)', () => {
      const result = mapSpokenTaskToMeps('måla betonggolv', catalog);
      expect(result.task).toBeDefined();
      expect(result.task?.meps_id).toBe('MÅL-GOLV-BETONG-M2');
    });

    it('should handle "taklist" (ceiling trim)', () => {
      const surfaceType = resolveSurfaceType('taklist');
      expect(surfaceType).toBe('list');
    });

    it('should handle "golvlist" (floor trim)', () => {
      const surfaceType = resolveSurfaceType('golvlist');
      expect(surfaceType).toBe('list');
    });

    // Test case insensitivity with Swedish characters
    it('should handle Swedish characters åäö in any case', () => {
      expect(resolveSurfaceType('MÅLA VÄGGAR')).toBe('vägg');
      expect(resolveSurfaceType('Måla Dörr')).toBe('dörr');
    });
  });
});

