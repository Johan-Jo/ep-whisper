/**
 * Parse user responses in conversational workflow
 */

import { ConversationStep } from './types';

/**
 * Parse client name from transcription
 * Validates and formats client/customer name
 */
export function parseClientName(transcription: string): string | null {
  // Remove common Swedish phrases
  const cleaned = transcription
    .toLowerCase()
    .replace(/^(kunden heter|det heter|det är|namnet är|hon heter|han heter|de heter|företaget heter)\s+/i, '')
    .trim();
  
  // Validate length
  if (cleaned.length < 2 || cleaned.length > 100) {
    return null;
  }
  
  // Capitalize first letter of each word (handle Swedish characters)
  const capitalized = cleaned
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return capitalized;
}

/**
 * Parse project/room name from transcription
 */
export function parseProjectName(transcription: string): string {
  // Remove common phrases and extract the name
  const cleaned = transcription
    .toLowerCase()
    .replace(/^(det heter|projektet heter|rummet heter|det är|jag vill kalla det)\s+/i, '')
    .replace(/^(jag|vi|det)\s+(ska|vill|behöver)\s+(måla|renovera)\s+/i, '')
    .trim();
  
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Parse room measurements from transcription
 * Supports Swedish measurement formats:
 * - "fyra och fyrtio gånger två och femtio gånger två och femtiusjus" → {width: 4.40, length: 2.50, height: 2.57}
 * - "fyra gånger fem gånger två och en halv" → {width: 4, length: 5, height: 2.5}
 * - "4,40 meter bred, 2,50 meter lång, 2,57 meter hög" → {width: 4.40, length: 2.50, height: 2.57}
 */
export function parseMeasurements(transcription: string): {
  width?: number;
  length?: number;
  height?: number;
  doors?: number;
  windows?: number;
} {
  const text = transcription.toLowerCase();
  
  // Number word mapping (0-99 for handling centimeters)
  const numberWords: Record<string, number> = {
    'noll': 0, 'en': 1, 'ett': 1, 'två': 2, 'tre': 3, 'fyra': 4, 'fem': 5,
    'sex': 6, 'sju': 7, 'åtta': 8, 'nio': 9, 'tio': 10,
    'elva': 11, 'tolv': 12, 'tretton': 13, 'fjorton': 14, 'femton': 15,
    'sexton': 16, 'sjutton': 17, 'arton': 18, 'nitton': 19,
    'tjugo': 20, 'trettio': 30, 'fyrtio': 40, 'femtio': 50, 'femti': 50,  // Add "femti" variant
    'sextio': 60, 'sjuttio': 70, 'åttio': 80, 'nittio': 90,
  };
  
  // Special handling for compound numbers in Swedish
  // "fyra och fyrtio" = 4.40, "två och femtio" = 2.50, "tre och femtiusjus" = 3.57
  let normalized = text;
  
  // Handle "X och Y" where it means X.Y meters (Swedish centimeters as decimals)
  // Pattern 1: "fyra och fyrtio fem" or "två och femti sju" (compound tens + units)
  const compoundPattern = /(\d+|en|ett|två|tre|fyra|fem|sex|sju|åtta|nio)\s+och\s+(tjugo|trettio|fyrtio|femtio|femti|sextio|sjuttio|åttio|nittio)\s*(en|ett|två|tre|fyra|fem|sex|sju|åtta|nio|\d)?/gi;
  
  normalized = normalized.replace(compoundPattern, (match, meters, tens, units) => {
    const metersNum = numberWords[meters.toLowerCase()] || parseInt(meters) || 0;
    let centimetersNum = numberWords[tens.toLowerCase()] || 0;
    
    // Add units if present (e.g., "femti sju" = 57)
    if (units && units.trim()) {
      const unitsNum = numberWords[units.trim().toLowerCase()] || parseInt(units.trim()) || 0;
      centimetersNum += unitsNum;
    }
    
    // Convert to decimal: 4 och 40 → 4.40, 2 och 57 → 2.57
    const decimal = metersNum + (centimetersNum / 100);
    return String(decimal);
  });
  
  // Pattern 2: Simple "X och YY" where YY is already a two-digit number
  const simplePattern = /(\d+|en|ett|två|tre|fyra|fem|sex|sju|åtta|nio)\s+och\s+(\d{2})/gi;
  
  normalized = normalized.replace(simplePattern, (match, meters, centimeters) => {
    const metersNum = numberWords[meters.toLowerCase()] || parseInt(meters) || 0;
    const centimetersNum = parseInt(centimeters) || 0;
    
    // Convert to decimal: 4 och 40 → 4.40
    const decimal = metersNum + (centimetersNum / 100);
    return String(decimal);
  });
  
  // Handle "X och en halv" (X.5 meters)
  normalized = normalized.replace(/\b(\d+|en|ett|två|tre|fyra|fem|sex|sju|åtta|nio|tio)\s+och\s+(en\s+)?halv(a)?\b/gi, (match, num) => {
    const base = numberWords[num.toLowerCase()] || parseFloat(num);
    return String(base + 0.5);
  });
  
  // Convert remaining number words to digits
  let prevNormalized = '';
  while (prevNormalized !== normalized) {
    prevNormalized = normalized;
    for (const [word, num] of Object.entries(numberWords)) {
      normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'gi'), String(num));
    }
  }
  
  // Extract numbers (support both comma and period as decimal)
  const numbers = normalized.match(/\d+[.,]?\d*/g)?.map(n => parseFloat(n.replace(',', '.'))) || [];
  
  // Special handling for comma-separated measurements like "4, 34, gånger 5 och 25, gånger 2 och 50"
  // This should be interpreted as "4.34 × 5.25 × 2.50"
  if (text.includes(',') && text.includes('gånger')) {
    // Split by "gånger" to get measurement groups
    const gangerParts = text.split('gånger').map(part => part.trim());
    const measurementGroups: number[] = [];
    
    for (let i = 0; i < gangerParts.length; i++) {
      const part = gangerParts[i];
      
      // Handle different patterns in each part
      if (part.includes('och')) {
        // Pattern: "X och Y" (e.g., "5 och 25" = 5.25)
        const ochMatch = part.match(/(\d+)\s+och\s+(\d+)/);
        if (ochMatch) {
          const whole = parseFloat(ochMatch[1]);
          const decimal = parseFloat(ochMatch[2]);
          const combined = whole + (decimal / 100);
          measurementGroups.push(combined);
        }
      } else if (part.includes(',')) {
        // Pattern: "X, Y" (e.g., "4, 34" = 4.34)
        const numbers = part.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
          const whole = parseFloat(numbers[0]);
          const decimal = parseFloat(numbers[1]);
          const combined = whole + (decimal / 100);
          measurementGroups.push(combined);
        } else if (numbers && numbers.length === 1) {
          // Single number
          measurementGroups.push(parseFloat(numbers[0]));
        }
      } else {
        // Pattern: single number or simple format
        const numbers = part.match(/\d+[.,]?\d*/g);
        if (numbers && numbers.length > 0) {
          const num = parseFloat(numbers[0].replace(',', '.'));
          measurementGroups.push(num);
        }
      }
    }
    
    // If we found measurement groups, use them
    if (measurementGroups.length >= 3) {
      return {
        width: measurementGroups[0],
        length: measurementGroups[1],
        height: measurementGroups[2],
        doors: measurementGroups[3] || 1,
        windows: measurementGroups[4] || 1,
      };
    }
  }
  
  // Pattern 1: "X gånger Y gånger Z" - typical Swedish format
  if (text.includes('gånger') || text.includes('×') || text.includes('x')) {
    if (numbers.length >= 3) {
      return {
        width: numbers[0],
        length: numbers[1],
        height: numbers[2],
        doors: numbers[3] || 1,
        windows: numbers[4] || 1,
      };
    } else if (numbers.length === 2) {
      // Only width and length, assume standard height
      return {
        width: numbers[0],
        length: numbers[1],
        height: 2.5, // Default height
        doors: 1,
        windows: 1,
      };
    } else if (numbers.length === 1) {
      // Single measurement (width only)
      return {
        width: numbers[0],
      };
    }
  }
  
  // Pattern 2: Named dimensions
  const result: any = {};
  
  if (text.match(/bredd[:\s]+(\d+[.,]?\d*)/)) {
    result.width = parseFloat(RegExp.$1.replace(',', '.'));
  }
  if (text.match(/längd[:\s]+(\d+[.,]?\d*)/)) {
    result.length = parseFloat(RegExp.$1.replace(',', '.'));
  }
  if (text.match(/höjd[:\s]+(\d+[.,]?\d*)/)) {
    result.height = parseFloat(RegExp.$1.replace(',', '.'));
  }
  if (text.match(/dörr(ar)?[:\s]+(\d+)/)) {
    result.doors = parseInt(RegExp.$2);
  }
  if (text.match(/fönster[:\s]+(\d+)/)) {
    result.windows = parseInt(RegExp.$2);
  }
  
  // Fallback: Use extracted numbers based on count
  if (!result.width && numbers.length > 0) {
    if (numbers.length >= 3) {
      return {
        width: numbers[0],
        length: numbers[1],
        height: numbers[2],
        doors: numbers[3] || 1,
        windows: numbers[4] || 1,
      };
    } else if (numbers.length === 2) {
      return {
        width: numbers[0],
        length: numbers[1],
      };
    } else if (numbers.length === 1) {
      return {
        width: numbers[0],
      };
    }
  }
  
  return result;
}

