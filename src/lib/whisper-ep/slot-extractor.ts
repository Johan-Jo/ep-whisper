/**
 * Slot Extraction with Regex → LLM Fallback
 * Following Whisper-EP cursor guide specifications
 */

export interface SlotExtractionResult {
  area?: { value: number; unit: "kvm" | "m2" };
  length?: { value: number; unit: "lpm" | "meter" };
  coats?: number;
  side?: "en_sida" | "båda_sidor";
  confidence: number;
}

// Regex patterns for slot extraction
const SLOT_PATTERNS = {
  // Area: (\d+(?:[.,]\d+)?)\s*(?:kvm|m2|m²)
  area: /(\d+(?:[.,]\d+)?)\s*(?:kvm|m2|m²)/gi,
  
  // Length: (\d+(?:[.,]\d+)?)\s*(?:lpm|löp(?:meter)?|meter)
  length: /(\d+(?:[.,]\d+)?)\s*(?:lpm|löp(?:meter)?|meter)/gi,
  
  // Coats: (\d+)\s*(?:stryk|strykningar|lager) + talord
  coats: /(\d+)\s*(?:stryk|strykningar|lager)/gi,
  
  // Side: en sida|ena sidan|båda sidor|två sidor
  side: /(?:en sida|ena sidan|båda sidor|två sidor)/gi,
} as const;

// Swedish number words
const NUMBER_WORDS: Record<string, number> = {
  'en': 1, 'ett': 1,
  'två': 2, 'tre': 3, 'fyra': 4, 'fem': 5,
  'sex': 6, 'sju': 7, 'åtta': 8, 'nio': 9, 'tio': 10,
};

/**
 * Extract slots using regex patterns first, then LLM fallback
 */
export function extractSlots(text: string): SlotExtractionResult {
  const normalizedText = text.toLowerCase().trim();
  let confidence = 1.0;
  
  const result: SlotExtractionResult = { confidence: 0 };
  
  // Extract area
  const areaMatch = SLOT_PATTERNS.area.exec(normalizedText);
  if (areaMatch) {
    const value = parseFloat(areaMatch[1].replace(',', '.'));
    const unit = areaMatch[2] === 'm²' ? 'kvm' : (areaMatch[2] || 'kvm');
    result.area = { value, unit: unit as "kvm" | "m2" };
    result.confidence += 0.3;
  }
  
  // Extract length
  const lengthMatch = SLOT_PATTERNS.length.exec(normalizedText);
  if (lengthMatch) {
    const value = parseFloat(lengthMatch[1].replace(',', '.'));
    const unit = lengthMatch[2]?.includes('löp') ? 'lpm' : 'meter';
    result.length = { value, unit: unit as "lpm" | "meter" };
    result.confidence += 0.3;
  }
  
  // Extract coats
  const coatsMatch = SLOT_PATTERNS.coats.exec(normalizedText);
  if (coatsMatch) {
    result.coats = parseInt(coatsMatch[1]);
    result.confidence += 0.2;
  } else {
    // Try number words
    const numberWordMatch = Object.keys(NUMBER_WORDS).find(word => 
      normalizedText.includes(word + ' lager') || 
      normalizedText.includes(word + ' stryk') ||
      normalizedText.includes(word + ' gånger')
    );
    if (numberWordMatch) {
      result.coats = NUMBER_WORDS[numberWordMatch];
      result.confidence += 0.15;
    }
  }
  
  // Extract side
  const sideMatch = SLOT_PATTERNS.side.exec(normalizedText);
  if (sideMatch) {
    const sideText = sideMatch[0];
    result.side = sideText.includes('båda') || sideText.includes('två') ? 'båda_sidor' : 'en_sida';
    result.confidence += 0.2;
  }
  
  return result;
}

/**
 * Fallback slot extraction using LLM analysis
 * This would be called when regex extraction confidence is too low
 */
export function extractSlotsWithLLM(text: string): Promise<SlotExtractionResult> {
  // This would integrate with OpenAI API for complex slot extraction
  // For now, return a basic result
  return Promise.resolve({
    confidence: 0.5,
    coats: 1 // Default
  });
}

/**
 * Normalize extracted values
 */
export function normalizeSlotValues(result: SlotExtractionResult): SlotExtractionResult {
  const normalized = { ...result };
  
  // Normalize area unit
  if (normalized.area?.unit === 'm²') {
    normalized.area.unit = 'kvm';
  }
  
  // Normalize length unit
  if (normalized.length?.unit === 'löp' || normalized.length?.unit === 'löpmeter') {
    normalized.length.unit = 'lpm';
  }
  
  // Ensure reasonable coat count
  if (normalized.coats && (normalized.coats < 1 || normalized.coats > 5)) {
    normalized.coats = Math.max(1, Math.min(5, normalized.coats));
    normalized.confidence *= 0.8;
  }
  
  return normalized;
}
