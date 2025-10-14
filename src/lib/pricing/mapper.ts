import { MepsRow } from '../types';
import { MepsCatalog } from '../excel/catalog';
import { RoomCalculation } from '../types';

export interface TaskMappingResult {
  task: MepsRow | null;
  confidence: number;
  matches: MepsRow[];
}

/**
 * Map spoken Swedish phrase to MEPS task using synonyms
 * Returns the best matching task from the Excel catalog
 */
export function mapSpokenTaskToMeps(
  spokenPhrase: string,
  catalog: MepsCatalog,
  surfaceType?: string
): TaskMappingResult {
  const phrase = spokenPhrase.toLowerCase().trim();

  // First try exact synonym match
  const exactMatches = catalog.searchBySynonym(phrase);
  if (exactMatches.length > 0) {
    return {
      task: exactMatches[0],
      confidence: 1.0,
      matches: exactMatches,
    };
  }

  // Filter by surface type if provided
  let candidates = surfaceType 
    ? catalog.getTasksBySurfaceType(surfaceType)
    : catalog.getAllTasks();

  // Try fuzzy search
  const fuzzyMatches = catalog.fuzzySearch(phrase, 5);
  if (fuzzyMatches.length > 0) {
    // If surface type was specified, prefer matches with that surface type
    if (surfaceType) {
      const filteredMatches = fuzzyMatches.filter(
        (task) => task.surface_type?.toLowerCase() === surfaceType.toLowerCase()
      );
      if (filteredMatches.length > 0) {
        return {
          task: filteredMatches[0],
          confidence: 0.7,
          matches: filteredMatches,
        };
      }
    }

    return {
      task: fuzzyMatches[0],
      confidence: 0.5,
      matches: fuzzyMatches,
    };
  }

  // No match found - guard rail against hallucination
  return {
    task: null,
    confidence: 0,
    matches: [],
  };
}

/**
 * Resolve surface type from Swedish keywords
 */
export function resolveSurfaceType(phrase: string): string | undefined {
  const phraseLower = phrase.toLowerCase();

  // Check more specific keywords first (e.g., "taklist" before "tak")
  const surfaceKeywords: Record<string, string[]> = {
    list: ['taklist', 'golvlist', 'fönsterlist', 'list', 'lister', 'trim', 'molding'],
    vägg: ['vägg', 'väggar', 'wall'],
    tak: ['tak', 'taket', 'ceiling'],
    golv: ['golv', 'golvet', 'floor', 'betong', 'trä'],
    dörr: ['dörr', 'dörren', 'dörrar', 'door'],
    fönster: ['fönster', 'fönstret', 'window'],
  };

  // Check in order of specificity (compound words first)
  for (const [surfaceType, keywords] of Object.entries(surfaceKeywords)) {
    for (const keyword of keywords) {
      if (phraseLower.includes(keyword)) {
        return surfaceType;
      }
    }
  }

  return undefined;
}

/**
 * Select appropriate quantity based on surface type and room calculation
 */
export function selectQuantityBySurface(
  surfaceType: string | undefined,
  calculation: RoomCalculation,
  layers: number = 1
): number {
  if (!surfaceType) return 0;

  const surfaceLower = surfaceType.toLowerCase();

  switch (surfaceLower) {
    case 'vägg':
      return calculation.walls_net * layers;
    case 'tak':
      return calculation.ceiling_net * layers;
    case 'golv':
      return calculation.floor_net * layers;
    default:
      return 0;
  }
}

/**
 * Parse layer count from Swedish phrases
 * Examples: "två gånger" → 2, "tre lager" → 3
 */
export function parseLayerCount(phrase: string): number {
  const phraseLower = phrase.toLowerCase();

  // Swedish number words
  const numberWords: Record<string, number> = {
    'en': 1,
    'ett': 1,
    'två': 2,
    'tre': 3,
    'fyra': 4,
    'fem': 5,
  };

  // Check for number words followed by layer indicators
  for (const [word, num] of Object.entries(numberWords)) {
    if (phraseLower.includes(`${word} gånger`) || 
        phraseLower.includes(`${word} lager`) ||
        phraseLower.includes(`${word} strykningar`)) {
      return num;
    }
  }

  // Check for digit followed by layer indicators
  const digitMatch = phraseLower.match(/(\d+)\s*(gånger|lager|strykningar)/);
  if (digitMatch) {
    return parseInt(digitMatch[1], 10);
  }

  return 1; // Default single layer
}

/**
 * Guard rail: Verify meps_id exists in catalog before use
 * Returns true if task is valid, false if it would be a hallucination
 */
export function validateMepsId(mepsId: string, catalog: MepsCatalog): boolean {
  return catalog.hasTask(mepsId);
}

/**
 * Get all tasks that match a surface type and unit combination
 * Useful for template-based filtering
 */
export function getTasksForContext(
  catalog: MepsCatalog,
  surfaceType?: string,
  unit?: 'm2' | 'lpm' | 'st'
): MepsRow[] {
  let tasks = catalog.getAllTasks();

  if (surfaceType) {
    tasks = tasks.filter(
      (task) => task.surface_type?.toLowerCase() === surfaceType.toLowerCase()
    );
  }

  if (unit) {
    tasks = tasks.filter((task) => task.unit === unit);
  }

  return tasks;
}
