#!/usr/bin/env ts-node

/**
 * Generate sample Excel catalog with Swedish painting tasks
 *
 * Usage:
 *   ts-node scripts/generate-sample-excel.ts [output-path]
 */

import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAMPLE_TASKS = [
  // Vägg (wall) tasks - m2
  {
    meps_id: 'MÅL-VÄGG-SPACK-BRED-M2',
    task_name_sv: 'Bredspackla väggar',
    task_name_en: 'Wall broad spackling',
    unit: 'm2',
    labor_norm_per_unit: 0.15,
    material_factor_per_unit: 0.5,
    surface_type: 'vägg',
    prep_required: true,
    synonyms: 'spackla väggar;bredspackling vägg;vägg bredspackla',
    price_labor_per_hour: 500,
    price_material_per_unit: 25,
  },
  {
    meps_id: 'MÅL-VÄGG-GRUNDMÅL-M2',
    task_name_sv: 'Grundmåla väggar',
    task_name_en: 'Prime walls',
    unit: 'm2',
    labor_norm_per_unit: 0.08,
    material_factor_per_unit: 0.12,
    default_layers: 1,
    surface_type: 'vägg',
    synonyms: 'grundmåla;primer vägg',
    price_labor_per_hour: 500,
    price_material_per_unit: 15,
  },
  {
    meps_id: 'MÅL-VÄGG-TÄCKMÅL-M2',
    task_name_sv: 'Täckmåla väggar',
    task_name_en: 'Paint walls (top coat)',
    unit: 'm2',
    labor_norm_per_unit: 0.10,
    material_factor_per_unit: 0.13,
    default_layers: 2,
    surface_type: 'vägg',
    synonyms: 'måla väggar;färg vägg;täckmåla',
    price_labor_per_hour: 500,
    price_material_per_unit: 18,
  },
  {
    meps_id: 'MÅL-VÄGG-SLIPA-M2',
    task_name_sv: 'Slipa väggar',
    task_name_en: 'Sand walls',
    unit: 'm2',
    labor_norm_per_unit: 0.12,
    material_factor_per_unit: 0.05,
    surface_type: 'vägg',
    prep_required: true,
    synonyms: 'slipning vägg;finsand vägg',
    price_labor_per_hour: 500,
    price_material_per_unit: 8,
  },
  
  // Tak (ceiling) tasks - m2
  {
    meps_id: 'MÅL-TAK-SPACK-BRED-M2',
    task_name_sv: 'Bredspackla tak',
    task_name_en: 'Ceiling broad spackling',
    unit: 'm2',
    labor_norm_per_unit: 0.18,
    material_factor_per_unit: 0.5,
    surface_type: 'tak',
    prep_required: true,
    synonyms: 'spackla tak;bredspackling tak;tak bredspackla',
    price_labor_per_hour: 500,
    price_material_per_unit: 25,
  },
  {
    meps_id: 'MÅL-TAK-GRUNDMÅL-M2',
    task_name_sv: 'Grundmåla tak',
    task_name_en: 'Prime ceiling',
    unit: 'm2',
    labor_norm_per_unit: 0.10,
    material_factor_per_unit: 0.12,
    default_layers: 1,
    surface_type: 'tak',
    synonyms: 'grundmåla tak;primer tak',
    price_labor_per_hour: 500,
    price_material_per_unit: 15,
  },
  {
    meps_id: 'MÅL-TAK-TÄCKMÅL-M2',
    task_name_sv: 'Täckmåla tak',
    task_name_en: 'Paint ceiling (top coat)',
    unit: 'm2',
    labor_norm_per_unit: 0.12,
    material_factor_per_unit: 0.13,
    default_layers: 2,
    surface_type: 'tak',
    synonyms: 'måla tak;färg tak;täckmåla tak',
    price_labor_per_hour: 500,
    price_material_per_unit: 18,
  },
  
  // Golv (floor) tasks - m2
  {
    meps_id: 'MÅL-GOLV-BETONG-M2',
    task_name_sv: 'Måla betonggolv',
    task_name_en: 'Paint concrete floor',
    unit: 'm2',
    labor_norm_per_unit: 0.13,
    material_factor_per_unit: 0.15,
    default_layers: 2,
    surface_type: 'golv',
    synonyms: 'golv betong;betonggolv;golvmålning',
    price_labor_per_hour: 500,
    price_material_per_unit: 22,
  },
  {
    meps_id: 'MÅL-GOLV-TRÄ-M2',
    task_name_sv: 'Måla trägolv',
    task_name_en: 'Paint wooden floor',
    unit: 'm2',
    labor_norm_per_unit: 0.16,
    material_factor_per_unit: 0.18,
    default_layers: 2,
    surface_type: 'golv',
    synonyms: 'golv trä;trägolv;parkettmålning',
    price_labor_per_hour: 500,
    price_material_per_unit: 28,
  },
  {
    meps_id: 'MÅL-GOLV-GRUNDMÅL-M2',
    task_name_sv: 'Grundmåla golv',
    task_name_en: 'Prime floor',
    unit: 'm2',
    labor_norm_per_unit: 0.10,
    material_factor_per_unit: 0.12,
    default_layers: 1,
    surface_type: 'golv',
    synonyms: 'grundmåla golv;primer golv',
    price_labor_per_hour: 500,
    price_material_per_unit: 16,
  },
  
  // Dörr (door) tasks - st (pieces)
  {
    meps_id: 'MÅL-DÖRR-EN-SIDA-ST',
    task_name_sv: 'Måla dörr en sida',
    task_name_en: 'Paint door one side',
    unit: 'st',
    labor_norm_per_unit: 0.75,
    material_factor_per_unit: 0.08,
    default_layers: 2,
    surface_type: 'dörr',
    synonyms: 'dörr en sida;måla dörr ensida',
    price_labor_per_hour: 500,
    price_material_per_unit: 12,
  },
  {
    meps_id: 'MÅL-DÖRR-TVÅ-SIDOR-ST',
    task_name_sv: 'Måla dörr två sidor',
    task_name_en: 'Paint door both sides',
    unit: 'st',
    labor_norm_per_unit: 1.50,
    material_factor_per_unit: 0.16,
    default_layers: 2,
    surface_type: 'dörr',
    synonyms: 'dörr båda sidor;måla dörr båda;dörr två sidor',
    price_labor_per_hour: 500,
    price_material_per_unit: 24,
  },
  {
    meps_id: 'MÅL-DÖRRFODER-ST',
    task_name_sv: 'Måla dörrfoder',
    task_name_en: 'Paint door frame',
    unit: 'st',
    labor_norm_per_unit: 0.60,
    material_factor_per_unit: 0.06,
    default_layers: 2,
    surface_type: 'dörr',
    synonyms: 'dörrfoder;dörrkarmar;dörrkarm',
    price_labor_per_hour: 500,
    price_material_per_unit: 10,
  },
  
  // Fönster (window) tasks - st (pieces)
  {
    meps_id: 'MÅL-FÖNSTER-INVÄNDIGT-ST',
    task_name_sv: 'Måla fönster invändigt',
    task_name_en: 'Paint window interior',
    unit: 'st',
    labor_norm_per_unit: 1.20,
    material_factor_per_unit: 0.10,
    default_layers: 2,
    surface_type: 'fönster',
    synonyms: 'fönster inne;fönster invändigt;måla fönster',
    price_labor_per_hour: 500,
    price_material_per_unit: 15,
  },
  {
    meps_id: 'MÅL-FÖNSTERBÄNK-ST',
    task_name_sv: 'Måla fönsterbänk',
    task_name_en: 'Paint window sill',
    unit: 'st',
    labor_norm_per_unit: 0.30,
    material_factor_per_unit: 0.04,
    default_layers: 2,
    surface_type: 'fönster',
    synonyms: 'fönsterbänk;bänk fönster',
    price_labor_per_hour: 500,
    price_material_per_unit: 8,
  },
  
  // List (trim/molding) tasks - lpm (linear meters)
  {
    meps_id: 'MÅL-LIST-TAK-LPM',
    task_name_sv: 'Måla taklist',
    task_name_en: 'Paint ceiling trim',
    unit: 'lpm',
    labor_norm_per_unit: 0.08,
    material_factor_per_unit: 0.02,
    default_layers: 2,
    surface_type: 'list',
    synonyms: 'taklist;takprofil;list tak',
    price_labor_per_hour: 500,
    price_material_per_unit: 3,
  },
  {
    meps_id: 'MÅL-LIST-GOLVLIST-LPM',
    task_name_sv: 'Måla golvlist',
    task_name_en: 'Paint baseboard',
    unit: 'lpm',
    labor_norm_per_unit: 0.07,
    material_factor_per_unit: 0.02,
    default_layers: 2,
    surface_type: 'list',
    synonyms: 'golvlist;fotlist;list golv;baseboard',
    price_labor_per_hour: 500,
    price_material_per_unit: 3,
  },
  {
    meps_id: 'MÅL-LIST-FÖNSTER-LPM',
    task_name_sv: 'Måla fönsterlist',
    task_name_en: 'Paint window trim',
    unit: 'lpm',
    labor_norm_per_unit: 0.09,
    material_factor_per_unit: 0.02,
    default_layers: 2,
    surface_type: 'list',
    synonyms: 'fönsterlist;list fönster;fönsterprofil',
    price_labor_per_hour: 500,
    price_material_per_unit: 3,
  },
  
  // Additional specialty tasks
  {
    meps_id: 'MÅL-RADIATOR-ST',
    task_name_sv: 'Måla radiator',
    task_name_en: 'Paint radiator',
    unit: 'st',
    labor_norm_per_unit: 0.90,
    material_factor_per_unit: 0.12,
    default_layers: 1,
    synonyms: 'element;radiator;värmeelement',
    price_labor_per_hour: 500,
    price_material_per_unit: 18,
  },
  {
    meps_id: 'MÅL-SKÅPDÖRR-ST',
    task_name_sv: 'Måla skåpdörr',
    task_name_en: 'Paint cabinet door',
    unit: 'st',
    labor_norm_per_unit: 0.85,
    material_factor_per_unit: 0.10,
    default_layers: 2,
    synonyms: 'skåp dörr;garderobsdörr;skåpdörrar',
    price_labor_per_hour: 500,
    price_material_per_unit: 15,
  },
  {
    meps_id: 'MÅL-TRAPPA-LPM',
    task_name_sv: 'Måla trappsteg',
    task_name_en: 'Paint stair tread',
    unit: 'lpm',
    labor_norm_per_unit: 0.25,
    material_factor_per_unit: 0.05,
    default_layers: 2,
    synonyms: 'trappa;steg;trappsteg',
    price_labor_per_hour: 500,
    price_material_per_unit: 8,
  },
  {
    meps_id: 'MÅL-PANEL-M2',
    task_name_sv: 'Måla träpanel',
    task_name_en: 'Paint wood paneling',
    unit: 'm2',
    labor_norm_per_unit: 0.14,
    material_factor_per_unit: 0.15,
    default_layers: 2,
    synonyms: 'panel;träpanel;panelvägg',
    price_labor_per_hour: 500,
    price_material_per_unit: 22,
  },
  {
    meps_id: 'MÅL-VÄGG-TEXTURSPRAY-M2',
    task_name_sv: 'Texturspraya väggar',
    task_name_en: 'Texture spray walls',
    unit: 'm2',
    labor_norm_per_unit: 0.11,
    material_factor_per_unit: 0.18,
    surface_type: 'vägg',
    synonyms: 'texturspray;stänkputs;strukturfärg',
    price_labor_per_hour: 500,
    price_material_per_unit: 28,
  },
];

