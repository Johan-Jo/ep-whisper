// Swedish Phrase Generator for Training Data

import type { MepsRow, Unit } from '../types';
import type { 
  PhraseTemplate, 
  InflectionRule, 
  GenerationContext, 
  GeneratedPhrase,
  GenerationOptions 
} from './types';

/**
 * Swedish inflection rules for proper grammar
 */
export const SWEDISH_INFLECTIONS: InflectionRule[] = [
  // Plural forms
  { pattern: /vägg$/i, replacement: 'väggar', type: 'plural' },
  { pattern: /dörr$/i, replacement: 'dörrar', type: 'plural' },
  { pattern: /fönster$/i, replacement: 'fönster', type: 'plural' },
  { pattern: /list$/i, replacement: 'lister', type: 'plural' },
  { pattern: /tak$/i, replacement: 'tak', type: 'plural' },
  { pattern: /golv$/i, replacement: 'golv', type: 'plural' },
  
  // Definite forms
  { pattern: /väggar$/i, replacement: 'väggarna', type: 'definite' },
  { pattern: /dörrar$/i, replacement: 'dörrarna', type: 'definite' },
  { pattern: /fönster$/i, replacement: 'fönstren', type: 'definite' },
  { pattern: /lister$/i, replacement: 'listerna', type: 'definite' },
  { pattern: /tak$/i, replacement: 'taket', type: 'definite' },
  { pattern: /golv$/i, replacement: 'golvet', type: 'definite' },
  
  // Singular definite
  { pattern: /vägg$/i, replacement: 'väggen', type: 'definite' },
  { pattern: /dörr$/i, replacement: 'dörren', type: 'definite' },
  { pattern: /fönster$/i, replacement: 'fönstret', type: 'definite' },
  { pattern: /list$/i, replacement: 'listen', type: 'definite' },
  { pattern: /golv$/i, replacement: 'golvet', type: 'definite' },
];

/**
 * Phrase templates for different types of painting tasks
 */
export const PHRASE_TEMPLATES: PhraseTemplate[] = [
  // Basic action templates
  {
    id: 'basic_action',
    template: '{action} {surface}',
    variables: ['action', 'surface'],
    context_requirements: { surface_type: ['vägg', 'tak', 'golv', 'dörr', 'fönster', 'list'] },
    frequency_weight: 0.4,
  },
  {
    id: 'action_with_quantity',
    template: '{action} {surface} {quantity} {unit}',
    variables: ['action', 'surface', 'quantity', 'unit'],
    context_requirements: { has_quantity: true },
    frequency_weight: 0.3,
  },
  {
    id: 'action_with_layers',
    template: '{action} {surface} {layers} lager',
    variables: ['action', 'surface', 'layers'],
    context_requirements: { has_layers: true },
    frequency_weight: 0.2,
  },
  {
    id: 'action_with_quantity_and_layers',
    template: '{action} {surface} {quantity} {unit} {layers} lager',
    variables: ['action', 'surface', 'quantity', 'unit', 'layers'],
    context_requirements: { has_quantity: true, has_layers: true },
    frequency_weight: 0.1,
  },
];

/**
 * Action words mapped to MEPS tasks
 */
export const ACTION_MAPPINGS: Record<string, { action: string; intent: string }> = {
  'MÅL-VÄGG-TÄCKMÅL-M2': { action: 'måla', intent: 'paint' },
  'MÅL-TAK-TÄCKMÅL-M2': { action: 'måla', intent: 'paint' },
  'MÅL-GOLV-TÄCKMÅL-M2': { action: 'måla', intent: 'paint' },
  'MÅL-VÄGG-GRUNDMÅL-M2': { action: 'grundmåla', intent: 'prime' },
  'MÅL-TAK-GRUNDMÅL-M2': { action: 'grundmåla', intent: 'prime' },
  'MÅL-GOLV-GRUNDMÅL-M2': { action: 'grundmåla', intent: 'prime' },
  'MÅL-VÄGG-SPACK-BRED-M2': { action: 'bredspackla', intent: 'skim_coat' },
  'MÅL-TAK-SPACK-BRED-M2': { action: 'bredspackla', intent: 'skim_coat' },
  'MÅL-VÄGG-SLIPA-M2': { action: 'slipa', intent: 'sand' },
  'MÅL-TAK-SLIPA-M2': { action: 'slipa', intent: 'sand' },
  'MÅL-LIST-TÄCKMÅL-LPM': { action: 'måla', intent: 'paint' },
  'MÅL-DÖRR-TÄCKMÅL-ST': { action: 'måla', intent: 'paint' },
  'MÅL-FÖNSTER-TÄCKMÅL-ST': { action: 'måla', intent: 'paint' },
};

/**
 * Surface words with proper Swedish forms
 */
