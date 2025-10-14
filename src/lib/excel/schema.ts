import { z } from 'zod';
import { Unit } from '../types';

// Zod schema for validating Excel MEPS rows
export const MepsRowSchema = z.object({
  meps_id: z.string().min(1, 'meps_id is required'),
  task_name_sv: z.string().min(1, 'task_name_sv is required'),
  task_name_en: z.string().optional(),
  unit: z.enum(['m2', 'lpm', 'st'], {
    message: 'unit must be one of: m2, lpm, st',
  }),
  labor_norm_per_unit: z.number().positive('labor_norm_per_unit must be positive'),
  material_factor_per_unit: z.number().optional(),
  default_layers: z.number().int().positive().optional(),
  surface_type: z.enum(['vägg', 'tak', 'dörr', 'fönster', 'list']).nullish(),
  prep_required: z.boolean().optional(),
  synonyms: z.string().optional(),
  price_material_per_unit: z.number().nonnegative().optional(),
  price_labor_per_hour: z.number().positive().optional(),
  markup_pct: z.number().min(0).max(100).optional(),
});

export type ValidatedMepsRow = z.infer<typeof MepsRowSchema>;

export interface ValidationResult {
  success: boolean;
  data?: ValidatedMepsRow[];
  errors: ValidationError[];
}

export interface ValidationError {
  row: number;
  field?: string;
  message: string;
  value?: any;
}

// Required columns that must exist in Excel file
export const REQUIRED_COLUMNS = [
  'meps_id',
  'task_name_sv',
  'unit',
  'labor_norm_per_unit',
] as const;

// Column mapping for common variations (lowercase for matching)
export const COLUMN_ALIASES: Record<string, string> = {
  'meps id': 'meps_id',
  'mepsid': 'meps_id',
  'task name sv': 'task_name_sv',
  'task name swedish': 'task_name_sv',
  'taskname_sv': 'task_name_sv',
  'task name en': 'task_name_en',
  'task name english': 'task_name_en',
  'taskname_en': 'task_name_en',
  'labor norm': 'labor_norm_per_unit',
  'labor_norm': 'labor_norm_per_unit',
  'labour_norm_per_unit': 'labor_norm_per_unit',
  'material factor': 'material_factor_per_unit',
  'material_factor': 'material_factor_per_unit',
  'default layers': 'default_layers',
  'defaultlayers': 'default_layers',
  'surface type': 'surface_type',
  'surfacetype': 'surface_type',
  'prep required': 'prep_required',
  'preprequired': 'prep_required',
  'price material': 'price_material_per_unit',
  'price_material': 'price_material_per_unit',
  'price labor': 'price_labor_per_hour',
  'price_labor': 'price_labor_per_hour',
  'markup': 'markup_pct',
  'markup_percentage': 'markup_pct',
};

/**
 * Normalize column names from Excel to match schema
 */
export function normalizeColumnName(columnName: string): string {
  const normalized = columnName.toLowerCase().trim();
  return COLUMN_ALIASES[normalized] || normalized;
}

/**
 * Validate that all required columns are present
 */
export function validateRequiredColumns(columns: string[]): ValidationError[] {
  const normalizedColumns = columns.map(normalizeColumnName);
  const errors: ValidationError[] = [];

  for (const required of REQUIRED_COLUMNS) {
    if (!normalizedColumns.includes(required)) {
      errors.push({
        row: 0,
        field: required,
        message: `Required column '${required}' is missing from Excel file`,
      });
    }
  }

  return errors;
}

/**
 * Parse Swedish decimal format (comma) to JavaScript number
 */
export function parseSwedishDecimal(value: any): number | undefined {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    // Replace comma with dot for parsing
    const normalized = value.trim().replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
}

/**
 * Parse boolean values from Excel (various formats)
 */
export function parseExcelBoolean(value: any): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (['true', 'yes', 'ja', '1', 'x'].includes(lower)) return true;
    if (['false', 'no', 'nej', '0', ''].includes(lower)) return false;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return undefined;
}
