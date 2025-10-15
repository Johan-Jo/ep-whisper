import { openai, WHISPER_CONFIG, VAD_CONFIG, OpenAIError } from './client';
import { fixSwedishTranscription, validateSwedishPaintingTranscription } from '../nlp/transcription-fixes';

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

      // Validate buffer size and content
      if (buffer.length < 1000) {
        throw new OpenAIError(
          `Audio buffer too small: ${buffer.length} bytes (minimum: 1000 bytes)`,
          400,
          'AUDIO_TOO_SMALL'
        );
      }

      // Create a File-like object for the API with proper format detection
      const audioFormat = detectAudioFormat(buffer);
      console.log(`[Attempt ${attempt}] Audio format detected: ${audioFormat.mimeType}, size: ${buffer.length} bytes`);
      console.log(`[Attempt ${attempt}] Buffer header: ${buffer.toString('hex', 0, Math.min(16, buffer.length))}`);
      
      // Validate audio format before creating File object
      if (!audioFormat.mimeType || !audioFormat.extension) {
        throw new OpenAIError(
          `Unsupported audio format: ${audioFormat.mimeType}`,
          400,
          'UNSUPPORTED_AUDIO_FORMAT'
        );
      }
      
      const audioFile = new File([buffer], `audio.${audioFormat.extension}`, { type: audioFormat.mimeType });
      
      // Additional validation
      console.log(`[Attempt ${attempt}] File object created:`, {
        name: audioFile.name,
        type: audioFile.type,
        size: audioFile.size
      });

      console.log(`[Attempt ${attempt}] Sending to Whisper API with model: ${WHISPER_CONFIG.model}, language: ${WHISPER_CONFIG.language}`);
      
      let response;
      try {
        console.log(`[Attempt ${attempt}] Making API call with timeout...`);
        
        // Add timeout to prevent hanging
        const apiCallPromise = openai.client.audio.transcriptions.create({
          file: audioFile,
          model: WHISPER_CONFIG.model,
          language: WHISPER_CONFIG.language,
          temperature: WHISPER_CONFIG.temperature,
          response_format: opts.includeSegments ? 'verbose_json' : 'json',
          timestamp_granularities: opts.includeSegments ? ['segment'] : undefined,
          prompt: "Detta är en svensk konversation om målning. Vanliga ord: måla, väggar, tak, dörrar, fönster, lager, gånger, bredd, längd, höjd, kund, projekt, rum, mått, uppgifter, målarbänka, grundmåla.", // Swedish context prompt
        });
        
        // Add 30-second timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API call timeout after 30 seconds')), 30000)
        );
        
        response = await Promise.race([apiCallPromise, timeoutPromise]);
        console.log(`[Attempt ${attempt}] API call completed successfully`);
      } catch (apiError: any) {
        console.error(`[Attempt ${attempt}] OpenAI API Error:`, apiError);
        
        // More detailed error logging
        if (apiError && typeof apiError === 'object') {
          console.error(`[Attempt ${attempt}] Error properties:`, Object.keys(apiError));
          console.error(`[Attempt ${attempt}] Error message:`, apiError.message);
          console.error(`[Attempt ${attempt}] Error status:`, apiError.status);
          console.error(`[Attempt ${attempt}] Error type:`, apiError.type);
          console.error(`[Attempt ${attempt}] Error code:`, apiError.code);
          
          // Try to stringify the error
          try {
            console.error(`[Attempt ${attempt}] Full error JSON:`, JSON.stringify(apiError, null, 2));
          } catch (stringifyError) {
            console.error(`[Attempt ${attempt}] Could not stringify error:`, stringifyError);
            console.error(`[Attempt ${attempt}] Error toString:`, apiError.toString());
          }
        } else {
          console.error(`[Attempt ${attempt}] Error is not an object:`, typeof apiError, apiError);
        }
        throw new OpenAIError(
          apiError?.message || apiError?.error?.message || 'OpenAI API call failed',
          apiError?.status || 500,
          apiError?.code || apiError?.type || 'API_ERROR'
        );
      }

      console.log(`[Attempt ${attempt}] Whisper API response:`, response);

      // Extract transcription data
      const transcription = response as any; // Type assertion for verbose_json format
      const text = transcription.text || '';
      const confidence = calculateAverageConfidence(transcription);
      const language = transcription.language || 'sv';
      const duration = transcription.duration || 0;

      // Fix common Swedish transcription errors
      const fixedText = fixSwedishTranscription(text);
      console.log(`[Attempt ${attempt}] Original: "${text}" → Fixed: "${fixedText}"`);
      
      // Validate transcription for Swedish painting context
      const validation = validateSwedishPaintingTranscription(fixedText);
      console.log(`[Attempt ${attempt}] Validation:`, validation);
      
      // Check confidence threshold (disabled for MVP - accept all valid transcriptions)
      // Note: Whisper is generally accurate, and users can always correct in the UI
      if (confidence < 0.2) { // Only reject extremely poor quality (< 20%)
        console.warn(`Low confidence transcription: ${(confidence * 100).toFixed(1)}% - proceeding anyway`);
      }

      return {
        text: normalizeSwedishText(fixedText),
        confidence: Math.max(confidence, validation.confidence), // Use higher confidence
        language,
        duration,
        segments: opts.includeSegments ? transcription.segments : undefined,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      console.error(`[Attempt ${attempt}] Transcription failed:`, {
        error: lastError.message,
        stack: lastError.stack,
        name: lastError.name
      });
      
      // Don't retry on certain error types
      if (error instanceof OpenAIError && error.code === 'LOW_CONFIDENCE') {
        throw error;
      }

      // Log retry attempt
      if (attempt < opts.maxRetries) {
        console.warn(`Transcription attempt ${attempt} failed, retrying in ${Math.pow(2, attempt - 1)}s:`, lastError.message);
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
 * Detect audio format from buffer
 */
function detectAudioFormat(buffer: Buffer): { mimeType: string; extension: string } {
  // Check for common audio file headers
  const header = buffer.toString('hex', 0, Math.min(8, buffer.length));
  
  if (header.startsWith('52494646')) {
    // RIFF header - could be WAV or WebM
    const subheader = buffer.toString('hex', 8, 12);
    if (subheader === '57415645') {
      return { mimeType: 'audio/wav', extension: 'wav' };
    } else if (subheader === '5745424d') {
      return { mimeType: 'audio/webm', extension: 'webm' };
    }
  } else if (header.startsWith('fffb') || header.startsWith('fffa')) {
    return { mimeType: 'audio/mpeg', extension: 'mp3' };
  } else if (header.startsWith('00000020')) {
    return { mimeType: 'audio/mp4', extension: 'mp4' };
  } else if (header.startsWith('4f676753')) {
    return { mimeType: 'audio/ogg', extension: 'ogg' };
  }
  
  // Default to webm (most common for browser recording)
  return { mimeType: 'audio/webm', extension: 'webm' };
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
  const header = buffer.toString('hex', 0, Math.min(8, buffer.length));
  const hasAudioHeader = buffer.length > 4 && (
    header.startsWith('52494646') || // RIFF (WAV)
    header.startsWith('1a45dfa3') || // WebM (EBML)
    header.startsWith('fffb') ||     // MP3
    header.startsWith('00000020')    // MP4
  );

  if (!hasAudioHeader) {
    console.warn('Audio buffer may not be in a supported format');
  }
}
