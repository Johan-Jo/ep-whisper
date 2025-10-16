import OpenAI from 'openai';

// Get API key from environment variable (client-side and server-side)
const getApiKey = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use NEXT_PUBLIC_ prefix
    return process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  }
  // Server-side: try both NEXT_PUBLIC_ (for server components) and regular
  return process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
};

// OpenAI client configuration for Swedish voice processing
// Note: Lazy initialization to avoid errors on page load
let openaiClient: OpenAI | null = null;

export const getOpenAIClient = (): OpenAI => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error(
      'OpenAI API key is missing. Please set NEXT_PUBLIC_OPENAI_API_KEY in your .env.local file.'
    );
  }
  
  if (!openaiClient) {
    const config: any = {
      apiKey,
      dangerouslyAllowBrowser: true, // Allow usage in browser for client-side calls
    };
    
    // Only add organization header if it's provided
    const orgId = process.env.NEXT_PUBLIC_OPENAI_ORG_ID || process.env.OPENAI_ORG_ID;
    console.log('🔍 [OpenAI] Organization ID check:', { 
      NEXT_PUBLIC_OPENAI_ORG_ID: process.env.NEXT_PUBLIC_OPENAI_ORG_ID,
      OPENAI_ORG_ID: process.env.OPENAI_ORG_ID,
      orgId: orgId,
      NODE_ENV: process.env.NODE_ENV,
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('OPENAI') || key.includes('ORG'))
    });
    
    if (orgId) {
      console.log('⚠️ [OpenAI] Adding organization header:', orgId);
      config.defaultHeaders = {
        'OpenAI-Organization': orgId,
      };
    } else {
      console.log('✅ [OpenAI] No organization header - using personal API key');
    }
    
    openaiClient = new OpenAI(config);
  }
  
  return openaiClient;
};

// Legacy export for backward compatibility (will throw error if API key not set)
export const openai = {
  get client() {
    return getOpenAIClient();
  }
};

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
  confidenceThreshold: 0.4, // Request repeat if confidence < 40% (lowered for realistic use)
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
