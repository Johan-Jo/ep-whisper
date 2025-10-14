#!/usr/bin/env ts-node

/**
 * CLI tool for testing room geometry calculations
 *
 * Usage:
 *   ts-node scripts/calculate-room.ts <W> <L> <H>
 *   npm run calculate-room -- 4 5 2.5
 */

import { calculateRoom, validateGeometry } from '../src/lib/geometry';
import { RoomGeometry } from '../src/lib/types';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color?: keyof typeof COLORS) {
  const colorCode = color ? COLORS[color] : '';
  console.log(`${colorCode}${message}${COLORS.reset}`);
}

function parseArgs(): RoomGeometry {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    log('Usage: npm run calculate-room -- <W> <L> <H> [options]', 'red');
    log('\nExamples:', 'cyan');
    log('  npm run calculate-room -- 4 5 2.5', 'cyan');
    log('  npm run calculate-room -- 2 5 2.5 --door --window 1.2x1.2', 'cyan');
    log('\nOptions:', 'cyan');
    log('  --door [WxH]           Add door (default: 0.9x2.1m)', 'cyan');
    log('  --door WxH --sides 2   Add double-sided door', 'cyan');
    log('  --window WxH           Add window (e.g., 1.2x1.5)', 'cyan');
    log('  --wardrobe L [pct]     Add wardrobe (length and optional coverage%)', 'cyan');
    process.exit(1);
  }

  const W = parseFloat(args[0]);
  const L = parseFloat(args[1]);
  const H = parseFloat(args[2]);

  if (isNaN(W) || isNaN(L) || isNaN(H)) {
    log('❌ Invalid dimensions. W, L, and H must be numbers.', 'red');
    process.exit(1);
  }

  const geometry: RoomGeometry = {
    W,
    L,
    H,
    doors: [],
    windows: [],
    wardrobes: [],
  };

  // Parse optional flags
  for (let i = 3; i < args.length; i++) {
    if (args[i] === '--door') {
      const nextArg = args[i + 1];
      if (nextArg && nextArg.includes('x')) {
        const [w, h] = nextArg.split('x').map(parseFloat);
        geometry.doors.push({ w, h });
        i++;
      } else {
        geometry.doors.push({});
      }
    } else if (args[i] === '--window') {
      const nextArg = args[i + 1];
      if (nextArg && nextArg.includes('x')) {
        const [w, h] = nextArg.split('x').map(parseFloat);
        geometry.windows.push({ w, h });
        i++;
      } else {
        log('❌ --window requires dimensions (e.g., 1.2x1.5)', 'red');
        process.exit(1);
      }
    } else if (args[i] === '--wardrobe') {
      const length = parseFloat(args[i + 1]);
      const coverage_pct = args[i + 2] && !args[i + 2].startsWith('--') 
        ? parseFloat(args[i + 2]) 
        : undefined;
      
      if (isNaN(length)) {
        log('❌ --wardrobe requires length (e.g., --wardrobe 2 80)', 'red');
        process.exit(1);
      }
      
      geometry.wardrobes.push({ length, coverage_pct });
      i += coverage_pct !== undefined ? 2 : 1;
    }
  }

  return geometry;
}

function main() {
  log('\n📐 Room Geometry Calculator\n', 'cyan');

  const geometry = parseArgs();

  // Validate geometry
  const validation = validateGeometry(geometry);
  if (!validation.valid) {
    log('❌ Invalid geometry:', 'red');
    for (const error of validation.errors) {
      log(`   ${error}`, 'red');
    }
    process.exit(1);
  }

  // Display input
  log('📊 Input Dimensions:', 'cyan');
  log(`   Width:  ${geometry.W}m`, 'blue');
  log(`   Length: ${geometry.L}m`, 'blue');
  log(`   Height: ${geometry.H}m`, 'blue');

  if (geometry.doors.length > 0) {
    log(`   Doors:  ${geometry.doors.length}`, 'blue');
    geometry.doors.forEach((door, i) => {
      const w = door.w ?? 0.9;
      const h = door.h ?? 2.1;
      const sides = door.sides ?? 1;
      log(`     ${i + 1}. ${w}m × ${h}m ${sides === 2 ? '(both sides)' : ''}`, 'blue');
    });
  }

  if (geometry.windows.length > 0) {
    log(`   Windows: ${geometry.windows.length}`, 'blue');
    geometry.windows.forEach((window, i) => {
      log(`     ${i + 1}. ${window.w}m × ${window.h}m`, 'blue');
    });
  }

  if (geometry.wardrobes.length > 0) {
    log(`   Wardrobes: ${geometry.wardrobes.length}`, 'blue');
    geometry.wardrobes.forEach((wardrobe, i) => {
      const coverage = wardrobe.coverage_pct ?? 100;
      log(`     ${i + 1}. ${wardrobe.length}m length (${coverage}% coverage)`, 'blue');
    });
  }

  // Calculate
  const calculation = calculateRoom(geometry);

  // Display results
  log('\n✅ Calculated Areas:', 'cyan');
  log(`   Walls (gross):  ${calculation.walls_gross.toFixed(1)}m²`, 'green');
  log(`   Walls (net):    ${calculation.walls_net.toFixed(1)}m²`, 'green');
  log(`   Ceiling:        ${calculation.ceiling_net.toFixed(1)}m²`, 'green');
  
  log('\n📏 Deductions:', 'cyan');
  log(`   Openings:       ${calculation.openings_total.toFixed(1)}m²`, 'yellow');
  log(`   Wardrobes:      ${calculation.wardrobes_deduction.toFixed(1)}m²`, 'yellow');

  log('\n🎯 Summary:', 'cyan');
  log(`   Total paintable walls:   ${calculation.walls_net.toFixed(1)}m²`, 'magenta');
  log(`   Total paintable ceiling: ${calculation.ceiling_net.toFixed(1)}m²`, 'magenta');
  log(`   Room perimeter (trim):   ${(2 * (geometry.W + geometry.L)).toFixed(1)}lpm`, 'magenta');

  // Swedish decimal format
  log('\n🇸🇪 Swedish Format:', 'cyan');
  log(`   Väggar:  ${calculation.walls_net.toFixed(1).replace('.', ',')}m²`, 'blue');
  log(`   Tak:     ${calculation.ceiling_net.toFixed(1).replace('.', ',')}m²`, 'blue');
  
  log('');
}

main();
