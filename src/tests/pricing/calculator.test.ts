import { describe, it, expect } from 'vitest';
import {
  calculateUnitPrice,
  calculateLineItem,
  calculateDetailedTotals,
  getTaskSection,
  groupLineItemsBySection,
  SWEDISH_SECTIONS,
} from '../../lib/pricing/calculator';
import { MepsRow, LineItem } from '../../lib/types';
import { MepsCatalog } from '../../lib/excel/catalog';

describe('Pricing Calculator', () => {
  const sampleTask: MepsRow = {
    meps_id: 'TEST-001',
    task_name_sv: 'Måla väggar',
    unit: 'm2',
    labor_norm_per_unit: 0.10, // 0.10 hours per m²
    price_labor_per_hour: 500, // 500 SEK per hour
    price_material_per_unit: 20, // 20 SEK per m²
  };

  describe('calculateUnitPrice', () => {
    it('should calculate unit price: labor + material', () => {
      const price = calculateUnitPrice(sampleTask);
      
      // (0.10h × 500 SEK/h) + 20 SEK = 50 + 20 = 70 SEK
      expect(price).toBe(70);
    });

    it('should use default labor price if not specified', () => {
      const taskWithoutPrice: MepsRow = {
        ...sampleTask,
        price_labor_per_hour: undefined,
      };

      const price = calculateUnitPrice(taskWithoutPrice, { labor_price_per_hour: 500, global_markup_pct: 10 });
      expect(price).toBe(70); // Same as above
    });

    it('should handle task with no material cost', () => {
      const taskNoMaterial: MepsRow = {
        ...sampleTask,
        price_material_per_unit: undefined,
      };

      const price = calculateUnitPrice(taskNoMaterial);
      expect(price).toBe(50); // Only labor: 0.10 × 500
    });
  });

  describe('calculateLineItem', () => {
    it('should calculate line item with quantity', () => {
      const lineItem = calculateLineItem(sampleTask, 10, 1, {
        labor_price_per_hour: 500,
        global_markup_pct: 10,
      });

      // Unit price: 70 SEK
      // With 10% markup: 70 × 1.10 = 77 SEK
      // Quantity: 10 m²
      // Subtotal: 10 × 77 = 770 SEK
      expect(lineItem.meps_id).toBe('TEST-001');
      expect(lineItem.name).toBe('Måla väggar');
      expect(lineItem.unit).toBe('m2');
      expect(lineItem.qty).toBe(10);
      expect(lineItem.unit_price).toBe(77);
      expect(lineItem.subtotal).toBe(770);
    });

    it('should apply layers multiplier', () => {
      const lineItem = calculateLineItem(sampleTask, 10, 2, {
        labor_price_per_hour: 500,
        global_markup_pct: 10,
      });

      // Quantity with 2 layers: 10 × 2 = 20 m²
      expect(lineItem.qty).toBe(20);
      expect(lineItem.subtotal).toBe(1540); // 20 × 77
    });

    it('should use row-level markup if specified', () => {
      const taskWithMarkup: MepsRow = {
        ...sampleTask,
        markup_pct: 15, // Override global 10%
      };

      const lineItem = calculateLineItem(taskWithMarkup, 10, 1, {
        labor_price_per_hour: 500,
        global_markup_pct: 10,
      });

      // Unit price with 15% markup: 70 × 1.15 = 80.5 SEK
      expect(lineItem.unit_price).toBe(80.5);
      expect(lineItem.subtotal).toBe(805);
    });

    it('should round prices to 2 decimals', () => {
      const taskWithOddPrice: MepsRow = {
        ...sampleTask,
        labor_norm_per_unit: 0.123,
        price_material_per_unit: 15.777,
      };

      const lineItem = calculateLineItem(taskWithOddPrice, 10, 1, {
        labor_price_per_hour: 500,
        global_markup_pct: 10,
      });

      // All prices should have max 2 decimals
      expect(lineItem.unit_price.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(lineItem.subtotal.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });
  });

  describe('calculateDetailedTotals', () => {
    it('should calculate totals from multiple tasks', () => {
      const tasks = [
        { task: sampleTask, quantity: 10, layers: 2 }, // 20m² × (50+20) = 1400
        { task: { ...sampleTask, meps_id: 'TEST-002' }, quantity: 5, layers: 1 }, // 5m² × 70 = 350
      ];

      const totals = calculateDetailedTotals(tasks, {
        labor_price_per_hour: 500,
        global_markup_pct: 10,
      });

      // Labor: (20 × 50) + (5 × 50) = 1000 + 250 = 1250
      // Material: (20 × 20) + (5 × 20) = 400 + 100 = 500
      // Subtotal: 1750
      // Markup (10%): 175
      // Grand total: 1925

      expect(totals.labor_total).toBe(1250);
      expect(totals.material_total).toBe(500);
      expect(totals.markup_total).toBe(175);
      expect(totals.grand_total).toBe(1925);
    });

    it('should handle tasks with no material cost', () => {
      const taskNoMaterial: MepsRow = {
        ...sampleTask,
        price_material_per_unit: undefined,
      };

      const tasks = [{ task: taskNoMaterial, quantity: 10, layers: 1 }];

      const totals = calculateDetailedTotals(tasks, {
        labor_price_per_hour: 500,
        global_markup_pct: 10,
      });

      expect(totals.labor_total).toBe(500); // 10 × 0.10 × 500
      expect(totals.material_total).toBe(0);
      expect(totals.markup_total).toBe(50);
      expect(totals.grand_total).toBe(550);
    });
  });

  describe('Swedish Section Labels', () => {
    it('should have correct Swedish section names', () => {
      expect(SWEDISH_SECTIONS.PREP).toBe('Förberedelse');
      expect(SWEDISH_SECTIONS.PAINT).toBe('Målning');
      expect(SWEDISH_SECTIONS.FINISH).toBe('Finish');
    });
  });

  describe('getTaskSection', () => {
    it('should identify prep tasks', () => {
      const prepTask: MepsRow = {
        meps_id: 'TEST-SPACK',
        task_name_sv: 'Bredspackla väggar',
        unit: 'm2',
        labor_norm_per_unit: 0.15,
        prep_required: true,
      };

      expect(getTaskSection(prepTask)).toBe('PREP');
    });

    it('should identify paint tasks', () => {
      const paintTask: MepsRow = {
        meps_id: 'TEST-PAINT',
        task_name_sv: 'Täckmåla väggar',
        unit: 'm2',
        labor_norm_per_unit: 0.10,
      };

      expect(getTaskSection(paintTask)).toBe('PAINT');
    });

    it('should identify finish tasks', () => {
      const finishTask: MepsRow = {
        meps_id: 'TEST-LACK',
        task_name_sv: 'Lacka trä',
        unit: 'm2',
        labor_norm_per_unit: 0.12,
      };

      expect(getTaskSection(finishTask)).toBe('FINISH');
    });
  });

  describe('groupLineItemsBySection', () => {
    it('should group line items by section', () => {
      const catalog = new MepsCatalog();
      const tasks: MepsRow[] = [
        {
          meps_id: 'PREP-001',
          task_name_sv: 'Spackla',
          unit: 'm2',
          labor_norm_per_unit: 0.15,
          prep_required: true,
        },
        {
          meps_id: 'PAINT-001',
          task_name_sv: 'Måla',
          unit: 'm2',
          labor_norm_per_unit: 0.10,
        },
      ];

      // @ts-ignore - accessing private method for testing
      catalog.indexTasks(tasks);

      const lineItems: LineItem[] = [
        { meps_id: 'PREP-001', name: 'Spackla', unit: 'm2', qty: 10, unit_price: 50, subtotal: 500 },
        { meps_id: 'PAINT-001', name: 'Måla', unit: 'm2', qty: 10, unit_price: 40, subtotal: 400 },
      ];

      const grouped = groupLineItemsBySection(lineItems, catalog);

      expect(grouped.PREP).toHaveLength(1);
      expect(grouped.PAINT).toHaveLength(1);
      expect(grouped.FINISH).toHaveLength(0);
    });
  });
});