async function main() {
  const args = process.argv.slice(2);
  const outputPath = args[0] || path.resolve(__dirname, '../../excel/painting-catalog-sample.xlsx');

  console.log(`\n📝 Generating sample Excel catalog...`);
  console.log(`📍 Output: ${outputPath}\n`);

  // Create worksheet data with headers
  const worksheetData = [
    [
      'meps_id',
      'task_name_sv',
      'task_name_en',
      'unit',
      'labor_norm_per_unit',
      'material_factor_per_unit',
      'default_layers',
      'surface_type',
      'prep_required',
      'synonyms',
      'price_labor_per_hour',
      'price_material_per_unit',
      'markup_pct',
    ],
  ];

  // Add data rows (using Swedish decimal format with commas)
  for (const task of SAMPLE_TASKS) {
    worksheetData.push([
      task.meps_id,
      task.task_name_sv,
      task.task_name_en || '',
      task.unit,
      task.labor_norm_per_unit.toString().replace('.', ','), // Swedish format
      task.material_factor_per_unit?.toString().replace('.', ',') || '',
      task.default_layers?.toString() || '',
      task.surface_type || '',
      task.prep_required ? 'Ja' : '',
      task.synonyms || '',
      task.price_labor_per_hour?.toString() || '',
      task.price_material_per_unit?.toString() || '',
      '10', // Default 10% markup
    ]);
  }

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 25 }, // meps_id
    { wch: 30 }, // task_name_sv
    { wch: 30 }, // task_name_en
    { wch: 8 },  // unit
    { wch: 20 }, // labor_norm_per_unit
    { wch: 25 }, // material_factor_per_unit
    { wch: 15 }, // default_layers
    { wch: 15 }, // surface_type
    { wch: 15 }, // prep_required
    { wch: 40 }, // synonyms
    { wch: 20 }, // price_labor_per_hour
    { wch: 25 }, // price_material_per_unit
    { wch: 12 }, // markup_pct
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'MEPS Catalog');

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write file
  XLSX.writeFile(workbook, outputPath);

  console.log(`✅ Generated ${SAMPLE_TASKS.length} painting tasks`);
  console.log(`📊 Distribution:`);
  console.log(`   - Vägg (walls):    ${SAMPLE_TASKS.filter(t => t.surface_type === 'vägg').length}`);
  console.log(`   - Tak (ceiling):   ${SAMPLE_TASKS.filter(t => t.surface_type === 'tak').length}`);
  console.log(`   - Golv (floor):    ${SAMPLE_TASKS.filter(t => t.surface_type === 'golv').length}`);
  console.log(`   - Dörr (doors):    ${SAMPLE_TASKS.filter(t => t.surface_type === 'dörr').length}`);
  console.log(`   - Fönster (windows): ${SAMPLE_TASKS.filter(t => t.surface_type === 'fönster').length}`);
  console.log(`   - List (trim):     ${SAMPLE_TASKS.filter(t => t.surface_type === 'list').length}`);
  console.log(`   - Other:           ${SAMPLE_TASKS.filter(t => !t.surface_type).length}`);
  console.log(`\n✅ Sample catalog created successfully!`);
  console.log(`\n💡 Import with: npm run import-excel -- ${outputPath}\n`);
}

main();
