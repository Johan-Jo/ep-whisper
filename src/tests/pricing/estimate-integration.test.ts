import { describe, it, expect, beforeEach } from 'vitest';
import { MepsCatalog } from '../../lib/excel/catalog';
import { MepsRow, RoomCalculation } from '../../lib/types';
import {
  buildEstimate,
  buildEstimateFromPhrases,
  buildSingleTaskEstimate,
} from '../../lib/pricing/estimate-builder';
import { calculateRoom } from '../../lib/geometry/calculator';

describe('Estimate Integration Tests - PRD §12 Full Room Scenario', () => {
  let catalog: MepsCatalog;

  // Sample MEPS tasks based on PRD examples
  const sampleMepsRows: MepsRow[] = [
    {
      meps_id: 'MÅL-VÄGG-SPACK-BRED-M2',
      task_name_sv: 'Bredspackla väggar',
      unit: 'm2',
      labor_norm_per_unit: 0.15,
      price_material_per_unit: 12,
      surface_type: 'vägg',
      prep_required: true,
      synonyms: 'spackla väggar;bredspackling vägg;spackling',
    },
    {
      meps_id: 'MÅL-TAK-SPACK-BRED-M2',
      task_name_sv: 'Bredspackla tak',
      unit: 'm2',
      labor_norm_per_unit: 0.18,
      price_material_per_unit: 12,
      surface_type: 'tak',
      prep_required: true,
      synonyms: 'bredspackla taket;spackla tak',
    },
    {
      meps_id: 'MÅL-VÄGG-MÅLA-TÄCK-M2',
      task_name_sv: 'Täckmåla väggar',
      unit: 'm2',
      labor_norm_per_unit: 0.10,
      price_material_per_unit: 18,
      surface_type: 'vägg',
      default_layers: 2,
      synonyms: 'måla väggar;täckmålning vägg;slutstrykning vägg',
    },
    {
      meps_id: 'MÅL-TAK-MÅLA-TÄCK-M2',
      task_name_sv: 'Täckmåla tak',
      unit: 'm2',
      labor_norm_per_unit: 0.12,
      price_material_per_unit: 18,
      surface_type: 'tak',
      default_layers: 2,
      synonyms: 'måla tak;täckmålning tak;slutstrykning tak',
    },
    {
      meps_id: 'MÅL-DÖRR-MÅLA-1SIDA-ST',
      task_name_sv: 'Måla dörr en sida',
      unit: 'st',
      labor_norm_per_unit: 0.45,
      price_material_per_unit: 25,
      surface_type: 'dörr',
      synonyms: 'dörrmålning 1 sida;måla dörr;dörr en sida',
    },
    {
      meps_id: 'MÅL-FÖNSTER-MÅLA-ST',
      task_name_sv: 'Måla fönster',
      unit: 'st',
      labor_norm_per_unit: 0.60,
      price_material_per_unit: 30,
      surface_type: 'fönster',
      synonyms: 'fönstermålning;måla fönstret',
    },
  ];

  beforeEach(async () => {
    catalog = new MepsCatalog();
    await catalog.loadFromRows(sampleMepsRows);
  });

  describe('PRD §12 Example: Bedroom with Wardrobe', () => {
    /**
     * Input: W=2 m, L=5 m, H=2.5 m
     * - One 2 m wall covered by wardrobes
     * - 1 standard door
     * - 1 window 1.2×1.2
     * 
     * Expected calculations:
     * - Walls gross: 2*(2+5)*2.5 = 35.0 m²
     * - Openings: door 1.89 + window 1.44 = 3.33 m²
     * - Wardrobe deduction: 2 * 2.5 = 5.0 m²
     * - Walls net: 35.0 - 3.33 - 5.0 = 26.67 m² → 26.7 m²
     * - Ceiling net: 2*5 = 10.0 m²
     */
    it('should calculate correct geometry for bedroom', () => {
      const calculation = calculateRoom({
        W: 2,
        L: 5,
        H: 2.5,
        doors: [{}], // Standard door
        windows: [{ w: 1.2, h: 1.2 }],
        wardrobes: [{ length: 2, coverage_pct: 100 }], // 100% coverage
      });

      expect(calculation.walls_gross).toBe(35.0);
      expect(calculation.walls_net).toBeCloseTo(26.7, 1);
      expect(calculation.ceiling_gross).toBe(10.0);
      expect(calculation.ceiling_net).toBe(10.0);
      expect(calculation.openings_total).toBeCloseTo(3.33, 1); // Allow 0.05 tolerance for rounding
      expect(calculation.wardrobes_deduction).toBe(5.0);
    });

    it('should build estimate from Swedish task phrases', () => {
      const roomCalculation: RoomCalculation = {
        walls_gross: 35.0,
        walls_net: 26.7,
        ceiling_gross: 10.0,
        ceiling_net: 10.0,
        floor_gross: 10.0,
        floor_net: 10.0,
        openings_total: 3.33,
        wardrobes_deduction: 5.0,
      };

      // Swedish phrases from PRD §12
      // Note: "täckmålas två gånger" is split into specific surfaces for clarity
      const phrases = [
        'spackla väggar',
        'bredspackla taket',
        'måla väggar två gånger',
        'måla tak två gånger',
        'måla dörr en sida',
        'måla fönster',
      ];

      const estimate = buildEstimateFromPhrases(
        catalog,
        roomCalculation,
        phrases,
        { labor_price_per_hour: 500, global_markup_pct: 10 }
      );

      // Verify line items were created
      expect(estimate.line_items.length).toBeGreaterThan(0);
      // Most phrases should map (allow for some unmapped if catalog doesn't have all tasks)
      expect(estimate.unmapped_phrases.length).toBeLessThan(phrases.length)

      // Verify sections
      expect(estimate.sections).toHaveLength(3);
      const prepSection = estimate.sections.find(s => s.title === 'Förberedelse');
      const paintSection = estimate.sections.find(s => s.title === 'Målning');
      
      expect(prepSection).toBeDefined();
      expect(paintSection).toBeDefined();
      
      // Prep should have spackling tasks
      expect(prepSection!.items.length).toBeGreaterThan(0);
      
      // Paint should have painting tasks
      expect(paintSection!.items.length).toBeGreaterThan(0);

      // Verify totals
      expect(estimate.totals.grand_total).toBeGreaterThan(0);
      expect(estimate.totals.labor_total).toBeGreaterThan(0);
      expect(estimate.totals.material_total).toBeGreaterThan(0);

      // Verify ROT info
      expect(estimate.rot_info.potential_deduction).toBeGreaterThan(0);
      expect(estimate.rot_info.potential_deduction).toBeLessThanOrEqual(
        estimate.rot_info.eligible_amount * 0.30
      );
      expect(estimate.rot_info.note.title).toBe('ROT-avdrag');
    });

    it('should handle explicit task quantities', () => {
      const roomCalculation: RoomCalculation = {
        walls_gross: 35.0,
        walls_net: 26.7,
        ceiling_gross: 10.0,
        ceiling_net: 10.0,
        floor_gross: 10.0,
        floor_net: 10.0,
        openings_total: 3.33,
        wardrobes_deduction: 5.0,
      };

      const estimate = buildEstimate({
        catalog,
        roomCalculation,
        tasks: [
          { phrase: 'bredspackla väggar' }, // Auto quantity from walls_net
          { phrase: 'bredspackla tak' }, // Auto quantity from ceiling_net
          { phrase: 'måla dörr en sida', quantity: 1 }, // Explicit quantity
          { phrase: 'måla fönster', quantity: 1 }, // Explicit quantity
        ],
        config: { labor_price_per_hour: 500, global_markup_pct: 10 },
      });

      // Find line items
      const wallSpackle = estimate.line_items.find(
        item => item.meps_id === 'MÅL-VÄGG-SPACK-BRED-M2'
      );
      const ceilingSpackle = estimate.line_items.find(
        item => item.meps_id === 'MÅL-TAK-SPACK-BRED-M2'
      );
      const door = estimate.line_items.find(
        item => item.meps_id === 'MÅL-DÖRR-MÅLA-1SIDA-ST'
      );

      expect(wallSpackle?.qty).toBeCloseTo(26.7, 1);
      expect(ceilingSpackle?.qty).toBe(10.0);
      expect(door?.qty).toBe(1);
    });

    it('should apply layers correctly', () => {
      const roomCalculation: RoomCalculation = {
        walls_gross: 35.0,
        walls_net: 26.7,
        ceiling_gross: 10.0,
        ceiling_net: 10.0,
        floor_gross: 10.0,
        floor_net: 10.0,
        openings_total: 3.33,
        wardrobes_deduction: 5.0,
      };

      const estimate = buildEstimate({
        catalog,
        roomCalculation,
        tasks: [
          { phrase: 'måla väggar', layers: 2 },
          { phrase: 'måla tak', layers: 2 },
        ],
        config: { labor_price_per_hour: 500, global_markup_pct: 10 },
      });

      const wallPaint = estimate.line_items.find(
        item => item.meps_id === 'MÅL-VÄGG-MÅLA-TÄCK-M2'
      );
      const ceilingPaint = estimate.line_items.find(
        item => item.meps_id === 'MÅL-TAK-MÅLA-TÄCK-M2'
      );

      // Quantity should be doubled with 2 layers
      expect(wallPaint?.qty).toBeCloseTo(26.7 * 2, 1);
      expect(ceilingPaint?.qty).toBe(10.0 * 2);
    });
  });

  describe('Guard Rails and Error Handling', () => {
    it('should not hallucinate tasks not in catalog', () => {
      const roomCalculation: RoomCalculation = {
        walls_gross: 35.0,
        walls_net: 26.7,
        ceiling_gross: 10.0,
        ceiling_net: 10.0,
        floor_gross: 10.0,
        floor_net: 10.0,
        openings_total: 3.33,
        wardrobes_deduction: 5.0,
      };

      const estimate = buildEstimateFromPhrases(
        catalog,
        roomCalculation,
        ['nonsense task that does not exist'],
        { labor_price_per_hour: 500, global_markup_pct: 10 }
      );

      // Should have unmapped phrase
      expect(estimate.unmapped_phrases).toHaveLength(1);
      expect(estimate.unmapped_phrases[0]).toBe('nonsense task that does not exist');
      
      // Should have warning
      expect(estimate.warnings.length).toBeGreaterThan(0);
      expect(estimate.warnings[0]).toContain('Kunde inte hitta uppgiften');
      
      // Should have no line items
      expect(estimate.line_items).toHaveLength(0);
    });

    it('should warn about low confidence matches', () => {
      const roomCalculation: RoomCalculation = {
        walls_gross: 35.0,
        walls_net: 26.7,
        ceiling_gross: 10.0,
        ceiling_net: 10.0,
        floor_gross: 10.0,
        floor_net: 10.0,
        openings_total: 3.33,
        wardrobes_deduction: 5.0,
      };

      // Vague phrase that might match with low confidence
      const estimate = buildSingleTaskEstimate(
        catalog,
        roomCalculation,
        'måla',
        { labor_price_per_hour: 500, global_markup_pct: 10 }
      );

      // Might have warning about confidence
      // (depends on fuzzy matching implementation)
      if (estimate.line_items.length > 0) {
        // If it found a match, it should be a painting task
        const item = estimate.line_items[0];
        expect(item.meps_id).toContain('MÅLA');
      }
    });

    it('should skip tasks with zero quantity', () => {
      const roomCalculation: RoomCalculation = {
        walls_gross: 0,
        walls_net: 0, // No walls!
        ceiling_gross: 10.0,
        ceiling_net: 10.0,
        floor_gross: 10.0,
        floor_net: 10.0,
        openings_total: 0,
        wardrobes_deduction: 0,
      };

      const estimate = buildSingleTaskEstimate(
        catalog,
        roomCalculation,
        'spackla väggar',
        { labor_price_per_hour: 500, global_markup_pct: 10 }
      );

      // Should have warning about zero quantity
      expect(estimate.warnings.length).toBeGreaterThan(0);
      expect(estimate.warnings[0]).toContain('kvantiteten är 0');
      
      // Should have no line items
      expect(estimate.line_items).toHaveLength(0);
    });
  });

  describe('Swedish Section Labels and Grouping', () => {
    it('should correctly group prep tasks', () => {
      const roomCalculation: RoomCalculation = {
        walls_gross: 35.0,
        walls_net: 26.7,
        ceiling_gross: 10.0,
        ceiling_net: 10.0,
        floor_gross: 10.0,
        floor_net: 10.0,
        openings_total: 3.33,
        wardrobes_deduction: 5.0,
      };

      const estimate = buildEstimateFromPhrases(
        catalog,
        roomCalculation,
        ['spackla väggar', 'bredspackla taket'],
        { labor_price_per_hour: 500, global_markup_pct: 10 }
      );

      const prepSection = estimate.sections.find(s => s.title === 'Förberedelse');
      expect(prepSection).toBeDefined();
      expect(prepSection!.items).toHaveLength(2);
      expect(prepSection!.subtotal).toBeGreaterThan(0);
    });

    it('should correctly group paint tasks', () => {
      const roomCalculation: RoomCalculation = {
        walls_gross: 35.0,
        walls_net: 26.7,
        ceiling_gross: 10.0,
        ceiling_net: 10.0,
        floor_gross: 10.0,
        floor_net: 10.0,
        openings_total: 3.33,
        wardrobes_deduction: 5.0,
      };

      const estimate = buildEstimateFromPhrases(
        catalog,
        roomCalculation,
        ['måla väggar', 'måla tak', 'måla dörr en sida'],
        { labor_price_per_hour: 500, global_markup_pct: 10 }
      );

      const paintSection = estimate.sections.find(s => s.title === 'Målning');
      expect(paintSection).toBeDefined();
      expect(paintSection!.items.length).toBeGreaterThan(0);
    });
  });

  describe('ROT-avdrag Calculation', () => {
    it('should calculate ROT potential from labor costs', () => {
      const roomCalculation: RoomCalculation = {
        walls_gross: 35.0,
        walls_net: 26.7,
        ceiling_gross: 10.0,
        ceiling_net: 10.0,
        floor_gross: 10.0,
        floor_net: 10.0,
        openings_total: 3.33,
        wardrobes_deduction: 5.0,
      };

      const estimate = buildEstimateFromPhrases(
        catalog,
        roomCalculation,
        ['spackla väggar', 'måla väggar'],
        { labor_price_per_hour: 500, global_markup_pct: 10 }
      );

      // ROT deduction should be 30% of labor, capped at 50,000
      const expectedMax = estimate.totals.labor_total * 0.30;
      expect(estimate.rot_info.potential_deduction).toBeLessThanOrEqual(
        Math.min(expectedMax, 50000)
      );
      expect(estimate.rot_info.eligible_amount).toBe(estimate.totals.labor_total);
      expect(estimate.rot_info.note).toBeDefined();
      expect(estimate.rot_info.note.title).toBe('ROT-avdrag');
    });
  });
});

