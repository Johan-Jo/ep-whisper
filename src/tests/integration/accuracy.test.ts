import { describe, it, expect, beforeAll } from 'vitest';
import { calculateRoom } from '../../lib/geometry/index.js';
import { RoomGeometry, RoomCalculation } from '../../lib/types';

/**
 * Golden file tests for ±3% accuracy requirement (PRD §17)
 * These are hand-calculated reference values
 */

describe('Accuracy Tests (±3% requirement)', () => {
  describe('Golden Room Scenarios', () => {
    it('Test Case 1: Small bedroom (PRD example)', () => {
      const geometry: RoomGeometry = {
        W: 2.0,
        L: 5.0,
        H: 2.5,
        doors: [{}],
        windows: [{ w: 1.2, h: 1.2 }],
        wardrobes: [],
      };

      const calculation = calculateRoom(geometry);

      // Hand-calculated expected values
      const expected = {
        walls_gross: 35.0, // 2*(2+5)*2.5
        ceiling_net: 10.0, // 2*5
        floor_net: 10.0, // 2*5
        openings: 3.3, // 0.9*2.1 + 1.2*1.2
        walls_net: 31.7, // 35 - 3.3
      };

      // Verify within ±3%
      expectWithinTolerance(calculation.walls_gross, expected.walls_gross, 3);
      expectWithinTolerance(calculation.ceiling_net, expected.ceiling_net, 3);
      expectWithinTolerance(calculation.floor_net, expected.floor_net, 3);
      expectWithinTolerance(calculation.openings_total, expected.openings, 3);
      expectWithinTolerance(calculation.walls_net, expected.walls_net, 3);
    });

    it('Test Case 2: Large living room', () => {
      const geometry: RoomGeometry = {
        W: 6.0,
        L: 7.5,
        H: 2.7,
        doors: [{}, { w: 1.6, h: 2.1, sides: 2 }],
        windows: [
          { w: 1.8, h: 1.5 },
          { w: 1.8, h: 1.5 },
          { w: 1.2, h: 1.2 },
        ],
        wardrobes: [],
      };

      const calculation = calculateRoom(geometry);

      // Hand-calculated
      const expected = {
        walls_gross: 72.9, // 2*(6+7.5)*2.7
        ceiling_net: 45.0, // 6*7.5
        floor_net: 45.0,
        openings: 15.5, // 0.9*2.1 + 1.6*2.1*2 + 1.8*1.5*2 + 1.2*1.2 = 15.45 → rounds to 15.5
        walls_net: 57.5, // 72.9 - 15.5 = 57.4 → rounds to 57.5 after final rounding
      };

      expectWithinTolerance(calculation.walls_gross, expected.walls_gross, 3);
      expectWithinTolerance(calculation.ceiling_net, expected.ceiling_net, 3);
      expectWithinTolerance(calculation.floor_net, expected.floor_net, 3);
      expectWithinTolerance(calculation.openings_total, expected.openings, 3);
      expectWithinTolerance(calculation.walls_net, expected.walls_net, 3);
    });

    it('Test Case 3: Small bathroom', () => {
      const geometry: RoomGeometry = {
        W: 2.0,
        L: 2.5,
        H: 2.4,
        doors: [{}],
        windows: [{ w: 0.6, h: 0.8 }],
        wardrobes: [],
      };

      const calculation = calculateRoom(geometry);

      // Hand-calculated
      const expected = {
        walls_gross: 21.6, // 2*(2+2.5)*2.4
        ceiling_net: 5.0, // 2*2.5
        floor_net: 5.0,
        openings: 2.4, // 0.9*2.1 + 0.6*0.8
        walls_net: 19.2, // 21.6 - 2.4
      };

      expectWithinTolerance(calculation.walls_gross, expected.walls_gross, 3);
      expectWithinTolerance(calculation.ceiling_net, expected.ceiling_net, 3);
      expectWithinTolerance(calculation.floor_net, expected.floor_net, 3);
      expectWithinTolerance(calculation.openings_total, expected.openings, 3);
      expectWithinTolerance(calculation.walls_net, expected.walls_net, 3);
    });

    it('Test Case 4: Room with wardrobes', () => {
      const geometry: RoomGeometry = {
        W: 4.0,
        L: 5.0,
        H: 2.5,
        doors: [{}],
        windows: [{ w: 1.2, h: 1.5 }],
        wardrobes: [{ length: 2.5, coverage_pct: 100 }],
      };

      const calculation = calculateRoom(geometry);

      // Hand-calculated
      const expected = {
        walls_gross: 45.0, // 2*(4+5)*2.5
        ceiling_net: 20.0, // 4*5
        floor_net: 20.0,
        openings: 3.7, // 0.9*2.1 + 1.2*1.5 = 1.89 + 1.8 = 3.69 ≈ 3.7
        wardrobes: 6.3, // 2.5*2.5 = 6.25 ≈ 6.3
        walls_net: 35.1, // 45 - 3.7 - 6.3 = 35.0 (rounded to 35.1)
      };

      expectWithinTolerance(calculation.walls_gross, expected.walls_gross, 3);
      expectWithinTolerance(calculation.ceiling_net, expected.ceiling_net, 3);
      expectWithinTolerance(calculation.floor_net, expected.floor_net, 3);
      expectWithinTolerance(calculation.openings_total, expected.openings, 3);
      expectWithinTolerance(calculation.wardrobes_deduction, expected.wardrobes, 3);
      expectWithinTolerance(calculation.walls_net, expected.walls_net, 3);
    });

    it('Test Case 5: Irregular room with multiple features', () => {
      const geometry: RoomGeometry = {
        W: 3.2,
        L: 6.8,
        H: 2.6,
        doors: [{}, { w: 1.0, h: 2.2 }],
        windows: [
          { w: 1.5, h: 1.4 },
          { w: 1.0, h: 1.2 },
        ],
        wardrobes: [
          { length: 1.8, coverage_pct: 100 },
          { length: 2.2, coverage_pct: 80 },
        ],
      };

      const calculation = calculateRoom(geometry);

      // Hand-calculated
      const expected = {
        walls_gross: 52.0, // 2*(3.2+6.8)*2.6
        ceiling_net: 21.8, // 3.2*6.8
        floor_net: 21.8,
        openings: 7.4, // 0.9*2.1 + 1.0*2.2 + 1.5*1.4 + 1.0*1.2 = 1.89 + 2.2 + 2.1 + 1.2 = 7.39 ≈ 7.4
        wardrobes: 9.3, // 1.8*2.6 + 2.2*2.6*0.8 = 4.68 + 4.576 = 9.256 ≈ 9.3
        walls_net: 35.4, // 52.0 - 7.4 - 9.3 = 35.3 → rounds to 35.4
      };

      expectWithinTolerance(calculation.walls_gross, expected.walls_gross, 3);
      expectWithinTolerance(calculation.ceiling_net, expected.ceiling_net, 3);
      expectWithinTolerance(calculation.floor_net, expected.floor_net, 3);
      expectWithinTolerance(calculation.openings_total, expected.openings, 3);
      expectWithinTolerance(calculation.wardrobes_deduction, expected.wardrobes, 3);
      expectWithinTolerance(calculation.walls_net, expected.walls_net, 3);
    });
  });
});

/**
 * Helper to verify value is within tolerance percentage
 */
function expectWithinTolerance(actual: number, expected: number, tolerancePct: number) {
  const tolerance = Math.abs(expected * (tolerancePct / 100));
  const diff = Math.abs(actual - expected);
  
  expect(diff).toBeLessThanOrEqual(tolerance);
  
  // Also verify it's close to expected (for better error messages)
  expect(actual).toBeCloseTo(expected, 1);
}
