/**
 * Swedish Transcription Fixes
 * 
 * Common Whisper transcription errors for Swedish painting terms and their corrections
 */

// Common transcription errors and their corrections
const TRANSCRIPTION_FIXES: Record<string, string> = {
  // Common mishearings of "måla väggar"
  'målarbänka': 'måla väggar',
  'måla bänka': 'måla väggar', 
  'måla bänkar': 'måla väggar',
  'målarbänkar': 'måla väggar',
  'måla benka': 'måla väggar',
  'måla benkar': 'måla väggar',
  
  // Common mishearings of "grundmåla tak"
  'grundmålatak': 'grundmåla tak',
  'grundmålartak': 'grundmåla tak',
  'grundmåla tack': 'grundmåla tak',
  
  // Common mishearings of "måla tak"
  'målatak': 'måla tak',
  'målartak': 'måla tak',
  'måla tack': 'måla tak',
  
  // Common mishearings of "måla dörrar"
  'måladörrar': 'måla dörrar',
  'målardörrar': 'måla dörrar',
  'måla dörra': 'måla dörrar',
  
  // Common mishearings of "måla fönster"
  'måla fönster': 'måla fönster',
  'måla fönstret': 'måla fönster',
  'måla fönstren': 'måla fönster',
  
  // Common mishearings of "måla list"
  'måla list': 'måla list',
  'måla listen': 'måla list',
  'måla lister': 'måla list',
  
  // Common number mishearings
  'två lager': 'två lager',
  'tre lager': 'tre lager',
  'fyra lager': 'fyra lager',
  'en lager': 'ett lager',
  'ett lager': 'ett lager',
  
  // Common measurement mishearings
  'fyra och fyrtio': 'fyra och fyrtio',
  'två och femtio': 'två och femtio',
  'tre och femtio': 'tre och femtio',
  'fyra och femtio': 'fyra och femtio',
  'fem och femtio': 'fem och femtio',
  
  // Common completion phrases
  'jag är klar': 'jag är klar',
  'klar': 'klar',
  'klart': 'klar',
  'färdig': 'klar',
  'jag är färdig': 'klar',
  
  // Common confirmation phrases
  'ja': 'ja',
  'ja jag vill': 'ja jag vill',
  'ja jag vill se': 'ja jag vill se',
  'ja jag vill granska': 'ja jag vill granska',
};

/**
 * Fix common Swedish transcription errors
 */
export function fixSwedishTranscription(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  let fixedText = text.toLowerCase().trim();
  
  // Apply fixes
  for (const [incorrect, correct] of Object.entries(TRANSCRIPTION_FIXES)) {
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${incorrect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    fixedText = fixedText.replace(regex, correct);
  }
  
  return fixedText;
}

/**
 * Check if transcription contains common Swedish painting terms
 */
export function containsPaintingTerms(text: string): boolean {
  const paintingTerms = [
    'måla', 'målning', 'målning', 'grundmåla', 'grundmåling', 'täckmåla', 'täckmåling',
    'vägg', 'väggar', 'tak', 'dörr', 'dörrar', 'fönster', 'list', 'lister',
    'lager', 'gånger', 'bredd', 'längd', 'höjd'
  ];
  
  const lowerText = text.toLowerCase();
  return paintingTerms.some(term => lowerText.includes(term));
}

/**
 * Validate if transcription makes sense for Swedish painting context
 */
export function validateSwedishPaintingTranscription(text: string): {
  isValid: boolean;
  confidence: number;
  suggestions: string[];
} {
  const fixedText = fixSwedishTranscription(text);
  const containsTerms = containsPaintingTerms(fixedText);
  
  let confidence = 0.5; // Base confidence
  const suggestions: string[] = [];
  
  // Increase confidence if it contains painting terms
  if (containsTerms) {
    confidence += 0.3;
  }
  
  // Check for common patterns
  if (fixedText.match(/\b(måla|grundmåla|täckmåla)\s+\w+/)) {
    confidence += 0.2;
  }
  
  // Check for measurements
  if (fixedText.match(/\d+\s*(gånger|×|x)\s*\d+/)) {
    confidence += 0.1;
  }
  
  // Check for layer information
  if (fixedText.match(/\b(två|tre|fyra|fem|sex|sju|åtta|nio|tio)\s+lager\b/)) {
    confidence += 0.1;
  }
  
  // Add suggestions if confidence is low
  if (confidence < 0.7) {
    if (!containsTerms) {
      suggestions.push('Försök att säga "måla väggar" eller "grundmåla tak"');
    }
    if (!fixedText.match(/\b(måla|grundmåla|täckmåla)/)) {
      suggestions.push('Inkludera ett målningsord som "måla", "grundmåla" eller "täckmåla"');
    }
  }
  
  return {
    isValid: confidence >= 0.5,
    confidence: Math.min(confidence, 1.0),
    suggestions
  };
}
