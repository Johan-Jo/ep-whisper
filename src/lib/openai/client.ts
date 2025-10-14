import OpenAI from 'openai';

// OpenAI client configuration for Swedish voice processing
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Default configuration for Swedish locale
  defaultHeaders: {
    'OpenAI-Organization': process.env.OPENAI_ORG_ID,
  },
});

// Whisper configuration for Swedish speech recognition
export const WHISPER_CONFIG = {
  model: 'whisper-1',
  language: 'sv', // Swedish language code
  temperature: 0.0, // Deterministic for consistent results
  response_format: 'json', // Structured response for easier parsing
} as const;

// TTS configuration for Swedish text-to-speech
export const TTS_CONFIG = {
  model: 'tts-1',
  voice: 'nova' as const, // Good Swedish pronunciation
  response_format: 'mp3',
  speed: 1.0, // Normal speed for clear understanding
} as const;

// Voice Activity Detection settings
export const VAD_CONFIG = {
  enabled: true,
  confidenceThreshold: 0.7, // Request repeat if confidence < 70%
  silenceThreshold: 1000, // 1 second of silence to stop recording
  minRecordingDuration: 500, // Minimum 500ms recording
} as const;

// Swedish confirmation phrases as per PRD §10
export const SWEDISH_CONFIRMATIONS = {
  taskAdded: 'Uppgift tillagd',
  taskUpdated: 'Uppgift uppdaterad',
  calculationComplete: 'Beräkning klar',
  errorOccurred: 'Ett fel uppstod',
  pleaseRepeat: 'Kan du upprepa det?',
  notRecognized: 'Jag förstod inte, kan du säga det igen?',
  readyToListen: 'Jag lyssnar',
  processing: 'Bearbetar...',
} as const;

// Error handling for OpenAI API calls
export class OpenAIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

// Validate API key is configured
export function validateOpenAIConfig(): boolean {
  if (!process.env.OPENAI_API_KEY) {
    throw new OpenAIError('OPENAI_API_KEY environment variable is required');
  }
  return true;
}
