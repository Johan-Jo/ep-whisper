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
    'tjugo': 20, 'trettio': 30, 'fyrtio': 40, 'femtio': 50,
    'sextio': 60, 'sjuttio': 70, 'åttio': 80, 'nittio': 90,
  };
  
  // Special handling for compound numbers in Swedish
  // "fyra och fyrtio" = 4.40, "två och femtio" = 2.50, "tre och femtiusjus" = 3.57
  let normalized = text;
  
  // Handle "X och Y" where it means X.Y meters (Swedish centimeters as decimals)
  // Pattern 1: "fyra och fyrtio fem" or "två och femti sju" (compound tens + units)
  const compoundPattern = /(\d+|en|ett|två|tre|fyra|fem|sex|sju|åtta|nio)\s+och\s+(tjugo|trettio|fyrtio|femtio|sextio|sjuttio|åttio|nittio)\s*(en|ett|två|tre|fyra|fem|sex|sju|åtta|nio|\d)?/gi;
  
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
  
  // Fallback: first 3 numbers
  if (!result.width && numbers.length >= 3) {
    return {
      width: numbers[0],
      length: numbers[1],
      height: numbers[2],
      doors: numbers[3] || 1,
      windows: numbers[4] || 1,
    };
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
  
  // Common Swedish painting task patterns (ordered by specificity)
  const taskPatterns = [
    { pattern: /grundmåla(tak|taket)/gi, task: 'grundmåla tak' },
    { pattern: /grundmåla\s+(?!tak)/gi, task: 'grundmåla' }, // Exclude "tak" from general grundmåla
    { pattern: /målarbänka/gi, task: 'måla bänk' },
    { pattern: /måla\s+(väggar?|vägg|bäggar)/gi, task: 'måla väggar' }, // Include common mispronunciation
    { pattern: /måla\s+(tak)/gi, task: 'måla tak' },
    { pattern: /måla\s+(golv)/gi, task: 'måla golv' },
    { pattern: /måla\s+(dörrar?|dörr)/gi, task: 'måla dörrar' },
    { pattern: /måla\s+(fönster|fönsterramar?)/gi, task: 'måla fönster' },
    { pattern: /måla\s+(lister?|golvlister?|taklister?)/gi, task: 'måla lister' },
    { pattern: /måla\s+(radiatorer?)/gi, task: 'måla radiatorer' },
    { pattern: /spackla\s+(\w+)/gi, task: 'spackla' },
    { pattern: /tapetsera/gi, task: 'tapetsera' },
    { pattern: /struk/gi, task: 'struk' },
  ];
  
  for (const { pattern, task } of taskPatterns) {
    if (pattern.test(text)) {
      tasks.push(task);
    }
  }
  
  // Extract layer information if mentioned
  const layerMatch = text.match(/(\d+)\s+(lager|skikt|gånger)/i);
  if (layerMatch && tasks.length > 0) {
    const layers = parseInt(layerMatch[1]);
    return tasks.map(task => `${task} (${layers} lager)`);
  }
  
  return tasks;
}