export const SURFACE_MAPPINGS: Record<string, { singular: string; plural: string; definite: string }> = {
  'vägg': { singular: 'vägg', plural: 'väggar', definite: 'väggarna' },
  'tak': { singular: 'tak', plural: 'tak', definite: 'taket' },
  'golv': { singular: 'golv', plural: 'golv', definite: 'golvet' },
  'dörr': { singular: 'dörr', plural: 'dörrar', definite: 'dörrarna' },
  'fönster': { singular: 'fönster', plural: 'fönster', definite: 'fönstren' },
  'list': { singular: 'list', plural: 'lister', definite: 'listerna' },
};

/**
 * Typical quantities for different units and contexts
 */
export const TYPICAL_QUANTITIES: Record<Unit, number[]> = {
  'm2': [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100],
  'lpm': [5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50],
  'st': [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20],
};

/**
 * Typical layer counts for painting tasks
 */
export const TYPICAL_LAYERS = [1, 2, 3];

/**
 * Swedish phrase generator class
 */
export class SwedishPhraseGenerator {
  private options: GenerationOptions;

  constructor(options: Partial<GenerationOptions> = {}) {
    this.options = {
      phrases_per_task: 15,
      include_variations: true,
      include_quantities: true,
      include_layers: true,
      include_context: true,
      max_phrase_length: 50,
      use_realistic_quantities: true,
      ...options,
    };
  }

  /**
   * Generate phrases for a single MEPS task
   */
  generatePhrasesForTask(task: MepsRow, context: GenerationContext): GeneratedPhrase[] {
    const phrases: GeneratedPhrase[] = [];
    const actionMapping = ACTION_MAPPINGS[task.meps_id];
    
    if (!actionMapping) {
      console.warn(`No action mapping found for ${task.meps_id}`);
      return phrases;
    }

    const surfaceMapping = SURFACE_MAPPINGS[context.surface_type];
    if (!surfaceMapping) {
      console.warn(`No surface mapping found for ${context.surface_type}`);
      return phrases;
    }

    // Generate base phrases using templates
    for (const template of PHRASE_TEMPLATES) {
      if (!this.isTemplateApplicable(template, context, task)) {
        continue;
      }

      const templatePhrases = this.generateFromTemplate(
        template,
        actionMapping,
        surfaceMapping,
        context,
        task
      );

      phrases.push(...templatePhrases);
    }

    // Generate variations
    if (this.options.include_variations) {
      const variations = this.generateVariations(phrases, context, task);
      phrases.push(...variations);
    }

    return phrases.slice(0, this.options.phrases_per_task);
  }

  /**
   * Check if a template is applicable for the given context
   */
  private isTemplateApplicable(
    template: PhraseTemplate,
    context: GenerationContext,
    task: MepsRow
  ): boolean {
    const req = template.context_requirements;

    if (req.surface_type && !req.surface_type.includes(context.surface_type)) {
      return false;
    }

    if (req.unit && !req.unit.includes(context.unit)) {
      return false;
    }

    if (req.has_quantity && !this.options.include_quantities) {
      return false;
    }

    if (req.has_layers && !this.options.include_layers) {
      return false;
    }

    return true;
  }

  /**
   * Generate phrases from a specific template
   */
  private generateFromTemplate(
    template: PhraseTemplate,
    actionMapping: { action: string; intent: string },
    surfaceMapping: { singular: string; plural: string; definite: string },
    context: GenerationContext,
    task: MepsRow
  ): GeneratedPhrase[] {
    const phrases: GeneratedPhrase[] = [];

    // Generate multiple variations of the same template
    for (let i = 0; i < 3; i++) {
      const phrase = this.buildPhraseFromTemplate(
        template,
        actionMapping,
        surfaceMapping,
        context,
        task
      );

      if (phrase && phrase.phrase.length <= this.options.max_phrase_length) {
        phrases.push(phrase);
      }
    }

    return phrases;
  }

  /**
   * Build a single phrase from template variables
   */
  private buildPhraseFromTemplate(
    template: PhraseTemplate,
    actionMapping: { action: string; intent: string },
    surfaceMapping: { singular: string; plural: string; definite: string },
    context: GenerationContext,
    task: MepsRow
  ): GeneratedPhrase | null {
    let phrase = template.template;

    // Replace action
    phrase = phrase.replace('{action}', actionMapping.action);

    // Replace surface with appropriate form
    const surfaceForm = this.selectSurfaceForm(surfaceMapping, template.id);
    phrase = phrase.replace('{surface}', surfaceForm);

    // Replace quantity if needed
    if (phrase.includes('{quantity}')) {
      const quantity = this.selectQuantity(context.unit, context.typical_quantities);
      phrase = phrase.replace('{quantity}', quantity.toString());
    }

    // Replace unit if needed
    if (phrase.includes('{unit}')) {
      const unitText = this.getUnitText(context.unit);
      phrase = phrase.replace('{unit}', unitText);
    }

    // Replace layers if needed
    if (phrase.includes('{layers}')) {
      const layers = this.selectLayers(context.typical_layers);
      phrase = phrase.replace('{layers}', layers.toString());
    }

    return {
      phrase,
      meps_id: task.meps_id,
      intent: actionMapping.intent,
      entities: this.extractEntities(phrase, context),
      confidence: 0.9 + Math.random() * 0.1, // 0.9-1.0
      template_used: template.id,
      variations: [],
    };
  }

