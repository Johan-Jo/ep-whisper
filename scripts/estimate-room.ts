#!/usr/bin/env tsx

/**
 * CLI tool for generating complete room estimates
 *
 * Usage:
 *   npm run estimate-room -- examples/bedroom.json
 */

import { calculateRoom } from '../src/lib/geometry/index.js';
import { getCatalog } from '../src/lib/excel/index.js';
import {
  mapSpokenTaskToMeps,
  selectQuantityBySurface,
  calculateLineItem,
  calculateDetailedTotals,
  groupLineItemsBySection,
} from '../src/lib/pricing/index.js';
import { formatCompleteEstimate } from '../src/lib/output/index.js';
import { RoomGeometry, MepsRow } from '../src/lib/types.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EstimateInput {
  geometry: RoomGeometry;
  tasks: Array<{
    phrase: string;
    layers?: number;
  }>;
  catalogPath?: string;
}

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message: string, color?: keyof typeof COLORS) {
  const colorCode = color ? COLORS[color] : '';
  console.log(`${colorCode}${message}${COLORS.reset}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    log('Usage: npm run estimate-room -- <input-json-file>', 'red');
    log('\nExample:', 'cyan');
    log('  npm run estimate-room -- examples/bedroom.json', 'cyan');
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);

  if (!fs.existsSync(inputPath)) {
    log(`❌ File not found: ${inputPath}`, 'red');
    process.exit(1);
  }

  // Load input
  const inputData: EstimateInput = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  // Load catalog
  const catalogPath = inputData.catalogPath || path.resolve(__dirname, '../../excel/painting-catalog-sample.xlsx');
  
  log(`\n📊 Loading catalog: ${catalogPath}`, 'cyan');
  const catalog = getCatalog();
  const loadResult = await catalog.loadFromFile(catalogPath);

  if (!loadResult.success) {
    log('❌ Failed to load catalog', 'red');
    for (const error of loadResult.errors.slice(0, 5)) {
      log(`   ${error.message}`, 'red');
    }
    process.exit(1);
  }

  log(`✅ Catalog loaded: ${catalog.getStats().totalTasks} tasks`, 'green');

  // Calculate geometry
  const calculation = calculateRoom(inputData.geometry);

  // Map tasks and calculate line items
  const tasksWithQuantities: Array<{ task: MepsRow; quantity: number; layers: number }> = [];
  const lineItems: any[] = [];

  log(`\n🔍 Mapping tasks...`, 'cyan');

  for (const taskInput of inputData.tasks) {
    const result = mapSpokenTaskToMeps(taskInput.phrase, catalog);

    if (!result.task) {
      log(`⚠️  Could not map: "${taskInput.phrase}"`, 'yellow');
      log(`   Guard-rail prevented hallucination - task not in Excel catalog`, 'yellow');
      continue;
    }

    const layers = taskInput.layers || result.task.default_layers || 1;
    const quantity = selectQuantityBySurface(result.task.surface_type, calculation, 1);

    if (quantity > 0) {
      tasksWithQuantities.push({
        task: result.task,
        quantity,
        layers,
      });

      const lineItem = calculateLineItem(result.task, quantity, layers);
      lineItems.push(lineItem);

      log(`✅ ${result.task.meps_id}: ${result.task.task_name_sv} (${quantity} × ${layers} layers)`, 'green');
    }
  }

  // Calculate totals
  const totals = calculateDetailedTotals(tasksWithQuantities);

  // Group by sections
  const grouped = groupLineItemsBySection(lineItems, catalog);

  // Format output
  const output = formatCompleteEstimate(
    inputData.geometry,
    calculation,
    lineItems,
    totals,
    grouped
  );

  // Display
  console.log('\n');
  console.log(output);

  // Save to file
  const outputPath = inputPath.replace('.json', '-estimate.txt');
  fs.writeFileSync(outputPath, output, 'utf-8');
  log(`\n💾 Estimate saved to: ${outputPath}`, 'green');
}

main();