/**
 * Check if user said "done" / "klar"
 */
export function isDone(transcription: string): boolean {
  const text = transcription.toLowerCase().trim();
  // Remove punctuation and extra words
  const cleaned = text.replace(/[!?.]/g, '').trim();
  
  // Match various "done" expressions - including "KLAR" in caps
  return /^(klar|färdig|slut|det var allt|inga fler|stopp|jag är klar|det är klar|nu är jag klar)$/i.test(cleaned) ||
         /\b(klar|färdig|slut)\b/i.test(cleaned) ||
         text === 'klar' || text === 'KLAR';
}

/**
 * Check if user wants to add more tasks
 */
export function wantsToAddMore(transcription: string): boolean {
  const text = transcription.toLowerCase().trim();
  return /^(lägg till|mer|fortsätt|fler|ja mer|en till)$/i.test(text);
}

/**
 * Check if user confirms
 */
export function isConfirmation(transcription: string): boolean {
  const text = transcription.toLowerCase().trim();
  // Remove punctuation for better matching
  const cleaned = text.replace(/[!?.]/g, '').trim();
  
  return /^(ja|japp|visst|ok|okej|bra|absolut|självklart)$/i.test(cleaned) ||
         /\b(ja|japp|visst|ok|okej|bra|absolut|självklart)\b/i.test(cleaned) ||
         /jag vill se resultatet/i.test(cleaned) ||
         /vill se/i.test(cleaned);
}

