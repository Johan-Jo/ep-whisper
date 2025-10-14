#!/usr/bin/env ts-node

/**
 * CLI tool for importing and validating Excel MEPS catalog
 *
 * Usage:
 *   ts-node scripts/import-excel.ts <path-to-excel-file>
 *   npm run import-excel -- <path-to-excel-file>
 */

import { parseExcelFile, getCatalog } from '../src/lib/excel';
import * as path from 'path';
import * as fs from 'fs';

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

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    log('Usage: ts-node scripts/import-excel.ts <path-to-excel-file>', 'red');
    log('Example: ts-node scripts/import-excel.ts ../excel/painting-catalog.xlsx', 'cyan');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    log(`❌ File not found: ${filePath}`, 'red');
    process.exit(1);
  }

  log(`\n📊 Importing Excel file: ${filePath}`, 'cyan');
  log('━'.repeat(80), 'cyan');

  const startTime = Date.now();

  try {
    // Parse and validate the file
    const result = await parseExcelFile(filePath);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (result.success && result.data) {
      log(`\n✅ Import successful in ${duration}s`, 'green');
      log(`\n📈 Validation Summary:`, 'cyan');
      log(`   Total rows parsed: ${result.data.length}`, 'green');
      log(`   Errors: ${result.errors.length}`, result.errors.length > 0 ? 'yellow' : 'green');

      // Load into catalog
      const catalog = getCatalog();
      await catalog.loadFromFile(filePath);

      const stats = catalog.getStats();
      log(`\n📚 Catalog Statistics:`, 'cyan');
      log(`   Total tasks: ${stats.totalTasks}`, 'blue');
      log(`   By unit:`, 'blue');
      log(`     - m² (area):       ${stats.tasksByUnit.m2}`, 'blue');
      log(`     - lpm (length):    ${stats.tasksByUnit.lpm}`, 'blue');
      log(`     - st (pieces):     ${stats.tasksByUnit.st}`, 'blue');
      log(`   By surface type:`, 'blue');
      log(`     - vägg (walls):    ${stats.tasksBySurfaceType.vägg}`, 'blue');
      log(`     - tak (ceiling):   ${stats.tasksBySurfaceType.tak}`, 'blue');
      log(`     - dörr (doors):    ${stats.tasksBySurfaceType.dörr}`, 'blue');
      log(`     - fönster (windows): ${stats.tasksBySurfaceType.fönster}`, 'blue');
      log(`     - list (trim):     ${stats.tasksBySurfaceType.list}`, 'blue');

      // Display sample tasks
      log(`\n📋 Sample Tasks (first 5):`, 'cyan');
      const sampleTasks = catalog.getAllTasks().slice(0, 5);
      for (const task of sampleTasks) {
        log(
          `   ${task.meps_id} | ${task.task_name_sv} | ${task.unit} | ${task.labor_norm_per_unit}h`,
          'blue'
        );
      }

      if (result.errors.length > 0) {
        log(`\n⚠️  Validation Warnings (${result.errors.length}):`, 'yellow');
        for (const error of result.errors.slice(0, 10)) {
          log(`   Row ${error.row}: ${error.message}`, 'yellow');
          if (error.field) {
            log(`     Field: ${error.field}`, 'yellow');
          }
          if (error.value !== undefined) {
            log(`     Value: ${JSON.stringify(error.value)}`, 'yellow');
          }
        }

        if (result.errors.length > 10) {
          log(`   ... and ${result.errors.length - 10} more warnings`, 'yellow');
        }
      }

      log(`\n✅ Catalog loaded successfully!`, 'green');
      log(`━`.repeat(80), 'cyan');
    } else {
      log(`\n❌ Import failed in ${duration}s`, 'red');
      log(`\n🚨 Validation Errors (${result.errors.length}):`, 'red');

      for (const error of result.errors.slice(0, 20)) {
        log(`   Row ${error.row}: ${error.message}`, 'red');
        if (error.field) {
          log(`     Field: ${error.field}`, 'red');
        }
        if (error.value !== undefined) {
          log(`     Value: ${JSON.stringify(error.value)}`, 'red');
        }
      }

      if (result.errors.length > 20) {
        log(`   ... and ${result.errors.length - 20} more errors`, 'red');
      }

      log(`\n💡 Common issues:`, 'yellow');
      log(`   - Missing required columns: meps_id, task_name_sv, unit, labor_norm_per_unit`,'yellow');
      log(`   - Invalid unit values (must be: m2, lpm, or st)`, 'yellow');
      log(`   - Missing or negative labor_norm_per_unit values`, 'yellow');
      log(`   - Use comma (,) for Swedish decimal format`, 'yellow');
      log(`━`.repeat(80), 'cyan');

      process.exit(1);
    }
  } catch (error) {
    log(`\n❌ Unexpected error:`, 'red');
    log(`   ${error instanceof Error ? error.message : 'Unknown error'}`, 'red');
    if (error instanceof Error && error.stack) {
      log(`\n📋 Stack trace:`, 'yellow');
      log(error.stack, 'yellow');
    }
    process.exit(1);
  }
}

main();
