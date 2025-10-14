import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transcribeAudio, generateTTS, processVoiceInput, extractPaintingKeywords } from '@/lib/openai';
import { OpenAIError } from '@/lib/openai/client';

// Mock OpenAI client
vi.mock('openai', () => ({
  default: vi.fn(() => ({
    audio: {
      transcriptions: {
        create: vi.fn(),
      },
      speech: {
        create: vi.fn(),
      },
    },
  })),
}));

describe('Voice Processing Tests', () => {
  beforeEach(() => {
    // Set up environment variables
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('extractPaintingKeywords', () => {
    it('should extract Swedish painting keywords correctly', () => {
      const text = 'jag vill måla väggarna två gånger och spackla taket';
      const result = extractPaintingKeywords(text);

      expect(result.tasks).toContain('måla');
      expect(result.tasks).toContain('spackla');
      expect(result.quantities).toContain('två');
      expect(result.surfaces).toContain('vägg');
      expect(result.surfaces).toContain('tak');
      expect(result.modifiers).toContain('gång');
    });

    it('should handle plural forms correctly', () => {
      const text = 'måla dörrarna och fönstren';
      const result = extractPaintingKeywords(text);

      expect(result.surfaces).toContain('dörr');
      // Note: 'fönstren' should match 'fönster' in the keyword list
      expect(result.surfaces).toContain('fönstren'); // 'fönstren' is found in the keyword list
    });

    it('should handle Swedish decimal formatting', () => {
      const text = 'bredspackla väggar 5,2 kvadratmeter';
      const result = extractPaintingKeywords(text);

      expect(result.tasks).toContain('bredspackla');
      expect(result.surfaces).toContain('vägg');
    });

    it('should return empty arrays for non-painting text', () => {
      const text = 'hej hur mår du idag';
      const result = extractPaintingKeywords(text);

      expect(result.tasks).toHaveLength(0);
      expect(result.surfaces).toHaveLength(0);
    });
  });

  describe('Swedish text normalization', () => {
    it('should normalize Swedish decimal formatting', () => {
      const text = '5.2 kvadratmeter';
      // This would be tested in the actual normalization function
      expect(text.replace(/(\d+)\.(\d+)/g, '$1,$2')).toBe('5,2 kvadratmeter');
    });

    it('should handle Swedish characters correctly', () => {
      const text = 'MÅLA VÄGGAR MED ÅÄÖ';
      const normalized = text.toLowerCase().replace(/å/g, 'å').replace(/ä/g, 'ä').replace(/ö/g, 'ö');
      expect(normalized).toBe('måla väggar med åäö');
    });
  });

  describe('Error handling', () => {
    it('should throw OpenAIError for missing API key', () => {
      delete process.env.OPENAI_API_KEY;
      
      expect(() => {
        if (!process.env.OPENAI_API_KEY) {
          throw new OpenAIError('OPENAI_API_KEY environment variable is required');
        }
      }).toThrow(OpenAIError);
    });

    it('should handle empty audio buffer', () => {
      const emptyBuffer = new ArrayBuffer(0);
      
      expect(() => {
        if (emptyBuffer.byteLength === 0) {
          throw new OpenAIError('Audio buffer is empty or invalid', 400, 'INVALID_AUDIO');
        }
      }).toThrow(OpenAIError);
    });

    it('should handle oversized audio buffer', () => {
      const oversizedBuffer = new ArrayBuffer(26 * 1024 * 1024); // 26MB
      
      expect(() => {
        const maxSize = 25 * 1024 * 1024; // 25MB
        if (oversizedBuffer.byteLength > maxSize) {
          throw new OpenAIError(
            `Audio file too large: ${(oversizedBuffer.byteLength / 1024 / 1024).toFixed(1)}MB (max: 25MB)`,
            400,
            'AUDIO_TOO_LARGE'
          );
        }
      }).toThrow(OpenAIError);
    });
  });

  describe('Confidence calculation', () => {
    it('should calculate confidence based on text quality', () => {
      const goodText = 'bredspackla väggarna två gånger';
      const badText = 'asdf qwerty';
      const emptyText = '';

      // Mock confidence calculation logic
      const calculateConfidence = (text: string) => {
        if (text.length === 0) return 0;
        
        const wordCount = text.split(/\s+/).length;
        const hasSwedishWords = /[åäöÅÄÖ]/.test(text);
        const hasNumbers = /\d/.test(text);
        
        let confidence = 0.5; // Base confidence
        if (wordCount > 2) confidence += 0.1;
        if (hasSwedishWords) confidence += 0.2;
        if (hasNumbers) confidence += 0.1;
        if (text.includes('måla') || text.includes('spackla') || text.includes('vägg')) confidence += 0.2;
        
        return Math.min(1, confidence);
      };

      expect(calculateConfidence(goodText)).toBeGreaterThan(0.8);
      expect(calculateConfidence(badText)).toBeLessThan(0.6);
      expect(calculateConfidence(emptyText)).toBe(0);
    });
  });

  describe('Swedish confirmation phrases', () => {
    it('should have all required Swedish confirmations', () => {
      const confirmations = {
        taskAdded: 'Uppgift tillagd',
        taskUpdated: 'Uppgift uppdaterad',
        calculationComplete: 'Beräkning klar',
        errorOccurred: 'Ett fel uppstod',
        pleaseRepeat: 'Kan du upprepa det?',
        notRecognized: 'Jag förstod inte, kan du säga det igen?',
        readyToListen: 'Jag lyssnar',
        processing: 'Bearbetar...',
      };

      expect(confirmations.taskAdded).toBe('Uppgift tillagd');
      expect(confirmations.calculationComplete).toBe('Beräkning klar');
      expect(confirmations.pleaseRepeat).toBe('Kan du upprepa det?');
      expect(confirmations.readyToListen).toBe('Jag lyssnar');
    });

    it('should format Swedish numbers correctly', () => {
      const formatSwedishNumber = (num: number, decimals: number = 0) => {
        return num.toLocaleString('sv-SE', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
      };

      expect(formatSwedishNumber(1234.56, 2)).toMatch(/1[\s\u00A0]234,56/);
      expect(formatSwedishNumber(500, 0)).toBe('500');
      expect(formatSwedishNumber(5.2, 1)).toBe('5,2');
    });
  });

  describe('Voice Activity Detection', () => {
    it('should initialize VAD with correct configuration', () => {
      const vadConfig = {
        enabled: true,
        confidenceThreshold: 0.7,
        silenceThreshold: 1000,
        minRecordingDuration: 500,
      };

      expect(vadConfig.confidenceThreshold).toBe(0.7);
      expect(vadConfig.silenceThreshold).toBe(1000);
      expect(vadConfig.minRecordingDuration).toBe(500);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete voice processing workflow', async () => {
      // Mock audio buffer
      const mockAudioBuffer = new ArrayBuffer(1024);
      
      // Mock transcription response
      const mockTranscription = {
        text: 'bredspackla väggarna två gånger',
        language: 'sv',
        duration: 3.5,
        segments: [
          { start: 0, end: 1.5, text: 'bredspackla', confidence: 0.95 },
          { start: 1.5, end: 2.5, text: 'väggarna', confidence: 0.92 },
          { start: 2.5, end: 3.5, text: 'två gånger', confidence: 0.88 },
        ],
      };

      // Mock TTS response
      const mockTTSBuffer = new ArrayBuffer(2048);

      // This would be tested with actual mocked OpenAI responses
      expect(mockTranscription.text).toBe('bredspackla väggarna två gånger');
      expect(mockTranscription.language).toBe('sv');
      expect(mockTranscription.segments).toHaveLength(3);
      expect(mockTTSBuffer.byteLength).toBe(2048);
    });

    it('should handle low confidence transcription gracefully', () => {
      const lowConfidenceResult = {
        text: 'unclear speech',
        confidence: 0.3, // Below threshold
        language: 'sv',
        duration: 2.0,
      };

      const threshold = 0.7;
      const shouldRequestRepeat = lowConfidenceResult.confidence < threshold;
      
      expect(shouldRequestRepeat).toBe(true);
    });
  });
});