/**
 * Parse painting tasks from transcription using Whisper-EP methodology
 */
export function parsePaintingTasks(transcription: string): string[] {
  // Import the enhanced Whisper-EP parser
  try {
    const { parsePaintingTasksWithWhisperEP } = require('../whisper-ep/integration');
    return parsePaintingTasksWithWhisperEP(transcription);
  } catch (error) {
    console.warn('Whisper-EP integration not available, using fallback parser');
    return parsePaintingTasksFallback(transcription);
  }
}

/**
 * Fallback parser for when Whisper-EP is not available
 */
function parsePaintingTasksFallback(transcription: string): string[] {
  const text = transcription.toLowerCase();
  const tasks: string[] = [];
  
  // First try to parse the whole text (handles most cases)
  const wholeTextTasks = parsePaintingTasksInText(text);
  if (wholeTextTasks.length > 0) {
    return wholeTextTasks.filter(task => isValidPaintingTask(task));
  }
  
  // If no tasks found, try splitting by commas and reconstructing phrases
  const parts = text.split(',').map(part => part.trim()).filter(part => part.length > 0);
  
  // Try to reconstruct painting phrases from comma-separated parts
  const reconstructedPhrases = reconstructPaintingPhrases(parts);
  
  for (const phrase of reconstructedPhrases) {
    const phraseTasks = parsePaintingTasksInText(phrase);
    tasks.push(...phraseTasks);
  }
  
  // Filter out invalid/non-painting tasks
  return tasks.filter(task => isValidPaintingTask(task));
}

/**
 * Reconstruct painting phrases from comma-separated parts
 */
function reconstructPaintingPhrases(parts: string[]): string[] {
  const phrases: string[] = [];
  let currentPhrase = '';
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    // If this looks like the start of a painting task
    if (part.match(/^(måla|grundmåla|spackla|tapetsera|struk)$/)) {
      // Save previous phrase if it exists
      if (currentPhrase.trim()) {
        phrases.push(currentPhrase.trim());
      }
      // Start new phrase
      currentPhrase = part;
    }
    // If we have a current phrase and this looks like a surface
    else if (currentPhrase && part.match(/^(väggar?|tak|dörrar?|fönster|golv|lister?|radiatorer?)$/)) {
      currentPhrase += ' ' + part;
    }
    // If this looks like layer information
    else if (currentPhrase && part.match(/^(två|tre|fyra|fem|\d+)\s*(lager|skikt|gånger)$/)) {
      currentPhrase += ' ' + part;
    }
    // If this is a complete standalone task
    else if (part.match(/^(måla|grundmåla)\s+(väggar?|tak|dörrar?|fönster|golv|lister?|radiatorer?)/)) {
      phrases.push(part);
    }
    // Otherwise, add to current phrase if we have one
    else if (currentPhrase) {
      currentPhrase += ' ' + part;
    }
  }
  
  // Add the last phrase if it exists
  if (currentPhrase.trim()) {
    phrases.push(currentPhrase.trim());
  }
  
  return phrases;
}

