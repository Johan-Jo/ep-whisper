import { transcribeAudio, TranscriptionResult, validateAudioBuffer } from './whisper';
import { generateTTS, generateConfirmation, TTSResult, preloadCommonConfirmations } from './tts';
import { SWEDISH_CONFIRMATIONS, VAD_CONFIG, OpenAIError } from './client';

export interface VoiceProcessingResult {
  transcription: TranscriptionResult;
  confirmation?: TTSResult;
  processingTime: number;
  success: boolean;
}

export interface VoiceProcessingOptions {
  enableConfirmation?: boolean;
  confirmationType?: keyof typeof SWEDISH_CONFIRMATIONS;
  customConfirmationText?: string;
  confidenceThreshold?: number;
  includeSegments?: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<VoiceProcessingOptions, 'customConfirmationText'>> = {
  enableConfirmation: true,
  confirmationType: 'taskAdded',
  confidenceThreshold: VAD_CONFIG.confidenceThreshold,
  includeSegments: false,
};

/**
 * Complete voice processing pipeline: Audio -> Text -> Confirmation Audio
 */
export async function processVoiceInput(
  audioBuffer: Buffer | ArrayBuffer,
  options: VoiceProcessingOptions = {}
): Promise<VoiceProcessingResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Validate audio input
    validateAudioBuffer(audioBuffer);

    // Step 1: Transcribe audio to Swedish text
    const transcription = await transcribeAudio(audioBuffer, {
      confidenceThreshold: opts.confidenceThreshold,
      includeSegments: opts.includeSegments,
    });

    // Check if transcription was successful and confident enough
    if (!transcription.text || transcription.confidence < opts.confidenceThreshold) {
      throw new OpenAIError(
        `Low confidence transcription: ${(transcription.confidence * 100).toFixed(1)}%`,
        400,
        'LOW_CONFIDENCE'
      );
    }

    // Step 2: Generate confirmation audio (optional)
    let confirmation: TTSResult | undefined;
    if (opts.enableConfirmation) {
      try {
        if (opts.customConfirmationText) {
          confirmation = await generateTTS(opts.customConfirmationText);
        } else {
          confirmation = await generateConfirmation(opts.confirmationType);
        }
      } catch (error) {
        console.warn('Failed to generate confirmation audio:', error);
        // Don't fail the entire process if confirmation fails
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      transcription,
      confirmation,
      processingTime,
      success: true,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Generate error confirmation
    let errorConfirmation: TTSResult | undefined;
    if (opts.enableConfirmation) {
      try {
        if (error instanceof OpenAIError && error.code === 'LOW_CONFIDENCE') {
          errorConfirmation = await generateConfirmation('pleaseRepeat');
        } else {
          errorConfirmation = await generateConfirmation('errorOccurred');
        }
      } catch (ttsError) {
        console.warn('Failed to generate error confirmation:', ttsError);
      }
    }

    return {
      transcription: {
        text: '',
        confidence: 0,
        language: 'sv',
        duration: 0,
      },
      confirmation: errorConfirmation,
      processingTime,
      success: false,
    };
  }
}

/**
 * Process multiple voice inputs in sequence
 */
export async function processMultipleVoiceInputs(
  audioBuffers: (Buffer | ArrayBuffer)[],
  options: VoiceProcessingOptions = {}
): Promise<VoiceProcessingResult[]> {
  const results: VoiceProcessingResult[] = [];
  
  for (const audioBuffer of audioBuffers) {
    const result = await processVoiceInput(audioBuffer, options);
    results.push(result);
    
    // Add small delay between processing to avoid rate limiting
    if (results.length < audioBuffers.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Voice Activity Detection helper
 */
export class VoiceActivityDetector {
  private isRecording = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;

  constructor(
    private silenceThreshold: number = VAD_CONFIG.silenceThreshold,
    private minDuration: number = VAD_CONFIG.minRecordingDuration
  ) {}

  /**
   * Initialize audio context for VAD
   */
  async initialize(): Promise<void> {
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (error) {
      throw new OpenAIError('Failed to initialize audio context', 500, 'AUDIO_INIT_ERROR');
    }
  }

  /**
   * Start voice activity detection
   */
  startDetection(onVoiceStart: () => void, onVoiceEnd: () => void): void {
    if (!this.analyser || !this.dataArray) {
      throw new OpenAIError('VAD not initialized', 500, 'VAD_NOT_INITIALIZED');
    }

    const detectVoice = () => {
      this.analyser!.getByteFrequencyData(this.dataArray!);
      
      // Calculate average volume
      const average = this.dataArray!.reduce((sum, value) => sum + value, 0) / this.dataArray!.length;
      const volume = average / 255; // Normalize to 0-1

      // Voice activity threshold (adjust as needed)
      const voiceThreshold = 0.1;

      if (volume > voiceThreshold && !this.isRecording) {
        this.isRecording = true;
        onVoiceStart();
        
        // Clear silence timer
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
      } else if (volume <= voiceThreshold && this.isRecording) {
        // Start silence timer
        if (!this.silenceTimer) {
          this.silenceTimer = setTimeout(() => {
            this.isRecording = false;
            onVoiceEnd();
            this.silenceTimer = null;
          }, this.silenceThreshold);
        }
      }

      requestAnimationFrame(detectVoice);
    };

    detectVoice();
  }

  /**
   * Stop voice activity detection
   */
  stopDetection(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.isRecording = false;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopDetection();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }
}

/**
 * Initialize voice processing with common confirmations preloaded
 */
export async function initializeVoiceProcessing(): Promise<Map<string, ArrayBuffer>> {
  try {
    const confirmations = await preloadCommonConfirmations();
    console.log(`Preloaded ${confirmations.size} Swedish confirmations`);
    return confirmations;
  } catch (error) {
    console.warn('Failed to preload confirmations:', error);
    return new Map();
  }
}

/**
 * Extract Swedish painting-related keywords from transcription
 */
export function extractPaintingKeywords(text: string): {
  tasks: string[];
  quantities: string[];
  surfaces: string[];
  modifiers: string[];
} {
  const lowerText = text.toLowerCase();
  
  const taskKeywords = [
    'måla', 'spackla', 'grundmåla', 'täckmåla', 'bredspackla',
    'målnig', 'målning', 'spackling', 'grundmålnig', 'täckmålnig'
  ];
  
  const quantityKeywords = [
    'en', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio',
    'halv', 'hel', 'dubbel', 'trippel', 'kvart', 'tredjedel'
  ];
  
  const surfaceKeywords = [
    'vägg', 'väggar', 'tak', 'golv', 'dörr', 'dörrar', 'fönster', 'fönstren',
    'list', 'lister', 'taklist', 'golvlist', 'fönsterlist'
  ];
  
  const modifierKeywords = [
    'gång', 'gånger', 'lager', 'sida', 'sidor', 'hel', 'halv',
    'grund', 'täck', 'bred', 'smal', 'tjock', 'tunn'
  ];

  const tasks = taskKeywords.filter(keyword => lowerText.includes(keyword));
  const quantities = quantityKeywords.filter(keyword => lowerText.includes(keyword));
  const surfaces = surfaceKeywords.filter(keyword => lowerText.includes(keyword));
  const modifiers = modifierKeywords.filter(keyword => lowerText.includes(keyword));

  return { tasks, quantities, surfaces, modifiers };
}
