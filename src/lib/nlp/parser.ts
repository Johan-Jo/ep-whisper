/**
 * NLP Intent Parser for Swedish Painting Commands
 * 
 * Parses transcribed Swedish text to extract:
 * - Painting tasks (måla, spackla, grundmåla, etc.)
 * - Surfaces (väggar, tak, dörrar, fönster, list, golv)
 * - Quantities (numbers, layers, repetitions)
 * - Modifiers (två gånger, tre lager, etc.)
 */

export interface ParsedIntent {
  tasks: ParsedTask[];
  confidence: number;
  rawText: string;
  language: string;
}

export interface ParsedTask {
  action: string;           // 'måla', 'spackla', 'grundmåla', etc.
  surface: string;          // 'väggar', 'tak', 'dörrar', etc.
  quantity: number;         // number of layers/repetitions
  unit: string;             // 'lager', 'gånger', 'st', etc.
  confidence: number;       // confidence in this specific task
}

// Swedish painting action keywords
const PAINTING_ACTIONS = {
  // Primary painting actions
  'måla': { action: 'paint', confidence: 1.0 },
  'målning': { action: 'paint', confidence: 1.0 },
  'målar': { action: 'paint', confidence: 1.0 },
  
  // Preparation actions
  'spackla': { action: 'skim_coat', confidence: 1.0 },
  'spackling': { action: 'skim_coat', confidence: 1.0 },
  'spacklar': { action: 'skim_coat', confidence: 1.0 },
  
  'grundmåla': { action: 'prime', confidence: 1.0 },
  'grundmåling': { action: 'prime', confidence: 1.0 },
  'grundmålar': { action: 'prime', confidence: 1.0 },
  
  'täckmåla': { action: 'topcoat', confidence: 1.0 },
  'täckmåling': { action: 'topcoat', confidence: 1.0 },
  'täckmålar': { action: 'topcoat', confidence: 1.0 },
  
  // Alternative expressions
  'göra': { action: 'paint', confidence: 0.8 },
  'behandla': { action: 'paint', confidence: 0.8 },
  'renovera': { action: 'paint', confidence: 0.7 },
} as const;

// Surface keywords with confidence scores
const SURFACE_KEYWORDS = {
  // Walls
  'vägg': { surface: 'vägg', confidence: 1.0 },
  'väggar': { surface: 'vägg', confidence: 1.0 },
  'väggen': { surface: 'vägg', confidence: 1.0 },
  'väggarna': { surface: 'vägg', confidence: 1.0 },
  
  // Ceiling
  'tak': { surface: 'tak', confidence: 1.0 },
  'taket': { surface: 'tak', confidence: 1.0 },
  
  // Doors
  'dörr': { surface: 'dörr', confidence: 1.0 },
  'dörrar': { surface: 'dörr', confidence: 1.0 },
  'dörren': { surface: 'dörr', confidence: 1.0 },
  'dörrarna': { surface: 'dörr', confidence: 1.0 },
  
  // Windows
  'fönster': { surface: 'fönster', confidence: 1.0 },
  'fönstret': { surface: 'fönster', confidence: 1.0 },
  'fönstren': { surface: 'fönster', confidence: 1.0 },
  'fönsterna': { surface: 'fönster', confidence: 1.0 },
  
  // Trim/List
  'list': { surface: 'list', confidence: 1.0 },
  'listen': { surface: 'list', confidence: 1.0 },
  'lister': { surface: 'list', confidence: 1.0 },
  'taklist': { surface: 'list', confidence: 1.0 },
  'golvlist': { surface: 'list', confidence: 1.0 },
  
  // Floor
  'golv': { surface: 'golv', confidence: 1.0 },
  'golvet': { surface: 'golv', confidence: 1.0 },
  'golven': { surface: 'golv', confidence: 1.0 },
  'golvena': { surface: 'golv', confidence: 1.0 },
} as const;

// Quantity keywords
const QUANTITY_KEYWORDS = {
  'en': 1, 'ett': 1,
  'två': 2, 'tre': 3, 'fyra': 4, 'fem': 5,
  'sex': 6, 'sju': 7, 'åtta': 8, 'nio': 9, 'tio': 10,
} as const;

// Unit keywords for layers/repetitions
const UNIT_KEYWORDS = {
  'lager': { unit: 'lager', confidence: 1.0 },
  'lagret': { unit: 'lager', confidence: 1.0 },
  'lagren': { unit: 'lager', confidence: 1.0 },
  
  'gånger': { unit: 'gånger', confidence: 1.0 },
  'gång': { unit: 'gånger', confidence: 1.0 },
  'gången': { unit: 'gånger', confidence: 1.0 },
  
  'st': { unit: 'st', confidence: 1.0 },
  'stycken': { unit: 'st', confidence: 1.0 },
  'styck': { unit: 'st', confidence: 1.0 },
} as const;

/**
 * Parse Swedish voice command into structured painting tasks
 */