/**
 * Parse painting tasks from a single text segment
 */
function parsePaintingTasksInText(text: string): string[] {
  const tasks: string[] = [];
  
  // Common Swedish painting task patterns (ordered by specificity to avoid overlaps)
  const taskPatterns = [
    // Grundmåla patterns (most specific first)
    { pattern: /grundmåla\s+(tak|taket)/gi, task: 'grundmåla tak' },
    { pattern: /grundmåla\s+(väggar?|vägg)/gi, task: 'grundmåla väggar' },
    { pattern: /grundmåla\s+(dörrar?|dörr)/gi, task: 'grundmåla dörrar' },
    { pattern: /grundmåla\s+(fönster)/gi, task: 'grundmåla fönster' },
    { pattern: /grundmåla\s+(golv)/gi, task: 'grundmåla golv' },
    { pattern: /\bgrundmåla\b(?!\s+(tak|väggar?|dörrar?|fönster|golv))/gi, task: 'grundmåla' }, // General grundmåla (negative lookahead)
    
    // Måla patterns (avoiding grundmåla matches)
    { pattern: /\bmåla\s+(väggar?|vägg|bäggar)\b/gi, task: 'måla väggar' }, // Include common mispronunciation
    { pattern: /\bmåla\s+(tak)\b/gi, task: 'måla tak' },
    { pattern: /\bmåla\s+(golv)\b/gi, task: 'måla golv' },
    { pattern: /\bmåla\s+(dörrar?|dörr)\b/gi, task: 'måla dörrar' },
    { pattern: /\bmåla\s+(fönster|fönsterramar?)\b/gi, task: 'måla fönster' },
    { pattern: /\bmåla\s+(lister?|golvlister?|taklister?)\b/gi, task: 'måla lister' },
    { pattern: /\bmåla\s+(radiatorer?)\b/gi, task: 'måla radiatorer' },
    
    // Other patterns
    { pattern: /målarbänka/gi, task: 'måla bänk' },
    { pattern: /spackla\s+(\w+)/gi, task: 'spackla' },
    { pattern: /tapetsera/gi, task: 'tapetsera' },
    { pattern: /struk/gi, task: 'struk' },
  ];
  
  for (const { pattern, task } of taskPatterns) {
    if (pattern.test(text)) {
      tasks.push(task);
    }
  }
  
  // Remove duplicates while preserving order
  const uniqueTasks = [...new Set(tasks)];
  
  // Extract layer information if mentioned
  const layerMatch = text.match(/(två|tre|fyra|fem|\d+)\s+(lager|skikt|gånger)/i);
  if (layerMatch && uniqueTasks.length > 0) {
    const layerText = layerMatch[1];
    const layers = layerText === 'två' ? 2 : 
                  layerText === 'tre' ? 3 : 
                  layerText === 'fyra' ? 4 : 
                  layerText === 'fem' ? 5 : 
                  parseInt(layerText);
    return uniqueTasks.map(task => `${task} (${layers} lager)`);
  }
  
  return uniqueTasks;
}

/**
 * Validate if a task is a legitimate painting task
 */
function isValidPaintingTask(task: string): boolean {
  const validTasks = [
    'måla väggar', 'måla tak', 'måla dörrar', 'måla fönster', 'måla golv', 'måla lister', 'måla radiatorer',
    'grundmåla väggar', 'grundmåla tak', 'grundmåla dörrar', 'grundmåla fönster', 'grundmåla golv',
    'spackla', 'tapetsera', 'struk', 'måla bänk'
  ];
  
  const taskLower = task.toLowerCase();
  
  // Check if it's a valid painting task
  const isValid = validTasks.some(validTask => taskLower.includes(validTask));
  
  // Also check for common non-painting words that should be filtered out
  const invalidWords = ['slå', 'hit', 'strike', 'knacka', 'knock', 'krossa', 'break', 'såga', 'saw'];
  const hasInvalidWord = invalidWords.some(word => taskLower.includes(word));
  
  return isValid && !hasInvalidWord;
}