  /**
   * Select appropriate surface form based on template type
   */
  private selectSurfaceForm(
    surfaceMapping: { singular: string; plural: string; definite: string },
    templateId: string
  ): string {
    switch (templateId) {
      case 'basic_action':
        return Math.random() > 0.5 ? surfaceMapping.definite : surfaceMapping.plural;
      case 'action_with_quantity':
        return surfaceMapping.plural;
      case 'action_with_layers':
        return surfaceMapping.definite;
      case 'action_with_quantity_and_layers':
        return surfaceMapping.plural;
      default:
        return surfaceMapping.definite;
    }
  }

  /**
   * Select realistic quantity based on unit and context
   */
  private selectQuantity(unit: Unit, typicalQuantities: number[]): number {
    if (this.options.use_realistic_quantities) {
      const quantities = TYPICAL_QUANTITIES[unit];
      const availableQuantities = typicalQuantities.length > 0 ? typicalQuantities : quantities;
      return availableQuantities[Math.floor(Math.random() * availableQuantities.length)];
    }
    
    // Generate random realistic quantity
    switch (unit) {
      case 'm2':
        return Math.floor(Math.random() * 80) + 10; // 10-90 m2
      case 'lpm':
        return Math.floor(Math.random() * 40) + 5; // 5-45 lpm
      case 'st':
        return Math.floor(Math.random() * 15) + 1; // 1-15 st
      default:
        return Math.floor(Math.random() * 10) + 1;
    }
  }

  /**
   * Select number of layers
   */
  private selectLayers(typicalLayers: number[]): number {
    const layers = typicalLayers.length > 0 ? typicalLayers : TYPICAL_LAYERS;
    return layers[Math.floor(Math.random() * layers.length)];
  }

  /**
   * Get Swedish unit text
   */
  private getUnitText(unit: Unit): string {
    switch (unit) {
      case 'm2':
        return 'kvadratmeter';
      case 'lpm':
        return 'meter';
      case 'st':
        return 'stycken';
      default:
        return unit;
    }
  }

  /**
   * Extract entities from generated phrase
   */
  private extractEntities(phrase: string, context: GenerationContext): Record<string, any> {
    const entities: Record<string, any> = {
      surface_type: context.surface_type,
      unit: context.unit,
    };

    // Extract quantity if present
    const quantityMatch = phrase.match(/(\d+(?:[,.]\d+)?)\s*(kvadratmeter|meter|stycken|lager)/);
    if (quantityMatch) {
      entities.quantity = parseFloat(quantityMatch[1].replace(',', '.'));
    }

    // Extract layers if present
    const layersMatch = phrase.match(/(\d+)\s*lager/);
    if (layersMatch) {
      entities.layers = parseInt(layersMatch[1]);
    }

    return entities;
  }

  /**
   * Generate variations of existing phrases
   */
  private generateVariations(
    phrases: GeneratedPhrase[],
    context: GenerationContext,
    task: MepsRow
  ): GeneratedPhrase[] {
    const variations: GeneratedPhrase[] = [];

    for (const phrase of phrases.slice(0, 3)) { // Limit to first 3 phrases
      // Add contextual variations
      const contextualVariations = this.generateContextualVariations(phrase, context);
      variations.push(...contextualVariations);

      // Add inflection variations
      const inflectionVariations = this.generateInflectionVariations(phrase);
      variations.push(...inflectionVariations);
    }

    return variations;
  }

  /**
   * Generate contextual variations (room type, etc.)
   */
  private generateContextualVariations(
    phrase: GeneratedPhrase,
    context: GenerationContext
  ): GeneratedPhrase[] {
    const variations: GeneratedPhrase[] = [];

    if (context.room_type) {
      const roomPrefixes: Record<string, string> = {
        'living_room': 'i vardagsrummet',
        'bedroom': 'i sovrummet',
        'kitchen': 'i köket',
        'bathroom': 'i badrummet',
        'hallway': 'i hallen',
        'office': 'i kontoret',
      };

      const prefix = roomPrefixes[context.room_type];
      if (prefix) {
        variations.push({
          ...phrase,
          phrase: `${prefix} ${phrase.phrase}`,
          entities: { ...phrase.entities, room_type: context.room_type },
        });
      }
    }

    return variations;
  }

  /**
   * Generate inflection variations (singular/plural, definite/indefinite)
   */
  private generateInflectionVariations(phrase: GeneratedPhrase): GeneratedPhrase[] {
    const variations: GeneratedPhrase[] = [];

    for (const rule of SWEDISH_INFLECTIONS) {
      if (rule.pattern.test(phrase.phrase)) {
        const newPhrase = phrase.phrase.replace(rule.pattern, rule.replacement);
        if (newPhrase !== phrase.phrase) {
          variations.push({
            ...phrase,
            phrase: newPhrase,
            entities: { ...phrase.entities, inflection: rule.type },
          });
        }
      }
    }

    return variations;
  }
}
