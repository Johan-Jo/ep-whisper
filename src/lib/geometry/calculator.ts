import { RoomGeometry, RoomCalculation } from '../types';

/**
 * Calculate gross wall area (before deductions)
 * Formula: 2 * (W + L) * H
 */
export function calculateWallsGross(geometry: RoomGeometry): number {
  const { W, L, H } = geometry;
  return 2 * (W + L) * H;
}

/**
 * Calculate gross ceiling area (before deductions)
 * Formula: W * L
 */
export function calculateCeilingGross(geometry: RoomGeometry): number {
  const { W, L } = geometry;
  return W * L;
}

/**
 * Calculate total opening deductions (doors + windows)
 */
export function calculateOpeningsTotal(geometry: RoomGeometry): number {
  let total = 0;

  // Calculate door openings
  for (const door of geometry.doors) {
    const width = door.w ?? 0.9; // Default door width: 0.9m
    const height = door.h ?? 2.1; // Default door height: 2.1m
    const sides = door.sides ?? 1; // Default: one side

    total += width * height * sides;
  }

  // Calculate window openings
  for (const window of geometry.windows) {
    total += window.w * window.h;
  }

  return total;
}

/**
 * Calculate wardrobe coverage deduction
 * Assumes wardrobes cover portions of wall from floor to ceiling
 */
export function calculateWardrobesDeduction(geometry: RoomGeometry): number {
  let total = 0;

  for (const wardrobe of geometry.wardrobes) {
    const coveragePct = wardrobe.coverage_pct ?? 100; // Default: 100% coverage
    const area = wardrobe.length * geometry.H * (coveragePct / 100);
    total += area;
  }

  return total;
}

/**
 * Calculate net wall area (after all deductions)
 * Formula: walls_gross - openings - wardrobes
 * Guards against negative values (returns 0 minimum)
 */
export function calculateWallsNet(geometry: RoomGeometry): number {
  const gross = calculateWallsGross(geometry);
  const openings = calculateOpeningsTotal(geometry);
  const wardrobes = calculateWardrobesDeduction(geometry);

  const net = gross - openings - wardrobes;
  return Math.max(0, net);
}

/**
 * Calculate net ceiling area
 * For MVP, ceiling has no deductions (no skylights)
 */
export function calculateCeilingNet(geometry: RoomGeometry): number {
  return calculateCeilingGross(geometry);
}

/**
 * Calculate room perimeter for trim/list calculations
 * Formula: 2 * (W + L)
 */
export function calculatePerimeter(geometry: RoomGeometry): number {
  const { W, L } = geometry;
  return 2 * (W + L);
}

/**
 * Round area to 0.1 m² precision
 */
export function roundArea(area: number): number {
  return Math.round(area * 10) / 10;
}

/**
 * Round length to 0.1 lpm precision
 */
export function roundLength(length: number): number {
  return Math.round(length * 10) / 10;
}

/**
 * Round pieces to integer
 */
export function roundPieces(pieces: number): number {
  return Math.round(pieces);
}

/**
 * Calculate complete room dimensions with all areas
 * Returns rounded values according to specification
 */
export function calculateRoom(geometry: RoomGeometry): RoomCalculation {
  const walls_gross = calculateWallsGross(geometry);
  const ceiling_gross = calculateCeilingGross(geometry);
  const openings_total = calculateOpeningsTotal(geometry);
  const wardrobes_deduction = calculateWardrobesDeduction(geometry);
  const walls_net = calculateWallsNet(geometry);
  const ceiling_net = calculateCeilingNet(geometry);

  return {
    walls_gross: roundArea(walls_gross),
    walls_net: roundArea(walls_net),
    ceiling_gross: roundArea(ceiling_gross),
    ceiling_net: roundArea(ceiling_net),
    openings_total: roundArea(openings_total),
    wardrobes_deduction: roundArea(wardrobes_deduction),
  };
}

/**
 * Validate room geometry for reasonable values
 */
export function validateGeometry(geometry: RoomGeometry): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate dimensions are positive
  if (geometry.W <= 0) errors.push('Width (W) must be positive');
  if (geometry.L <= 0) errors.push('Length (L) must be positive');
  if (geometry.H <= 0) errors.push('Height (H) must be positive');

  // Validate reasonable ranges (basic sanity checks)
  if (geometry.W > 100) errors.push('Width (W) exceeds reasonable limit (100m)');
  if (geometry.L > 100) errors.push('Length (L) exceeds reasonable limit (100m)');
  if (geometry.H > 10) errors.push('Height (H) exceeds reasonable limit (10m)');

  // Validate openings
  for (let i = 0; i < geometry.doors.length; i++) {
    const door = geometry.doors[i];
    if (door.w && door.w <= 0) errors.push(`Door ${i + 1}: width must be positive`);
    if (door.h && door.h <= 0) errors.push(`Door ${i + 1}: height must be positive`);
  }

  for (let i = 0; i < geometry.windows.length; i++) {
    const window = geometry.windows[i];
    if (window.w <= 0) errors.push(`Window ${i + 1}: width must be positive`);
    if (window.h <= 0) errors.push(`Window ${i + 1}: height must be positive`);
  }

  // Validate wardrobes
  for (let i = 0; i < geometry.wardrobes.length; i++) {
    const wardrobe = geometry.wardrobes[i];
    if (wardrobe.length <= 0) errors.push(`Wardrobe ${i + 1}: length must be positive`);
    if (wardrobe.coverage_pct !== undefined) {
      if (wardrobe.coverage_pct < 0 || wardrobe.coverage_pct > 100) {
        errors.push(`Wardrobe ${i + 1}: coverage must be between 0-100%`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
