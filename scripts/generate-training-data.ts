#!/usr/bin/env tsx

/**
 * Generate Swedish training data for voice recognition and intent parsing
 * 
 * Usage:
 *   tsx scripts/generate-training-data.ts [options]
 * 
 * Options:
 *   --catalog <path>     Path to MEPS Excel catalog file
 *   --output <dir>       Output directory for training data
 *   --format <format>    Output format: json, csv, or both (default: both)
 *   --phrases <number>   Number of phrases per task (default: 15)
 *   --mall <id>          Generate for specific mall instance only
 *   --tasks <ids>        Comma-separated list of task IDs (use with --mall)
 *   --stats              Show catalog statistics only
 *   --list               List all available tasks
 */

import { TrainingDataCLI } from '../src/lib/training';
import path from 'path';
import fs from 'fs';

interface CLIArgs {
  catalog?: string;
  output?: string;
  format?: 'json' | 'csv' | 'both';
  phrases?: number;
  mall?: string;
  tasks?: string;
  stats?: boolean;
  list?: boolean;
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {};
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    switch (arg) {
      case '--catalog':
        args.catalog = process.argv[++i];
        break;
      case '--output':
        args.output = process.argv[++i];
        break;
      case '--format':
        const format = process.argv[++i];
        if (format === 'json' || format === 'csv' || format === 'both') {
          args.format = format;
        } else {
          console.error(`Invalid format: ${format}. Must be json, csv, or both.`);
          process.exit(1);
        }
        break;
      case '--phrases':
        args.phrases = parseInt(process.argv[++i]);
        if (isNaN(args.phrases)) {
          console.error(`Invalid phrases count: ${process.argv[i]}`);
          process.exit(1);
        }
        break;
      case '--mall':
        args.mall = process.argv[++i];
        break;
      case '--tasks':
        args.tasks = process.argv[++i];
        break;
      case '--stats':
        args.stats = true;
        break;
      case '--list':
        args.list = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        showHelp();
        process.exit(1);
    }
  }
  
  return args;
}

function showHelp(): void {
  console.log(`
Generate Swedish training data for voice recognition and intent parsing

Usage:
  tsx scripts/generate-training-data.ts [options]

Options:
  --catalog <path>     Path to MEPS Excel catalog file (required)
  --output <dir>       Output directory for training data (default: ./training-data)
  --format <format>    Output format: json, csv, or both (default: both)
  --phrases <number>   Number of phrases per task (default: 15)
  --mall <id>          Generate for specific mall instance only
  --tasks <ids>        Comma-separated list of task IDs (use with --mall)
  --stats              Show catalog statistics only
  --list               List all available tasks
  --help, -h           Show this help message

Examples:
  # Generate training data for all tasks
  tsx scripts/generate-training-data.ts --catalog data/meps-catalog.xlsx

  # Generate for specific mall with custom output
  tsx scripts/generate-training-data.ts --catalog data/meps-catalog.xlsx --mall wall_tasks --output ./my-training-data

  # Generate CSV only with more phrases per task
  tsx scripts/generate-training-data.ts --catalog data/meps-catalog.xlsx --format csv --phrases 25

  # Show catalog statistics
  tsx scripts/generate-training-data.ts --catalog data/meps-catalog.xlsx --stats

  # List all available tasks
  tsx scripts/generate-training-data.ts --catalog data/meps-catalog.xlsx --list
`);
}

async function main(): Promise<void> {
  const args = parseArgs();
  
  if (!args.catalog) {
    console.error('Error: --catalog argument is required');
    showHelp();
    process.exit(1);
  }
  
  // Check if catalog file exists
  if (!fs.existsSync(args.catalog)) {
    console.error(`Error: Catalog file not found: ${args.catalog}`);
    process.exit(1);
  }
  
  // Create output directory if it doesn't exist
  const outputDir = args.output || './training-data';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }
  
  try {
    const cli = new TrainingDataCLI();
    
    // Load catalog
    await cli.loadCatalog(args.catalog);
    
    if (args.stats) {
      cli.showCatalogStats();
      return;
    }
    
    if (args.list) {
      cli.listTasks();
      return;
    }
    
    // Generate training data
    if (args.mall && args.tasks) {
      const taskIds = args.tasks.split(',').map(id => id.trim());
      await cli.generateForMall(args.mall, taskIds, {
        phrasesPerTask: args.phrases,
        outputFormat: args.format,
        outputDir,
      });
    } else if (args.mall) {
      console.error('Error: --mall requires --tasks to be specified');
      process.exit(1);
    } else {
      await cli.generateForAllTasks({
        phrasesPerTask: args.phrases,
        outputFormat: args.format,
        outputDir,
      });
    }
    
    console.log('\n✅ Training data generation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error generating training data:', error);
    process.exit(1);
  }
}

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
