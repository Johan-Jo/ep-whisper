// OpenAI client and configuration
export {
  openai,
  WHISPER_CONFIG,
  TTS_CONFIG,
  VAD_CONFIG,
  SWEDISH_CONFIRMATIONS,
  OpenAIError,
  validateOpenAIConfig,
} from './client';

// Whisper transcription services
export {
  transcribeAudio,
  validateAudioBuffer,
  type TranscriptionResult,
  type TranscriptionOptions,
} from './whisper';

// Text-to-speech services
export {
  generateTTS,
  generateConfirmation,
  generateTaskConfirmation,
  generateCalculationConfirmation,
  generateErrorConfirmation,
  preloadCommonConfirmations,
  getConfirmation,
  type TTSResult,
  type TTSOptions,
} from './tts';

// Main voice processing pipeline
export {
  processVoiceInput,
  processMultipleVoiceInputs,
  VoiceActivityDetector,
  initializeVoiceProcessing,
  extractPaintingKeywords,
  type VoiceProcessingResult,
  type VoiceProcessingOptions,
} from './voice';

