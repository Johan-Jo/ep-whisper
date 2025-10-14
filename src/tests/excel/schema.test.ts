import { describe, it, expect } from 'vitest';
import {
  MepsRowSchema,
  normalizeColumnName,
  validateRequiredColumns,
  parseSwedishDecimal,
  parseExcelBoolean,
} from '../../lib/excel/schema';

describe('Excel Schema Validation', () => {
  describe('MepsRowSchema', () => {
    it('should validate a valid MEPS row', () => {
      const validRow = {
        meps_id: 'TEST-001',
        task_name_sv: 'Test task',
        unit: 'm2',
        labor_norm_per_unit: 0.5,
      };

      const result = MepsRowSchema.safeParse(validRow);
      expect(result.success).toBe(true);
    });

    it('should reject row with missing meps_id', () => {
      const invalidRow = {
        task_name_sv: 'Test task',
        unit: 'm2',
        labor_norm_per_unit: 0.5,
      };

      const result = MepsRowSchema.safeParse(invalidRow);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('meps_id');
      }
    });

    it('should reject row with invalid unit', () => {
      const invalidRow = {
        meps_id: 'TEST-001',
        task_name_sv: 'Test task',
        unit: 'invalid',
        labor_norm_per_unit: 0.5,
      };

      const result = MepsRowSchema.safeParse(invalidRow);
      expect(result.success).toBe(false);
    });

    it('should reject row with negative labor_norm', () => {
      const invalidRow = {
        meps_id: 'TEST-001',
        task_name_sv: 'Test task',
        unit: 'm2',
        labor_norm_per_unit: -0.5,
      };

      const result = MepsRowSchema.safeParse(invalidRow);
      expect(result.success).toBe(false);
    });

    it('should accept valid unit values: m2, lpm, st', () => {
      const units = ['m2', 'lpm', 'st'];

      for (const unit of units) {
        const row = {
          meps_id: 'TEST-001',
          task_name_sv: 'Test task',
          unit,
          labor_norm_per_unit: 0.5,
        };

        const result = MepsRowSchema.safeParse(row);
        expect(result.success).toBe(true);
      }
    });

    it('should accept optional surface_type', () => {
      const rowWithSurface = {
        meps_id: 'TEST-001',
        task_name_sv: 'Test task',
        unit: 'm2',
        labor_norm_per_unit: 0.5,
        surface_type: 'vägg',
      };

      const result = MepsRowSchema.safeParse(rowWithSurface);
      expect(result.success).toBe(true);
    });
  });

  describe('normalizeColumnName', () => {
    it('should normalize column names to canonical form', () => {
      expect(normalizeColumnName('meps id')).toBe('meps_id');
      expect(normalizeColumnName('MEPS ID')).toBe('meps_id');
      expect(normalizeColumnName('  meps_id  ')).toBe('meps_id');
      expect(normalizeColumnName('task name sv')).toBe('task_name_sv');
      expect(normalizeColumnName('labor norm')).toBe('labor_norm_per_unit');
    });

    it('should return original name if no alias matches', () => {
      const unknown = 'unknown_column';
      expect(normalizeColumnName(unknown)).toBe(unknown);
    });
  });

  describe('validateRequiredColumns', () => {
    it('should pass when all required columns are present', () => {
      const columns = ['meps_id', 'task_name_sv', 'unit', 'labor_norm_per_unit'];
      const errors = validateRequiredColumns(columns);
      expect(errors).toHaveLength(0);
    });

    it('should error when meps_id is missing', () => {
      const columns = ['task_name_sv', 'unit', 'labor_norm_per_unit'];
      const errors = validateRequiredColumns(columns);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('meps_id');
    });

    it('should error for each missing required column', () => {
      const columns = ['meps_id'];
      const errors = validateRequiredColumns(columns);
      expect(errors.length).toBeGreaterThanOrEqual(3); // missing 3 required columns
    });

    it('should recognize column aliases', () => {
      const columns = ['meps id', 'task name sv', 'unit', 'labor norm'];
      const errors = validateRequiredColumns(columns);
      expect(errors).toHaveLength(0);
    });
  });

  describe('parseSwedishDecimal', () => {
    it('should parse Swedish decimal format (comma)', () => {
      expect(parseSwedishDecimal('1,5')).toBe(1.5);
      expect(parseSwedishDecimal('0,25')).toBe(0.25);
      expect(parseSwedishDecimal('10,99')).toBe(10.99);
    });

    it('should parse English decimal format (dot)', () => {
      expect(parseSwedishDecimal('1.5')).toBe(1.5);
      expect(parseSwedishDecimal('0.25')).toBe(0.25);
    });

    it('should handle number input directly', () => {
      expect(parseSwedishDecimal(1.5)).toBe(1.5);
      expect(parseSwedishDecimal(0)).toBe(0);
    });

    it('should return undefined for invalid input', () => {
      expect(parseSwedishDecimal('invalid')).toBeUndefined();
      expect(parseSwedishDecimal('')).toBeUndefined();
      expect(parseSwedishDecimal(null)).toBeUndefined();
    });

    it('should handle whitespace', () => {
      expect(parseSwedishDecimal('  1,5  ')).toBe(1.5);
    });
  });

  describe('parseExcelBoolean', () => {
    it('should parse boolean values', () => {
      expect(parseExcelBoolean(true)).toBe(true);
      expect(parseExcelBoolean(false)).toBe(false);
    });

    it('should parse string "true" variations', () => {
      expect(parseExcelBoolean('true')).toBe(true);
      expect(parseExcelBoolean('TRUE')).toBe(true);
      expect(parseExcelBoolean('yes')).toBe(true);
      expect(parseExcelBoolean('ja')).toBe(true); // Swedish
      expect(parseExcelBoolean('1')).toBe(true);
      expect(parseExcelBoolean('x')).toBe(true);
    });

    it('should parse string "false" variations', () => {
      expect(parseExcelBoolean('false')).toBe(false);
      expect(parseExcelBoolean('FALSE')).toBe(false);
      expect(parseExcelBoolean('no')).toBe(false);
      expect(parseExcelBoolean('nej')).toBe(false); // Swedish
      expect(parseExcelBoolean('0')).toBe(false);
      expect(parseExcelBoolean('')).toBe(false);
    });

    it('should parse numeric values', () => {
      expect(parseExcelBoolean(1)).toBe(true);
      expect(parseExcelBoolean(0)).toBe(false);
      expect(parseExcelBoolean(5)).toBe(true);
    });

    it('should return undefined for invalid input', () => {
      expect(parseExcelBoolean(null)).toBeUndefined();
      expect(parseExcelBoolean(undefined)).toBeUndefined();
      expect(parseExcelBoolean('maybe')).toBeUndefined();
    });

    it('should handle whitespace', () => {
      expect(parseExcelBoolean('  yes  ')).toBe(true);
      expect(parseExcelBoolean('  no  ')).toBe(false);
    });
  });
});
