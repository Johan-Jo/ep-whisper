import { MepsRow } from '../types';
import { parseExcelFile, parseExcelBuffer, toMepsRows } from './parser';
import { ValidationResult } from './schema';

/**
 * In-memory catalog store for MEPS painting tasks
 */
export class MepsCatalog {
  private tasks: Map<string, MepsRow> = new Map();
  private synonymIndex: Map<string, string[]> = new Map(); // synonym -> meps_ids
  private surfaceTypeIndex: Map<string, string[]> = new Map(); // surface_type -> meps_ids
  private lastUpdated: Date | null = null;
  private filePath: string | null = null;

  /**
   * Load catalog from Excel file
   */
  async loadFromFile(filePath: string): Promise<ValidationResult> {
    const result = await parseExcelFile(filePath);

    if (result.success && result.data) {
      const mepsRows = toMepsRows(result.data);
      this.indexTasks(mepsRows);
      this.filePath = filePath;
      this.lastUpdated = new Date();
    }

    return result;
  }

  /**
   * Load catalog from buffer (for web uploads)
   */
  async loadFromBuffer(buffer: ArrayBuffer): Promise<ValidationResult> {
    const result = await parseExcelBuffer(buffer);

    if (result.success && result.data) {
      const mepsRows = toMepsRows(result.data);
      this.indexTasks(mepsRows);
      this.filePath = null;
      this.lastUpdated = new Date();
    }

    return result;
  }

  /**
   * Reload catalog from the original file path
   */
  async refresh(): Promise<ValidationResult | null> {
    if (!this.filePath) {
      return null;
    }

    return this.loadFromFile(this.filePath);
  }

  /**
   * Load catalog from array of MepsRow objects (for testing/demo)
   */
  async loadFromRows(rows: MepsRow[]): Promise<void> {
    this.indexTasks(rows);
    this.filePath = null;
    this.lastUpdated = new Date();
  }

  /**
   * Index tasks for fast lookup
   */
  private indexTasks(tasks: MepsRow[]): void {
    this.tasks.clear();
    this.synonymIndex.clear();
    this.surfaceTypeIndex.clear();

    for (const task of tasks) {
      // Primary index by meps_id
      this.tasks.set(task.meps_id, task);

      // Index synonyms
      if (task.synonyms) {
        const synonyms = task.synonyms
          .split(';')
          .map((s) => s.trim().toLowerCase())
          .filter((s) => s.length > 0);

        for (const synonym of synonyms) {
          if (!this.synonymIndex.has(synonym)) {
            this.synonymIndex.set(synonym, []);
          }
          this.synonymIndex.get(synonym)!.push(task.meps_id);
        }
      }

      // Index by surface type
      if (task.surface_type) {
        const surfaceType = task.surface_type.toLowerCase();
        if (!this.surfaceTypeIndex.has(surfaceType)) {
          this.surfaceTypeIndex.set(surfaceType, []);
        }
        this.surfaceTypeIndex.get(surfaceType)!.push(task.meps_id);
      }

      // Also index task_name_sv for direct lookups
      const taskNameLower = task.task_name_sv.toLowerCase();
      if (!this.synonymIndex.has(taskNameLower)) {
        this.synonymIndex.set(taskNameLower, []);
      }
      this.synonymIndex.get(taskNameLower)!.push(task.meps_id);
    }
  }

  /**
   * Get task by meps_id
   */
  getTask(mepsId: string): MepsRow | undefined {
    return this.tasks.get(mepsId);
  }

  /**
   * Search tasks by synonym or task name
   */
  searchBySynonym(query: string): MepsRow[] {
    const queryLower = query.toLowerCase().trim();
    const mepsIds = this.synonymIndex.get(queryLower) || [];

    return mepsIds
      .map((id) => this.tasks.get(id))
      .filter((task): task is MepsRow => task !== undefined);
  }

  /**
   * Get tasks by surface type
   */
  getTasksBySurfaceType(surfaceType: string): MepsRow[] {
    const surfaceTypeLower = surfaceType.toLowerCase();
    const mepsIds = this.surfaceTypeIndex.get(surfaceTypeLower) || [];

    return mepsIds
      .map((id) => this.tasks.get(id))
      .filter((task): task is MepsRow => task !== undefined);
  }

  /**
   * Fuzzy search tasks by partial name match
   */
  fuzzySearch(query: string, limit: number = 10): MepsRow[] {
    const queryLower = query.toLowerCase().trim();
    const matches: Array<{ task: MepsRow; score: number }> = [];

    for (const task of this.tasks.values()) {
      const taskNameLower = task.task_name_sv.toLowerCase();

      // Exact match
      if (taskNameLower === queryLower) {
        matches.push({ task, score: 100 });
        continue;
      }

      // Starts with query
      if (taskNameLower.startsWith(queryLower)) {
        matches.push({ task, score: 80 });
        continue;
      }

      // Contains query
      if (taskNameLower.includes(queryLower)) {
        matches.push({ task, score: 50 });
        continue;
      }

      // Check synonyms
      if (task.synonyms) {
        const synonyms = task.synonyms.split(';').map((s) => s.trim().toLowerCase());
        for (const synonym of synonyms) {
          if (synonym.includes(queryLower)) {
            matches.push({ task, score: 40 });
            break;
          }
        }
      }
    }

    // Sort by score descending and limit results
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((m) => m.task);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): MepsRow[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks filtered by unit
   */
  getTasksByUnit(unit: 'm2' | 'lpm' | 'st'): MepsRow[] {
    return Array.from(this.tasks.values()).filter((task) => task.unit === unit);
  }

  /**
   * Check if a meps_id exists in the catalog
   */
  hasTask(mepsId: string): boolean {
    return this.tasks.has(mepsId);
  }

  /**
   * Get catalog statistics
   */
  getStats() {
    return {
      totalTasks: this.tasks.size,
      tasksByUnit: {
        m2: this.getTasksByUnit('m2').length,
        lpm: this.getTasksByUnit('lpm').length,
        st: this.getTasksByUnit('st').length,
      },
      tasksBySurfaceType: {
        vägg: this.getTasksBySurfaceType('vägg').length,
        tak: this.getTasksBySurfaceType('tak').length,
        golv: this.getTasksBySurfaceType('golv').length,
        dörr: this.getTasksBySurfaceType('dörr').length,
        fönster: this.getTasksBySurfaceType('fönster').length,
        list: this.getTasksBySurfaceType('list').length,
      },
      lastUpdated: this.lastUpdated,
      filePath: this.filePath,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.tasks.clear();
    this.synonymIndex.clear();
    this.surfaceTypeIndex.clear();
    this.lastUpdated = null;
    this.filePath = null;
  }
}

// Global singleton instance
let catalogInstance: MepsCatalog | null = null;

/**
 * Get the global catalog instance
 */
export function getCatalog(): MepsCatalog {
  if (!catalogInstance) {
    catalogInstance = new MepsCatalog();
  }
  return catalogInstance;
}

/**
 * Reset the global catalog instance (useful for testing)
 */
export function resetCatalog(): void {
  catalogInstance = null;
}
