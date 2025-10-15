import * as XLSX from 'xlsx';
import {
  MepsRowSchema,
  ValidatedMepsRow,
  ValidationResult,
  ValidationError,
  normalizeColumnName,
  validateRequiredColumns,
  parseSwedishDecimal,
  parseExcelBoolean,
} from './schema';
import { MepsRow } from '../types';

export interface ParserOptions {
  skipEmptyRows?: boolean;
  strictValidation?: boolean;
  maxErrors?: number;
}

const DEFAULT_OPTIONS: ParserOptions = {
  skipEmptyRows: true,
  strictValidation: true,
  maxErrors: 100,
};

/**
 * Parse Excel file (XLSX or CSV) and validate rows
 */
export async function parseExcelFile(
  filePath: string,
  options: ParserOptions = DEFAULT_OPTIONS
): Promise<ValidationResult> {
  try {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    return parseWorksheet(worksheet, options);
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          row: 0,
          message: `Failed to read Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

/**
 * Parse Excel file from buffer (for web uploads)
 */
export async function parseExcelBuffer(
  buffer: ArrayBuffer,
  options: ParserOptions = DEFAULT_OPTIONS
): Promise<ValidationResult> {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    return parseWorksheet(worksheet, options);
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          row: 0,
          message: `Failed to parse Excel buffer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

/**
 * Parse CSV file and validate rows
 */
export async function parseCsvFile(
  filePath: string,
  options: ParserOptions = DEFAULT_OPTIONS
): Promise<ValidationResult> {
  try {
    const workbook = XLSX.readFile(filePath, { type: 'string' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    return parseWorksheet(worksheet, options);
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          row: 0,
          message: `Failed to read CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

/**
 * Parse worksheet and validate data
 */
function parseWorksheet(
  worksheet: XLSX.WorkSheet,
  options: ParserOptions
): ValidationResult {
  // Convert to JSON with header row
  const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rawData.length === 0) {
    return {
      success: false,
      errors: [{ row: 0, message: 'Excel file is empty' }],
    };
  }

  // Extract and normalize column headers
  const headers: string[] = rawData[0];
  const normalizedHeaders = headers.map(normalizeColumnName);

  // Validate required columns
  const columnErrors = validateRequiredColumns(normalizedHeaders);
  if (columnErrors.length > 0) {
    return {
      success: false,
      errors: columnErrors,
    };
  }

  // Parse data rows
  const validatedRows: ValidatedMepsRow[] = [];
  const errors: ValidationError[] = [];
  const maxErrors = options.maxErrors || 100;

  for (let i = 1; i < rawData.length; i++) {
    const rowNumber = i + 1; // Excel row number (1-indexed)
    const row = rawData[i];

    // Skip empty rows if option is set
    if (options.skipEmptyRows && isEmptyRow(row)) {
      continue;
    }

    // Convert array row to object using headers
    const rowObject: any = {};
    for (let j = 0; j < headers.length; j++) {
      const normalizedHeader = normalizedHeaders[j];
      const value = row[j];
      rowObject[normalizedHeader] = value;
    }

    // Transform raw values to proper types
    const transformedRow = transformRowValues(rowObject);

    // Validate using Zod schema
    const result = MepsRowSchema.safeParse(transformedRow);

    if (result.success) {
      validatedRows.push(result.data);
    } else {
      // Collect validation errors
      for (const issue of result.error.issues) {
        errors.push({
          row: rowNumber,
          field: issue.path.join('.'),
          message: issue.message,
          value: rowObject[issue.path[0]],
        });

        // Stop if we've hit max errors
        if (errors.length >= maxErrors) {
          errors.push({
            row: rowNumber,
            message: `Maximum error limit (${maxErrors}) reached. Stopping validation.`,
          });
          return {
            success: false,
            errors,
          };
        }
      }
    }
  }

  return {
    success: errors.length === 0,
    data: validatedRows,
    errors,
  };
}

/**
 * Check if row is empty (all values are null/undefined/empty string)
 */
function isEmptyRow(row: any[]): boolean {
  return row.every((cell) => cell === null || cell === undefined || cell === '');
}

/**
 * Transform raw Excel values to proper types
 */
function transformRowValues(row: any): any {
  const transformed: any = { ...row };

  // Parse numeric fields with Swedish decimal support
  if (row.labor_norm_per_unit !== undefined) {
    transformed.labor_norm_per_unit = parseSwedishDecimal(row.labor_norm_per_unit);
  }

  if (row.material_factor_per_unit !== undefined) {
    transformed.material_factor_per_unit = parseSwedishDecimal(row.material_factor_per_unit);
  }

  if (row.price_material_per_unit !== undefined) {
    transformed.price_material_per_unit = parseSwedishDecimal(row.price_material_per_unit);
  }

  if (row.price_labor_per_hour !== undefined) {
    transformed.price_labor_per_hour = parseSwedishDecimal(row.price_labor_per_hour);
  }

  if (row.markup_pct !== undefined) {
    transformed.markup_pct = parseSwedishDecimal(row.markup_pct);
  }

  // Parse integer fields
  if (row.default_layers !== undefined) {
    const parsed = parseInt(String(row.default_layers), 10);
    transformed.default_layers = isNaN(parsed) ? undefined : parsed;
  }

  // Parse boolean fields
  if (row.prep_required !== undefined) {
    transformed.prep_required = parseExcelBoolean(row.prep_required);
  }

  // Trim string fields
  if (typeof row.meps_id === 'string') {
    transformed.meps_id = row.meps_id.trim();
  }

  if (typeof row.task_name_sv === 'string') {
    transformed.task_name_sv = row.task_name_sv.trim();
  }

  if (typeof row.task_name_en === 'string') {
    transformed.task_name_en = row.task_name_en.trim();
  }

  if (typeof row.unit === 'string') {
    transformed.unit = row.unit.trim().toLowerCase();
  }

  if (typeof row.surface_type === 'string') {
    const trimmed = row.surface_type.trim().toLowerCase();
    transformed.surface_type = trimmed === '' ? undefined : trimmed;
  }

  if (typeof row.synonyms === 'string') {
    transformed.synonyms = row.synonyms.trim();
  }

  return transformed;
}

/**
 * Convert validated rows to MepsRow type
 */
export function toMepsRows(validatedRows: ValidatedMepsRow[]): MepsRow[] {
  return validatedRows.map((row) => ({
    ...row,
    // Ensure all optional fields are properly typed
    task_name_en: row.task_name_en,
    material_factor_per_unit: row.material_factor_per_unit,
    default_layers: row.default_layers,
    surface_type: row.surface_type as any,
    prep_required: row.prep_required,
    synonyms: row.synonyms,
    price_material_per_unit: row.price_material_per_unit,
    price_labor_per_hour: row.price_labor_per_hour,
    markup_pct: row.markup_pct,
  }));
}
