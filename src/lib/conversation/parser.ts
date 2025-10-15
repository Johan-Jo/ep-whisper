/**
 * Parse user responses in conversational workflow
 */

import { ConversationStep } from './types';

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
 * Supports formats like:
 * - "fyra gånger fem gånger två och en halv" → {width: 4, length: 5, height: 2.5}
 * - "4 meter bred, 5 meter lång, 2.5 meter hög" → {width: 4, length: 5, height: 2.5}
 * - "bredd 4, längd 5, höjd 2,5" → {width: 4, length: 5, height: 2.5}
 */
export function parseMeasurements(transcription: string): {
  width?: number;
  length?: number;
  height?: number;
  doors?: number;
  windows?: number;
} {
  const text = transcription.toLowerCase();
  
  // Number word mapping
  const numberWords: Record<string, number> = {
    'en': 1, 'ett': 1,
    'två': 2, 'tre': 3, 'fyra': 4, 'fem': 5,
    'sex': 6, 'sju': 7, 'åtta': 8, 'nio': 9, 'tio': 10,
  };
  
  // Handle "X och en halv" or "X och halv" BEFORE converting individual words
  let normalized = text;
  normalized = normalized.replace(/\b(en|ett|två|tre|fyra|fem|sex|sju|åtta|nio|tio)\s+och\s+(en\s+)?halv(a)?\b/gi, (match, num) => {
    const base = numberWords[num.toLowerCase()] || parseFloat(num);
    return String(base + 0.5);
  });
  
  // Convert remaining number words to digits (do this repeatedly to catch all instances)
  let prevNormalized = '';
  while (prevNormalized !== normalized) {
    prevNormalized = normalized;
    for (const [word, num] of Object.entries(numberWords)) {
      normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'gi'), String(num));
    }
  }
  
  // Extract numbers (support both comma and period as decimal)
  const numbers = normalized.match(/\d+[.,]?\d*/g)?.map(n => parseFloat(n.replace(',', '.'))) || [];
  
  console.log('parseMeasurements debug:', { text, normalized, numbers });
  
  // Pattern 1: "X gånger Y gånger Z" or "X × Y × Z"
  if (text.includes('gånger') || text.includes('×') || text.includes('x')) {
    // Need at least 3 numbers, but sometimes same number appears twice (e.g., "tre gånger tre")
    if (numbers.length >= 2) {
      return {
        width: numbers[0],
        length: numbers[1],
        height: numbers[2] || numbers[1], // If only 2 numbers, use length for height
        doors: numbers[3] || 1,
        windows: numbers[4] || 1,
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
  return /^(klar|färdig|slut|det var allt|inga fler|stopp)$/i.test(text);
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
  return /^(ja|japp|visst|ok|okej|bra|absolut|självklart)$/i.test(text);
}

