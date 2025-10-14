import { openai, WHISPER_CONFIG, VAD_CONFIG, OpenAIError } from './client';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
    confidence: number;
  }>;
}

export interface TranscriptionOptions {
  enableVAD?: boolean;
  confidenceThreshold?: number;
  includeSegments?: boolean;
  maxRetries?: number;
}

const DEFAULT_OPTIONS: Required<TranscriptionOptions> = {
  enableVAD: true,
  confidenceThreshold: VAD_CONFIG.confidenceThreshold,
  includeSegments: false,
  maxRetries: 3,
};

/**
 * Transcribe audio using OpenAI Whisper with Swedish language support
 */
export async function transcribeAudio(
  audioBuffer: Buffer | ArrayBuffer,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      // Convert ArrayBuffer to Buffer if needed
      const buffer = audioBuffer instanceof ArrayBuffer 
        ? Buffer.from(audioBuffer) 
        : audioBuffer;

      // Create a File-like object for the API
      const audioFile = new File([buffer], 'audio.wav', { type: 'audio/wav' });

      const response = await openai.audio.transcriptions.create({
        file: audioFile,
        model: WHISPER_CONFIG.model,
        language: WHISPER_CONFIG.language,
        temperature: WHISPER_CONFIG.temperature,
        response_format: opts.includeSegments ? 'verbose_json' : 'json',
        timestamp_granularities: opts.includeSegments ? ['segment'] : undefined,
      });

      // Extract transcription data
      const transcription = response as any; // Type assertion for verbose_json format
      const text = transcription.text || '';
      const confidence = calculateAverageConfidence(transcription);
      const language = transcription.language || 'sv';
      const duration = transcription.duration || 0;

      // Check confidence threshold
      if (confidence < opts.confidenceThreshold) {
        throw new OpenAIError(
          `Low confidence transcription: ${(confidence * 100).toFixed(1)}% (threshold: ${(opts.confidenceThreshold * 100).toFixed(1)}%)`,
          400,
          'LOW_CONFIDENCE'
        );
      }

      return {
        text: normalizeSwedishText(text),
        confidence,
        language,
        duration,
        segments: opts.includeSegments ? transcription.segments : undefined,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't retry on certain error types
      if (error instanceof OpenAIError && error.code === 'LOW_CONFIDENCE') {
        throw error;
      }

      // Log retry attempt
      if (attempt < opts.maxRetries) {
        console.warn(`Transcription attempt ${attempt} failed:`, lastError.message);
        // Exponential backoff: wait 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }

  throw new OpenAIError(
    `Transcription failed after ${opts.maxRetries} attempts: ${lastError?.message}`,
    500,
    'MAX_RETRIES_EXCEEDED'
  );
}

/**
 * Calculate average confidence from transcription segments or response
 */
function calculateAverageConfidence(transcription: any): number {
  if (transcription.segments && Array.isArray(transcription.segments)) {
    const confidences = transcription.segments
      .map((segment: any) => segment.avg_logprob || 0)
      .filter((conf: number) => !isNaN(conf));
    
    if (confidences.length > 0) {
      // Convert log probability to confidence score (0-1)
      const avgLogProb = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
      return Math.max(0, Math.min(1, Math.exp(avgLogProb)));
    }
  }

  // Fallback confidence estimation based on text quality
  const text = transcription.text || '';
  if (text.length === 0) return 0;
  
  // Simple heuristic: longer, more structured text = higher confidence
  const wordCount = text.split(/\s+/).length;
  const hasSwedishWords = /[åäöÅÄÖ]/.test(text);
  const hasNumbers = /\d/.test(text);
  
  let confidence = 0.5; // Base confidence
  if (wordCount > 2) confidence += 0.1;
  if (hasSwedishWords) confidence += 0.2;
  if (hasNumbers) confidence += 0.1;
  if (text.includes('måla') || text.includes('spackla') || text.includes('vägg')) confidence += 0.2;
  
  return Math.min(1, confidence);
}

/**
 * Normalize Swedish text for consistent processing
 */
function normalizeSwedishText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    // Normalize Swedish characters
    .replace(/å/g, 'å')
    .replace(/ä/g, 'ä')
    .replace(/ö/g, 'ö')
    .replace(/Å/g, 'å')
    .replace(/Ä/g, 'ä')
    .replace(/Ö/g, 'ö')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Ensure proper decimal comma formatting
    .replace(/(\d+)\.(\d+)/g, '$1,$2');
}

/**
 * Validate audio buffer format and size
 */
export function validateAudioBuffer(audioBuffer: Buffer | ArrayBuffer): void {
  if (!audioBuffer || audioBuffer.byteLength === 0) {
    throw new OpenAIError('Audio buffer is empty or invalid', 400, 'INVALID_AUDIO');
  }

  // Whisper has a 25MB limit
  const maxSize = 25 * 1024 * 1024; // 25MB
  if (audioBuffer.byteLength > maxSize) {
    throw new OpenAIError(
      `Audio file too large: ${(audioBuffer.byteLength / 1024 / 1024).toFixed(1)}MB (max: 25MB)`,
      400,
      'AUDIO_TOO_LARGE'
    );
  }

  // Basic format validation (should be WAV, MP3, MP4, etc.)
  const buffer = audioBuffer instanceof ArrayBuffer 
    ? Buffer.from(audioBuffer) 
    : audioBuffer;

  // Check for common audio file headers
  const hasAudioHeader = buffer.length > 4 && (
    buffer.toString('hex', 0, 4) === '52494646' || // RIFF (WAV)
    buffer.toString('hex', 0, 2) === 'fffb' ||     // MP3
    buffer.toString('hex', 0, 8) === '00000020'    // MP4
  );

  if (!hasAudioHeader) {
    console.warn('Audio buffer may not be in a supported format');
  }
}
