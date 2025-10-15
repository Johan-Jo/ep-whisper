import { describe, it, expect } from 'vitest';
import { 
  parseSwedishIntent, 
  validateParsedIntent, 
  formatParsedIntent,
  type ParsedIntent,
  type ParsedTask 
} from '@/lib/nlp/parser';

describe('NLP Parser', () => {
  describe('parseSwedishIntent', () => {
    it('should parse simple painting command', () => {
      const result = parseSwedishIntent('måla väggarna');
      
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toMatchObject({
        action: 'paint',
        surface: 'vägg',
        quantity: 1,
        unit: 'lager'
      });
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.language).toBe('sv');
    });

    it('should parse command with quantity', () => {
      const result = parseSwedishIntent('måla väggarna två gånger');
      
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toMatchObject({
        action: 'paint',
        surface: 'vägg',
        quantity: 2,
        unit: 'gånger'
      });
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should parse command with layers', () => {
      const result = parseSwedishIntent('måla taket tre lager');
      
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toMatchObject({
        action: 'paint',
        surface: 'tak',
        quantity: 3,
        unit: 'lager'
      });
    });

    it('should parse spackling command', () => {
      const result = parseSwedishIntent('spackla väggarna');
      
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toMatchObject({
        action: 'skim_coat',
        surface: 'vägg',
        quantity: 1,
        unit: 'lager'
      });
    });

    it('should parse priming command', () => {
      const result = parseSwedishIntent('grundmåla dörrarna');
      
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toMatchObject({
        action: 'prime',
        surface: 'dörr',
        quantity: 1,
        unit: 'lager'
      });
    });

    it('should parse topcoat command', () => {
      const result = parseSwedishIntent('täckmåla fönstren två lager');
      
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toMatchObject({
        action: 'topcoat',
        surface: 'fönster',
        quantity: 2,
        unit: 'lager'
      });
    });

    it('should handle floor painting', () => {
      const result = parseSwedishIntent('måla golvet');
      
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toMatchObject({
        action: 'paint',
        surface: 'golv',
        quantity: 1,
        unit: 'lager'
      });
    });

    it('should handle list painting', () => {
      const result = parseSwedishIntent('måla taklisten');
      
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toMatchObject({
        action: 'paint',
        surface: 'list',
        quantity: 1,
        unit: 'lager'
      });
    });

    it('should handle complex sentence', () => {
      const result = parseSwedishIntent('jag vill måla väggarna två gånger och spackla taket');
      
      expect(result.tasks).toHaveLength(2);
      
      // First task: paint walls
      const paintTask = result.tasks.find(t => t.action === 'paint' && t.surface === 'vägg');
      expect(paintTask).toMatchObject({
        quantity: 2,
        unit: 'gånger'
      });
      
      // Second task: skim coat ceiling
      const spackleTask = result.tasks.find(t => t.action === 'skim_coat' && t.surface === 'tak');
      expect(spackleTask).toMatchObject({
        quantity: 1,
        unit: 'lager'
      });
    });

    it('should handle case insensitive input', () => {
      const result = parseSwedishIntent('MÅLA VÄGGARNA TVÅ GÅNGER');
      
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toMatchObject({
        action: 'paint',
        surface: 'vägg',
        quantity: 2,
        unit: 'gånger'
      });
    });

    it('should return empty tasks for unrecognized input', () => {
      const result = parseSwedishIntent('hej hur mår du');
      
      expect(result.tasks).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });

    it('should handle partial matches with lower confidence', () => {
      const result = parseSwedishIntent('göra något med väggarna');
      
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].action).toBe('paint');
      expect(result.tasks[0].surface).toBe('vägg');
      expect(result.confidence).toBeLessThan(0.8); // Lower confidence for 'göra'
    });
  });

  describe('validateParsedIntent', () => {
    it('should validate correct intent', () => {
      const intent: ParsedIntent = {
        tasks: [{
          action: 'paint',
          surface: 'vägg',
          quantity: 2,
          unit: 'lager',
          confidence: 0.9
        }],
        confidence: 0.9,
        rawText: 'måla väggarna två lager',
        language: 'sv'
      };
      
      expect(validateParsedIntent(intent)).toBe(true);
    });

    it('should reject intent with no tasks', () => {
      const intent: ParsedIntent = {
        tasks: [],
        confidence: 0,
        rawText: 'hej',
        language: 'sv'
      };
      
      expect(validateParsedIntent(intent)).toBe(false);
    });

    it('should reject intent with low confidence', () => {
      const intent: ParsedIntent = {
        tasks: [{
          action: 'paint',
          surface: 'vägg',
          quantity: 1,
          unit: 'lager',
          confidence: 0.9
        }],
        confidence: 0.2, // Too low
        rawText: 'måla väggarna',
        language: 'sv'
      };
      
      expect(validateParsedIntent(intent)).toBe(false);
    });

    it('should reject task with missing action', () => {
      const intent: ParsedIntent = {
        tasks: [{
          action: '',
          surface: 'vägg',
          quantity: 1,
          unit: 'lager',
          confidence: 0.9
        }],
        confidence: 0.9,
        rawText: 'måla väggarna',
        language: 'sv'
      };
      
      expect(validateParsedIntent(intent)).toBe(false);
    });

    it('should reject task with invalid quantity', () => {
      const intent: ParsedIntent = {
        tasks: [{
          action: 'paint',
          surface: 'vägg',
          quantity: 0, // Invalid
          unit: 'lager',
          confidence: 0.9
        }],
        confidence: 0.9,
        rawText: 'måla väggarna',
        language: 'sv'
      };
      
      expect(validateParsedIntent(intent)).toBe(false);
    });
  });

  describe('formatParsedIntent', () => {
    it('should format single task', () => {
      const intent: ParsedIntent = {
        tasks: [{
          action: 'paint',
          surface: 'vägg',
          quantity: 2,
          unit: 'lager',
          confidence: 0.9
        }],
        confidence: 0.9,
        rawText: 'måla väggarna två lager',
        language: 'sv'
      };
      
      const formatted = formatParsedIntent(intent);
      expect(formatted).toBe('Måla väggar (2 lager)');
    });

    it('should format multiple tasks', () => {
      const intent: ParsedIntent = {
        tasks: [
          {
            action: 'paint',
            surface: 'vägg',
            quantity: 2,
            unit: 'lager',
            confidence: 0.9
          },
          {
            action: 'skim_coat',
            surface: 'tak',
            quantity: 1,
            unit: 'lager',
            confidence: 0.9
          }
        ],
        confidence: 0.9,
        rawText: 'måla väggarna två lager och spackla taket',
        language: 'sv'
      };
      
      const formatted = formatParsedIntent(intent);
      expect(formatted).toBe('Måla väggar (2 lager), Spackla tak (1 lager)');
    });

    it('should handle empty tasks', () => {
      const intent: ParsedIntent = {
        tasks: [],
        confidence: 0,
        rawText: 'hej',
        language: 'sv'
      };
      
      const formatted = formatParsedIntent(intent);
      expect(formatted).toBe('Ingen målning uppgift identifierad');
    });

    it('should format different surface types', () => {
      const testCases = [
        { surface: 'vägg', expected: 'väggar' },
        { surface: 'tak', expected: 'tak' },
        { surface: 'dörr', expected: 'dörrar' },
        { surface: 'fönster', expected: 'fönster' },
        { surface: 'list', expected: 'list' },
        { surface: 'golv', expected: 'golv' }
      ];
      
      for (const testCase of testCases) {
        const intent: ParsedIntent = {
          tasks: [{
            action: 'paint',
            surface: testCase.surface,
            quantity: 1,
            unit: 'lager',
            confidence: 0.9
          }],
          confidence: 0.9,
          rawText: `måla ${testCase.surface}`,
          language: 'sv'
        };
        
        const formatted = formatParsedIntent(intent);
        expect(formatted).toContain(testCase.expected);
      }
    });
  });
});
