import { openai, TTS_CONFIG, SWEDISH_CONFIRMATIONS, OpenAIError } from './client';
import { perfMonitor } from '../monitoring/performance';

export interface TTSResult {
  audioBuffer: ArrayBuffer;
  duration: number;
  text: string;
  voice: string;
}

export interface TTSOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
  format?: 'mp3' | 'opus' | 'aac' | 'flac';
  response_format?: 'url' | 'json';
}

const DEFAULT_OPTIONS: Required<TTSOptions> = {
  voice: TTS_CONFIG.voice,
  speed: TTS_CONFIG.speed,
  format: 'mp3',
  response_format: 'json',
};

/**
 * Generate Swedish text-to-speech audio for confirmations
 */
export async function generateTTS(
  text: string,
  options: TTSOptions = {}
): Promise<TTSResult> {
  perfMonitor.start('tts.generate', { textLength: text.length });
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Validate input text
    const normalizedText = normalizeSwedishText(text);
    if (!normalizedText.trim()) {
      throw new OpenAIError('Text cannot be empty', 400, 'EMPTY_TEXT');
    }

    perfMonitor.start('tts.api_call');
    const response = await openai.audio.speech.create({
      model: TTS_CONFIG.model,
      voice: opts.voice,
      input: normalizedText,
      speed: opts.speed,
      response_format: opts.format,
    });

    // Convert response to ArrayBuffer
    const audioBuffer = await response.arrayBuffer();
    perfMonitor.end('tts.api_call', { success: true, bufferSize: audioBuffer.byteLength });
    
    // Estimate duration (rough calculation: ~150 words per minute)
    const wordCount = normalizedText.split(/\s+/).length;
    const estimatedDuration = (wordCount / 150) * 60 * 1000; // milliseconds

    perfMonitor.end('tts.generate', { success: true, wordCount });

    return {
      audioBuffer,
      duration: estimatedDuration,
      text: normalizedText,
      voice: opts.voice,
    };
  } catch (error) {
    if (error instanceof OpenAIError) {
      throw error;
    }
    throw new OpenAIError(
      `TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      'TTS_ERROR'
    );
  }
}

/**
 * Generate confirmation audio for common Swedish phrases
 */
export async function generateConfirmation(
  confirmationType: keyof typeof SWEDISH_CONFIRMATIONS,
  options: TTSOptions = {}
): Promise<TTSResult> {
  const text = SWEDISH_CONFIRMATIONS[confirmationType];
  return generateTTS(text, options);
}

/**
 * Generate dynamic confirmation with task details
 */
export async function generateTaskConfirmation(
  taskName: string,
  quantity: number,
  unit: string,
  options: TTSOptions = {}
): Promise<TTSResult> {
  const text = `${taskName}, ${quantity} ${unit}. Uppgift tillagd.`;
  return generateTTS(text, options);
}

/**
 * Generate calculation summary confirmation
 */
export async function generateCalculationConfirmation(
  totalCost: number,
  roomArea: number,
  options: TTSOptions = {}
): Promise<TTSResult> {
  const formattedCost = formatSwedishNumber(totalCost);
  const formattedArea = formatSwedishNumber(roomArea, 1);
  const text = `Beräkning klar. Total kostnad ${formattedCost} kronor för ${formattedArea} kvadratmeter.`;
  return generateTTS(text, options);
}

/**
 * Generate error confirmation
 */
export async function generateErrorConfirmation(
  errorType: 'not_understood' | 'invalid_task' | 'calculation_error',
  options: TTSOptions = {}
): Promise<TTSResult> {
  const errorMessages = {
    not_understood: 'Jag förstod inte. Kan du säga det igen?',
    invalid_task: 'Uppgiften hittades inte i katalogen. Försök igen.',
    calculation_error: 'Ett fel uppstod vid beräkningen. Kontrollera rumsmåtten.',
  };

  return generateTTS(errorMessages[errorType], options);
}

/**
 * Normalize Swedish text for TTS
 */
function normalizeSwedishText(text: string): string {
  return text
    .trim()
    // Ensure proper Swedish pronunciation
    .replace(/\b(\d+),(\d+)\b/g, '$1 komma $2') // "5,2" -> "5 komma 2"
    .replace(/\bm2\b/g, 'kvadratmeter') // "m2" -> "kvadratmeter"
    .replace(/\blpm\b/g, 'löpande meter') // "lpm" -> "löpande meter"
    .replace(/\bst\b/g, 'styck') // "st" -> "styck"
    .replace(/kronor/g, 'kronor')
    .replace(/kr\b/g, 'kronor')
    // Ensure proper Swedish decimal formatting
    .replace(/(\d+)\.(\d+)/g, '$1,$2')
    // Add pauses for better speech
    .replace(/\./g, '. ')
    .replace(/,/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Format numbers in Swedish locale
 */
function formatSwedishNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('sv-SE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Pre-generate common confirmations for faster response
 */
export async function preloadCommonConfirmations(): Promise<Map<string, ArrayBuffer>> {
  const confirmations = new Map<string, ArrayBuffer>();
  
  const commonTypes: Array<keyof typeof SWEDISH_CONFIRMATIONS> = [
    'taskAdded',
    'calculationComplete',
    'errorOccurred',
    'pleaseRepeat',
    'notRecognized',
    'readyToListen',
  ];

  try {
    for (const type of commonTypes) {
      const result = await generateConfirmation(type);
      confirmations.set(type, result.audioBuffer);
    }
  } catch (error) {
    console.warn('Failed to preload some confirmations:', error);
  }

  return confirmations;
}

/**
 * Get cached confirmation or generate new one
 */
export async function getConfirmation(
  confirmationType: keyof typeof SWEDISH_CONFIRMATIONS,
  cache: Map<string, ArrayBuffer> = new Map(),
  options: TTSOptions = {}
): Promise<ArrayBuffer> {
  // Check cache first
  if (cache.has(confirmationType)) {
    return cache.get(confirmationType)!;
  }

  // Generate new confirmation
  const result = await generateConfirmation(confirmationType, options);
  cache.set(confirmationType, result.audioBuffer);
  return result.audioBuffer;
}