export function parseSwedishIntent(text: string): ParsedIntent {
  const normalizedText = text.toLowerCase().trim();
  
  // Extract individual words for analysis
  const words = normalizedText.split(/\s+/);
  
  const parsedTasks: ParsedTask[] = [];
  let overallConfidence = 0;
  
  // Find painting actions and their associated surfaces/quantities
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Check if this word is a painting action
    const actionMatch = PAINTING_ACTIONS[word as keyof typeof PAINTING_ACTIONS];
    if (!actionMatch) continue;
    
    // Look for surface in nearby words (within 3 words before/after)
    const surfaceRange = words.slice(Math.max(0, i - 3), Math.min(words.length, i + 4));
    const surfaceMatch = findBestSurfaceMatch(surfaceRange);
    
    // Look for quantity in nearby words
    const quantityMatch = findQuantityMatch(words, i);
    
    // Create parsed task
    const task: ParsedTask = {
      action: actionMatch.action,
      surface: surfaceMatch?.surface || 'vägg', // Default to wall if no surface found
      quantity: quantityMatch?.quantity || 1,   // Default to 1 if no quantity found
      unit: quantityMatch?.unit || 'lager',     // Default to layers
      confidence: Math.min(0.95, actionMatch.confidence * (surfaceMatch?.confidence || 0.8) * (quantityMatch?.confidence || 0.95))
    };
    
    parsedTasks.push(task);
    overallConfidence += task.confidence;
  }
  
  // Calculate overall confidence
  const finalConfidence = parsedTasks.length > 0 ? overallConfidence / parsedTasks.length : 0;
  
  return {
    tasks: parsedTasks,
    confidence: finalConfidence,
    rawText: text,
    language: 'sv'
  };
}

/**
 * Find the best surface match in a range of words
 */
function findBestSurfaceMatch(words: string[]): { surface: string; confidence: number } | null {
  let bestMatch: { surface: string; confidence: number } | null = null;
  
  // First, try exact matches
  for (const word of words) {
    const match = SURFACE_KEYWORDS[word as keyof typeof SURFACE_KEYWORDS];
    if (match && (!bestMatch || match.confidence > bestMatch.confidence)) {
      bestMatch = match;
    }
  }
  
  // If no exact match, try partial matches (e.g., "taklisten" contains "taklist")
  if (!bestMatch) {
    const joinedWords = words.join(' ');
    // Sort by key length (longer matches first) to prioritize more specific matches
    const sortedEntries = Object.entries(SURFACE_KEYWORDS).sort(([a], [b]) => b.length - a.length);
    
    for (const [key, value] of sortedEntries) {
      if (joinedWords.includes(key) && (!bestMatch || value.confidence > bestMatch.confidence)) {
        bestMatch = value;
      }
    }
  }
  
  return bestMatch;
}

/**
 * Find quantity and unit information near an action word
 */
function findQuantityMatch(words: string[], actionIndex: number): { quantity: number; unit: string; confidence: number } | null {
  // Look in a window around the action word
  const start = Math.max(0, actionIndex - 2);
  const end = Math.min(words.length, actionIndex + 4);
  const searchWords = words.slice(start, end);
  
  let quantity = 1;
  let unit = 'lager';
  let confidence = 0.8;
  
  // Find quantity - look for number followed by unit
  for (let i = 0; i < searchWords.length; i++) {
    const word = searchWords[i];
    
    // Check for number
    if (word in QUANTITY_KEYWORDS) {
      quantity = QUANTITY_KEYWORDS[word as keyof typeof QUANTITY_KEYWORDS];
      confidence = 1.0;
      
      // Look for unit in next word
      if (i + 1 < searchWords.length) {
        const nextWord = searchWords[i + 1];
        const unitMatch = UNIT_KEYWORDS[nextWord as keyof typeof UNIT_KEYWORDS];
        if (unitMatch) {
          unit = unitMatch.unit;
          confidence *= unitMatch.confidence;
        }
      }
      break;
    }
  }
  
  return { quantity, unit, confidence };
}

/**
 * Validate that parsed intent makes sense
 */
export function validateParsedIntent(intent: ParsedIntent): boolean {
  if (intent.tasks.length === 0) return false;
  if (intent.confidence < 0.3) return false;
  
  // Check that each task has valid components
  for (const task of intent.tasks) {
    if (!task.action || !task.surface) return false;
    if (task.quantity < 1 || task.quantity > 10) return false;
    if (task.confidence < 0.2) return false;
  }
  
  return true;
}

/**
 * Format parsed intent for display
 */
export function formatParsedIntent(intent: ParsedIntent): string {
  if (intent.tasks.length === 0) {
    return 'Ingen målning uppgift identifierad';
  }
  
  const taskDescriptions = intent.tasks.map(task => {
    const actionText = {
      'paint': 'Måla',
      'skim_coat': 'Spackla',
      'prime': 'Grundmåla',
      'topcoat': 'Täckmåla'
    }[task.action] || task.action;
    
    const surfaceText = {
      'vägg': 'väggar',
      'tak': 'tak',
      'dörr': 'dörrar',
      'fönster': 'fönster',
      'list': 'list',
      'golv': 'golv'
    }[task.surface] || task.surface;
    
    return `${actionText} ${surfaceText} (${task.quantity} ${task.unit})`;
  });
  
  return taskDescriptions.join(', ');
}
