import { describe, it, expect, beforeEach } from 'vitest';
import { MepsCatalog } from '../../lib/excel/catalog';
import { MepsRow } from '../../lib/types';

const sampleTasks: MepsRow[] = [
  {
    meps_id: 'TEST-VÄGG-001',
    task_name_sv: 'Måla väggar',
    unit: 'm2',
    labor_norm_per_unit: 0.10,
    surface_type: 'vägg',
    synonyms: 'väggmålning;måla vägg',
  },
  {
    meps_id: 'TEST-TAK-001',
    task_name_sv: 'Måla tak',
    unit: 'm2',
    labor_norm_per_unit: 0.12,
    surface_type: 'tak',
    synonyms: 'takmålning;måla tak',
  },
  {
    meps_id: 'TEST-DÖRR-001',
    task_name_sv: 'Måla dörr',
    unit: 'st',
    labor_norm_per_unit: 1.5,
    surface_type: 'dörr',
    synonyms: 'dörr målning',
  },
  {
    meps_id: 'TEST-LIST-001',
    task_name_sv: 'Måla list',
    unit: 'lpm',
    labor_norm_per_unit: 0.08,
    surface_type: 'list',
  },
];

describe('MepsCatalog', () => {
  let catalog: MepsCatalog;

  beforeEach(() => {
    catalog = new MepsCatalog();
  });

  describe('Task Indexing', () => {
    it('should index tasks by meps_id', () => {
      // @ts-expect-error - accessing private method for testing
      catalog.indexTasks(sampleTasks);

      const task = catalog.getTask('TEST-VÄGG-001');
      expect(task).toBeDefined();
      expect(task?.task_name_sv).toBe('Måla väggar');
    });

    it('should return undefined for non-existent task', () => {
      // @ts-expect-error
      catalog.indexTasks(sampleTasks);

      const task = catalog.getTask('NON-EXISTENT');
      expect(task).toBeUndefined();
    });
  });

  describe('Synonym Search', () => {
    beforeEach(() => {
      // @ts-expect-error
      catalog.indexTasks(sampleTasks);
    });

    it('should find tasks by synonym', () => {
      const tasks = catalog.searchBySynonym('väggmålning');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].meps_id).toBe('TEST-VÄGG-001');
    });

    it('should find tasks by task name', () => {
      const tasks = catalog.searchBySynonym('måla väggar');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].meps_id).toBe('TEST-VÄGG-001');
    });

    it('should be case-insensitive', () => {
      const tasks = catalog.searchBySynonym('VÄGGMÅLNING');
      expect(tasks).toHaveLength(1);
    });

    it('should return empty array for no matches', () => {
      const tasks = catalog.searchBySynonym('nonexistent');
      expect(tasks).toHaveLength(0);
    });

    it('should handle synonyms with semicolon separator', () => {
      const tasks1 = catalog.searchBySynonym('väggmålning');
      const tasks2 = catalog.searchBySynonym('måla vägg');
      expect(tasks1).toHaveLength(1);
      expect(tasks2).toHaveLength(1);
      expect(tasks1[0].meps_id).toBe(tasks2[0].meps_id);
    });
  });

  describe('Surface Type Search', () => {
    beforeEach(() => {
      // @ts-expect-error
      catalog.indexTasks(sampleTasks);
    });

    it('should find tasks by surface type', () => {
      const wallTasks = catalog.getTasksBySurfaceType('vägg');
      expect(wallTasks).toHaveLength(1);
      expect(wallTasks[0].meps_id).toBe('TEST-VÄGG-001');
    });

    it('should be case-insensitive', () => {
      const wallTasks = catalog.getTasksBySurfaceType('VÄGG');
      expect(wallTasks).toHaveLength(1);
    });

    it('should return empty array for surface type with no tasks', () => {
      const tasks = catalog.getTasksBySurfaceType('fönster');
      expect(tasks).toHaveLength(0);
    });
  });

  describe('Fuzzy Search', () => {
    beforeEach(() => {
      // @ts-expect-error
      catalog.indexTasks(sampleTasks);
    });

    it('should find exact matches with highest score', () => {
      const results = catalog.fuzzySearch('måla väggar');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].meps_id).toBe('TEST-VÄGG-001');
    });

    it('should find partial matches', () => {
      const results = catalog.fuzzySearch('väggar');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].task_name_sv).toContain('väggar');
    });

    it('should limit results', () => {
      const results = catalog.fuzzySearch('måla', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for no matches', () => {
      const results = catalog.fuzzySearch('zzz');
      expect(results).toHaveLength(0);
    });

    it('should search in synonyms', () => {
      const results = catalog.fuzzySearch('väggmålning');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Unit Filtering', () => {
    beforeEach(() => {
      // @ts-expect-error
      catalog.indexTasks(sampleTasks);
    });

    it('should get tasks by unit: m2', () => {
      const tasks = catalog.getTasksByUnit('m2');
      expect(tasks).toHaveLength(2); // vägg and tak
    });

    it('should get tasks by unit: st', () => {
      const tasks = catalog.getTasksByUnit('st');
      expect(tasks).toHaveLength(1); // dörr
    });

    it('should get tasks by unit: lpm', () => {
      const tasks = catalog.getTasksByUnit('lpm');
      expect(tasks).toHaveLength(1); // list
    });
  });

  describe('Task Existence', () => {
    beforeEach(() => {
      // @ts-expect-error
      catalog.indexTasks(sampleTasks);
    });

    it('should return true for existing task', () => {
      expect(catalog.hasTask('TEST-VÄGG-001')).toBe(true);
    });

    it('should return false for non-existent task', () => {
      expect(catalog.hasTask('NON-EXISTENT')).toBe(false);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // @ts-expect-error
      catalog.indexTasks(sampleTasks);
    });

    it('should return correct total tasks count', () => {
      const stats = catalog.getStats();
      expect(stats.totalTasks).toBe(4);
    });

    it('should return correct unit distribution', () => {
      const stats = catalog.getStats();
      expect(stats.tasksByUnit.m2).toBe(2);
      expect(stats.tasksByUnit.st).toBe(1);
      expect(stats.tasksByUnit.lpm).toBe(1);
    });

    it('should return correct surface type distribution', () => {
      const stats = catalog.getStats();
      expect(stats.tasksBySurfaceType.vägg).toBe(1);
      expect(stats.tasksBySurfaceType.tak).toBe(1);
      expect(stats.tasksBySurfaceType.dörr).toBe(1);
      expect(stats.tasksBySurfaceType.list).toBe(1);
    });
  });

  describe('Clear Catalog', () => {
    it('should clear all data', () => {
      // @ts-expect-error
      catalog.indexTasks(sampleTasks);
      expect(catalog.getAllTasks()).toHaveLength(4);

      catalog.clear();
      expect(catalog.getAllTasks()).toHaveLength(0);
      expect(catalog.getStats().totalTasks).toBe(0);
    });
  });
});

