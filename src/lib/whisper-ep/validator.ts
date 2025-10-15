/**
 * Whisper-EP Validator for Order & Component Rules
 * Following the cursor guide specifications
 */

export interface ValidationError {
  type: 'order' | 'component' | 'unit' | 'missing';
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions: string[];
}

// Pipeline order rules
const PIPELINE_ORDER = [
  'CLEAN',        // Tvätt/rensning
  'JOINT-FILL',   // Skarvspackling/slip
  'SKIM-COAT',    // Bredspackling
  'PRIME',        // Grundning
  'PAINT',        // Målning
  'SEAL'          // Fogning/maskering
] as const;

// Component compatibility rules
const COMPATIBILITY_RULES = {
  'PAINT': {
    incompatible: ['SEAL'], // Målning ersätter inte mjukfogning
    requires: ['CLEAN'], // Målning kräver först tvätt
    optional: ['SKIM-COAT', 'PRIME']
  },
  'SEAL': {
    incompatible: ['PAINT'],
    requires: ['CLEAN'],
    optional: ['SKIM-COAT']
  },
  'SKIM-COAT': {
    incompatible: [],
    requires: ['CLEAN'],
    optional: ['JOINT-FILL']
  }
} as const;

// Unit discipline rules
const UNIT_RULES = {
  area: ['kvm', 'm2'],
  length: ['lpm', 'meter'],
  count: ['st', 'stycken']
} as const;

/**
 * Validate pipeline order
 */
function validateOrder(steps: Array<{ intent_id: string; step_order: number }>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Sort steps by order
  const sortedSteps = [...steps].sort((a, b) => a.step_order - b.step_order);
  
  for (let i = 0; i < sortedSteps.length; i++) {
    const currentStep = sortedSteps[i];
    const currentIndex = PIPELINE_ORDER.indexOf(currentStep.intent_id as any);
    
    if (currentIndex === -1) continue;
    
    // Check if previous steps are in correct order
    for (let j = 0; j < i; j++) {
      const prevStep = sortedSteps[j];
      const prevIndex = PIPELINE_ORDER.indexOf(prevStep.intent_id as any);
      
      if (prevIndex !== -1 && prevIndex > currentIndex) {
        errors.push({
          type: 'order',
          message: `${currentStep.intent_id} ska komma före ${prevStep.intent_id}`,
          severity: 'error',
          suggestion: `Flytta ${prevStep.intent_id} till steg ${currentStep.step_order + 1}`
        });
      }
    }
  }
  
  return errors;
}

/**
 * Validate component compatibility
 */
function validateComponents(steps: Array<{ intent_id: string }>): ValidationError[] {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  for (const step of steps) {
    const rules = COMPATIBILITY_RULES[step.intent_id as keyof typeof COMPATIBILITY_RULES];
    if (!rules) continue;
    
    // Check incompatible components
    for (const incompatible of rules.incompatible) {
      const hasIncompatible = steps.some(s => s.intent_id === incompatible);
      if (hasIncompatible) {
        errors.push({
          type: 'component',
          message: `${step.intent_id} är inkompatibel med ${incompatible}`,
          severity: 'error',
          suggestion: `Välj antingen ${step.intent_id} eller ${incompatible}, inte båda`
        });
      }
    }
    
    // Check required components
    for (const required of rules.requires) {
      const hasRequired = steps.some(s => s.intent_id === required);
      if (!hasRequired) {
        warnings.push({
          type: 'component',
          message: `${step.intent_id} rekommenderar att ${required} ingår`,
          severity: 'warning',
          suggestion: `Lägg till ${required} före ${step.intent_id}`
        });
      }
    }
  }
  
  return [...errors, ...warnings];
}

/**
 * Validate unit discipline
 */
function validateUnits(steps: Array<{ area?: any; length?: any }>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  for (const step of steps) {
    // Check that area and length units are not mixed inappropriately
    if (step.area && step.length) {
      // This is allowed for different purposes
      continue;
    }
    
    // Validate area units
    if (step.area?.unit && !UNIT_RULES.area.includes(step.area.unit)) {
      errors.push({
        type: 'unit',
        message: `Ogiltig area-enhet: ${step.area.unit}`,
        severity: 'error',
        suggestion: 'Använd kvm eller m2 för area'
      });
    }
    
    // Validate length units
    if (step.length?.unit && !UNIT_RULES.length.includes(step.length.unit)) {
      errors.push({
        type: 'unit',
        message: `Ogiltig längd-enhet: ${step.length.unit}`,
        severity: 'error',
        suggestion: 'Använd lpm eller meter för längd'
      });
    }
  }
  
  return errors;
}

/**
 * Auto-fix suggestions
 */
function generateAutoFixes(steps: Array<{ intent_id: string }>): string[] {
  const suggestions: string[] = [];
  
  // Check for missing CLEAN step
  const hasClean = steps.some(s => s.intent_id === 'CLEAN');
  if (!hasClean) {
    suggestions.push('Lägg till CLEAN (tvätt/rensning) som första steg');
  }
  
  // Check for missing quantities
  const hasAreaSteps = steps.some(s => s.intent_id.includes('PAINT') || s.intent_id.includes('SKIM-COAT'));
  if (hasAreaSteps) {
    suggestions.push('Kontrollera att alla ytsteg har area-angivelser');
  }
  
  // Check for reasonable coat counts
  const paintSteps = steps.filter(s => s.intent_id.includes('PAINT'));
  if (paintSteps.length > 0) {
    suggestions.push('Kontrollera att målning har 1-3 lager (2 lager rekommenderas)');
  }
  
  return suggestions;
}

/**
 * Main validation function
 */
export function validateJob(job: {
  steps: Array<{
    intent_id: string;
    step_order: number;
    area?: { unit: string };
    length?: { unit: string };
  }>;
}): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  // Validate order
  errors.push(...validateOrder(job.steps));
  
  // Validate components
  const componentIssues = validateComponents(job.steps);
  errors.push(...componentIssues.filter(e => e.severity === 'error'));
  warnings.push(...componentIssues.filter(e => e.severity === 'warning'));
  
  // Validate units
  errors.push(...validateUnits(job.steps));
  
  // Generate auto-fixes
  const suggestions = generateAutoFixes(job.steps);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}
