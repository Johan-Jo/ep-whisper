import { describe, it, expect } from 'vitest';
import {
  calculateWallsGross,
  calculateCeilingGross,
  calculateFloorGross,
  calculateOpeningsTotal,
  calculateWardrobesDeduction,
  calculateWallsNet,
  calculateCeilingNet,
  calculateFloorNet,
  calculatePerimeter,
  roundArea,
  roundLength,
  roundPieces,
  calculateRoom,
  validateGeometry,
} from '../../lib/geometry/calculator';
import { RoomGeometry } from '../../lib/types';

describe('Geometry Calculator', () => {
  describe('Basic Area Calculations', () => {
    it('should calculate gross wall area: 2*(W+L)*H', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [],
        windows: [],
        wardrobes: [],
      };

      const result = calculateWallsGross(geometry);
      expect(result).toBe(2 * (4 + 5) * 2.5); // 45
    });

    it('should calculate gross ceiling area: W*L', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [],
        windows: [],
        wardrobes: [],
      };

      const result = calculateCeilingGross(geometry);
      expect(result).toBe(4 * 5); // 20
    });

    it('should calculate gross floor area: W*L', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [],
        windows: [],
        wardrobes: [],
      };

      const result = calculateFloorGross(geometry);
      expect(result).toBe(4 * 5); // 20
    });

    it('should calculate room perimeter: 2*(W+L)', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [],
        windows: [],
        wardrobes: [],
      };

      const result = calculatePerimeter(geometry);
      expect(result).toBe(2 * (4 + 5)); // 18
    });
  });

  describe('Opening Deductions', () => {
    it('should calculate standard door opening (0.9m × 2.1m)', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [{}], // Default door
        windows: [],
        wardrobes: [],
      };

      const result = calculateOpeningsTotal(geometry);
      expect(result).toBe(0.9 * 2.1); // 1.89
    });

    it('should calculate custom door dimensions', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [{ w: 1.0, h: 2.3 }],
        windows: [],
        wardrobes: [],
      };

      const result = calculateOpeningsTotal(geometry);
      expect(result).toBe(1.0 * 2.3); // 2.3
    });

    it('should calculate door with two sides', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [{ sides: 2 }],
        windows: [],
        wardrobes: [],
      };

      const result = calculateOpeningsTotal(geometry);
      expect(result).toBe(0.9 * 2.1 * 2); // 3.78
    });

    it('should calculate window openings', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [],
        windows: [{ w: 1.2, h: 1.5 }],
        wardrobes: [],
      };

      const result = calculateOpeningsTotal(geometry);
      expect(result).toBe(1.2 * 1.5); // 1.8
    });

    it('should sum multiple doors and windows', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [{}, { w: 1.0, h: 2.0 }],
        windows: [
          { w: 1.2, h: 1.5 },
          { w: 0.8, h: 1.0 },
        ],
        wardrobes: [],
      };

      const result = calculateOpeningsTotal(geometry);
      const expected = 0.9 * 2.1 + 1.0 * 2.0 + 1.2 * 1.5 + 0.8 * 1.0;
      expect(result).toBeCloseTo(expected, 2);
    });
  });

  describe('Wardrobe Deductions', () => {
    it('should calculate wardrobe deduction with default 100% coverage', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [],
        windows: [],
        wardrobes: [{ length: 2.0 }],
      };

      const result = calculateWardrobesDeduction(geometry);
      expect(result).toBe(2.0 * 2.5 * 1.0); // 5.0
    });

    it('should calculate wardrobe deduction with custom coverage', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [],
        windows: [],
        wardrobes: [{ length: 2.0, coverage_pct: 80 }],
      };

      const result = calculateWardrobesDeduction(geometry);
      expect(result).toBe(2.0 * 2.5 * 0.8); // 4.0
    });

    it('should sum multiple wardrobes', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [],
        windows: [],
        wardrobes: [{ length: 2.0 }, { length: 1.5, coverage_pct: 50 }],
      };

      const result = calculateWardrobesDeduction(geometry);
      const expected = 2.0 * 2.5 * 1.0 + 1.5 * 2.5 * 0.5;
      expect(result).toBeCloseTo(expected, 2);
    });
  });

  describe('Net Area Calculations', () => {
    it('should calculate net walls: gross - openings - wardrobes', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [{}],
        windows: [{ w: 1.2, h: 1.5 }],
        wardrobes: [{ length: 2.0 }],
      };

      const gross = calculateWallsGross(geometry); // 45
      const openings = calculateOpeningsTotal(geometry); // 1.89 + 1.8
      const wardrobes = calculateWardrobesDeduction(geometry); // 5.0
      const net = calculateWallsNet(geometry);

      expect(net).toBeCloseTo(gross - openings - wardrobes, 2);
    });

    it('should guard against negative net area (minimum 0)', () => {
      const geometry: RoomGeometry = {
        W: 1,
        L: 1,
        H: 1,
        doors: [{ w: 10, h: 10 }], // Impossibly large door
        windows: [],
        wardrobes: [],
      };

      const net = calculateWallsNet(geometry);
      expect(net).toBe(0);
    });

    it('should calculate ceiling net (no deductions in MVP)', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [],
        windows: [],
        wardrobes: [],
      };

      const gross = calculateCeilingGross(geometry);
      const net = calculateCeilingNet(geometry);

      expect(net).toBe(gross);
    });

    it('should calculate floor net (no deductions in MVP)', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [],
        windows: [],
        wardrobes: [],
      };

      const gross = calculateFloorGross(geometry);
      const net = calculateFloorNet(geometry);

      expect(net).toBe(gross);
      expect(net).toBe(20); // W*L = 4*5
    });
  });

  describe('Rounding Rules', () => {
    it('should round areas to 0.1 m² precision', () => {
      expect(roundArea(10.123)).toBe(10.1);
      expect(roundArea(10.156)).toBe(10.2);
      expect(roundArea(10.05)).toBe(10.1);
      expect(roundArea(10.04)).toBe(10.0);
    });

    it('should round lengths to 0.1 lpm precision', () => {
      expect(roundLength(5.123)).toBe(5.1);
      expect(roundLength(5.156)).toBe(5.2);
      expect(roundLength(5.05)).toBe(5.1);
      expect(roundLength(5.04)).toBe(5.0);
    });

    it('should round pieces to integers', () => {
      expect(roundPieces(3.2)).toBe(3);
      expect(roundPieces(3.6)).toBe(4);
      expect(roundPieces(3.5)).toBe(4);
    });
  });

  describe('PRD §12 Golden File Test', () => {
    it('should match PRD example: W=2, L=5, H=2.5, 1 door, 1 window', () => {
      // From PRD §12 example
      const geometry: RoomGeometry = {
        W: 2,
        L: 5,
        H: 2.5,
        doors: [{}], // Standard door 0.9×2.1m
        windows: [{ w: 1.2, h: 1.2 }],
        wardrobes: [],
      };

      const calculation = calculateRoom(geometry);

      // Expected values from PRD
      // walls_gross = 2*(2+5)*2.5 = 35m²
      // openings = 0.9*2.1 + 1.2*1.2 = 1.89 + 1.44 = 3.33m²
      // walls_net = 35 - 3.33 = 31.67 ≈ 31.7m²
      
      expect(calculation.walls_gross).toBe(35.0);
      expect(calculation.ceiling_gross).toBe(10.0);
      expect(calculation.ceiling_net).toBe(10.0);
      expect(calculation.floor_gross).toBe(10.0);
      expect(calculation.floor_net).toBe(10.0);
      expect(calculation.openings_total).toBeCloseTo(3.3, 1);
      
      // Walls net should be walls_gross - openings_total - wardrobes_deduction
      const expectedWallsNet = 35.0 - 3.3 - 0;
      expect(calculation.walls_net).toBeCloseTo(expectedWallsNet, 1);
    });

    it('should match PRD expected ceiling and floor: 10.0m² each', () => {
      const geometry: RoomGeometry = {
        W: 2,
        L: 5,
        H: 2.5,
        doors: [],
        windows: [],
        wardrobes: [],
      };

      const calculation = calculateRoom(geometry);
      expect(calculation.ceiling_net).toBe(10.0);
      expect(calculation.floor_net).toBe(10.0);
    });
  });

  describe('Complete Room Calculation', () => {
    it('should return all calculated values rounded correctly', () => {
      const geometry: RoomGeometry = {
        W: 3.7,
        L: 4.3,
        H: 2.6,
        doors: [{}],
        windows: [{ w: 1.1, h: 1.3 }],
        wardrobes: [{ length: 1.5, coverage_pct: 80 }],
      };

      const calculation = calculateRoom(geometry);

      // All values should be numbers
      expect(typeof calculation.walls_gross).toBe('number');
      expect(typeof calculation.walls_net).toBe('number');
      expect(typeof calculation.ceiling_gross).toBe('number');
      expect(typeof calculation.ceiling_net).toBe('number');
      expect(typeof calculation.floor_gross).toBe('number');
      expect(typeof calculation.floor_net).toBe('number');
      expect(typeof calculation.openings_total).toBe('number');
      expect(typeof calculation.wardrobes_deduction).toBe('number');

      // All values should have at most 1 decimal place (rounded to 0.1)
      expect(calculation.walls_gross).toBe(Number(calculation.walls_gross.toFixed(1)));
      expect(calculation.walls_net).toBe(Number(calculation.walls_net.toFixed(1)));
      expect(calculation.ceiling_gross).toBe(Number(calculation.ceiling_gross.toFixed(1)));
      expect(calculation.ceiling_net).toBe(Number(calculation.ceiling_net.toFixed(1)));
      expect(calculation.floor_gross).toBe(Number(calculation.floor_gross.toFixed(1)));
      expect(calculation.floor_net).toBe(Number(calculation.floor_net.toFixed(1)));
    });
  });

  describe('Geometry Validation', () => {
    it('should validate positive dimensions', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [],
        windows: [],
        wardrobes: [],
      };

      const result = validateGeometry(geometry);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject zero or negative dimensions', () => {
      const geometry: RoomGeometry = {
        W: 0,
        L: -1,
        H: 2.5,
        doors: [],
        windows: [],
        wardrobes: [],
      };

      const result = validateGeometry(geometry);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject unreasonably large dimensions', () => {
      const geometry: RoomGeometry = {
        W: 150,
        L: 5,
        H: 2.5,
        doors: [],
        windows: [],
        wardrobes: [],
      };

      const result = validateGeometry(geometry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Width'))).toBe(true);
    });

    it('should validate opening dimensions', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [{ w: -1, h: 2.0 }],
        windows: [{ w: 1.2, h: 0 }],
        wardrobes: [],
      };

      const result = validateGeometry(geometry);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate wardrobe coverage percentage', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [],
        windows: [],
        wardrobes: [{ length: 2.0, coverage_pct: 150 }],
      };

      const result = validateGeometry(geometry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('coverage'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle room with no openings', () => {
      const geometry: RoomGeometry = {
        W: 4,
        L: 5,
        H: 2.5,
        doors: [],
        windows: [],
        wardrobes: [],
      };

      const calculation = calculateRoom(geometry);
      expect(calculation.openings_total).toBe(0);
      expect(calculation.walls_net).toBe(calculation.walls_gross);
    });

    it('should handle very small room', () => {
      const geometry: RoomGeometry = {
        W: 0.5,
        L: 0.5,
        H: 2.0,
        doors: [],
        windows: [],
        wardrobes: [],
      };

      const calculation = calculateRoom(geometry);
      expect(calculation.walls_gross).toBeGreaterThan(0);
      expect(calculation.ceiling_gross).toBeGreaterThan(0);
    });

    it('should handle room with many openings', () => {
      const geometry: RoomGeometry = {
        W: 8,
        L: 10,
        H: 3,
        doors: [{}, {}, {}],
        windows: Array(10).fill({ w: 1.0, h: 1.0 }),
        wardrobes: [],
      };

      const calculation = calculateRoom(geometry);
      expect(calculation.openings_total).toBeGreaterThan(0);
      expect(calculation.walls_net).toBeGreaterThanOrEqual(0);
    });
  });
});
