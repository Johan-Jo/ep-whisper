/**
 * Extract comprehensive MEPS catalog from Excel and create enhanced training data
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MepsTask {
  meps_id: string;
  task_name_sv: string;
  task_name_en?: string;
  unit: 'm2' | 'lpm' | 'st';
  labor_norm_per_unit: number;
  surface_type?: 'vägg' | 'tak' | 'golv' | 'dörr' | 'fönster' | 'list';
  default_layers?: number;
  synonyms?: string;
  price_labor_per_hour?: number;
  price_material_per_unit?: number;
}

async function extractMepsCatalog() {
  console.log('📊 Extracting MEPS catalog from Excel...\n');
  
  // Try multiple possible paths
  const possiblePaths = [
    path.resolve(__dirname, '../../docs/Painting_MEPS_CLEAN.xlsx'),
    path.resolve(__dirname, '../../../docs/Painting_MEPS_CLEAN.xlsx'),
    path.resolve(process.cwd(), 'docs/Painting_MEPS_CLEAN.xlsx'),
  ];
  
  let excelPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      excelPath = p;
      break;
    }
  }
  
  if (!excelPath) {
    console.error('❌ Excel file not found. Tried:');
    possiblePaths.forEach(p => console.error(`  - ${p}`));
    process.exit(1);
  }
  
  console.log(`✅ Found Excel: ${excelPath}\n`);
  
  // Read Excel file
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📋 Found ${data.length} rows in sheet "${sheetName}"\n`);
  
  // Extract and normalize tasks
  const tasks: MepsTask[] = [];
  const statistics = {
    total: 0,
    byUnit: { m2: 0, lpm: 0, st: 0 },
    bySurface: { vägg: 0, tak: 0, golv: 0, dörr: 0, fönster: 0, list: 0 },
  };
  
  for (const row of data as any[]) {
    // Skip header or empty rows
    if (!row['MEPS ID'] && !row['meps_id']) continue;
    
    const meps_id = row['MEPS ID'] || row['meps_id'] || '';
    const task_name_sv = row['Task Name (SV)'] || row['task_name_sv'] || '';
    const unit = (row['Unit'] || row['unit'] || 'm2').toLowerCase();
    
    if (!meps_id || !task_name_sv) continue;
    
    const task: MepsTask = {
      meps_id: meps_id.trim(),
      task_name_sv: task_name_sv.trim(),
      task_name_en: row['Task Name (EN)'] || row['task_name_en'],
      unit: unit as 'm2' | 'lpm' | 'st',
      labor_norm_per_unit: parseFloat(row['Labor Norm'] || row['labor_norm_per_unit'] || '0.1'),
      surface_type: inferSurfaceType(task_name_sv),
      default_layers: parseInt(row['Default Layers'] || row['default_layers'] || '1'),
      synonyms: row['Synonyms'] || row['synonyms'] || '',
      price_labor_per_hour: parseFloat(row['Labor Price'] || row['price_labor_per_hour'] || '450'),
      price_material_per_unit: parseFloat(row['Material Price'] || row['price_material_per_unit'] || '20'),
    };
    
    tasks.push(task);
    statistics.total++;
    statistics.byUnit[task.unit]++;
    if (task.surface_type) {
      statistics.bySurface[task.surface_type]++;
    }
  }
  
  console.log('📊 Statistics:');
  console.log(`  Total tasks: ${statistics.total}`);
  console.log(`  By unit:`, statistics.byUnit);
  console.log(`  By surface:`, statistics.bySurface);
  console.log();
  
  // Save to JSON
  const outputPath = path.resolve(__dirname, '../data/meps-catalog-full.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(tasks, null, 2), 'utf-8');
  console.log(`✅ Saved full catalog to: ${outputPath}\n`);
  
  // Generate TypeScript mock for page.tsx
  generateTypeScriptMock(tasks);
  
  return tasks;
}

function inferSurfaceType(taskName: string): 'vägg' | 'tak' | 'golv' | 'dörr' | 'fönster' | 'list' | undefined {
  const lower = taskName.toLowerCase();
  if (lower.includes('vägg')) return 'vägg';
  if (lower.includes('tak')) return 'tak';
  if (lower.includes('golv')) return 'golv';
  if (lower.includes('dörr')) return 'dörr';
  if (lower.includes('fönster')) return 'fönster';
  if (lower.includes('list')) return 'list';
  return undefined;
}

function generateTypeScriptMock(tasks: MepsTask[]) {
  console.log('🔧 Generating TypeScript mock for page.tsx...\n');
  
  const mockCode = `// Auto-generated MEPS catalog from Painting_MEPS_CLEAN.xlsx
// Generated on: ${new Date().toISOString()}

const mockMepsRows: MepsRow[] = [
${tasks.map(task => `  {
    meps_id: '${task.meps_id}',
    task_name_sv: '${task.task_name_sv}',
    unit: '${task.unit}' as const,
    labor_norm_per_unit: ${task.labor_norm_per_unit},
    surface_type: '${task.surface_type}' as const,
    default_layers: ${task.default_layers || 1},
    material_factor_per_unit: ${(task.labor_norm_per_unit * 1.3).toFixed(2)},
    price_labor_per_hour: ${task.price_labor_per_hour || 450},
    price_material_per_unit: ${task.price_material_per_unit || 20},
    synonyms: '${task.synonyms || generateDefaultSynonyms(task.task_name_sv)}'
  }`).join(',\n')}
];`;
  
  const outputPath = path.resolve(__dirname, '../data/meps-mock.ts');
  fs.writeFileSync(outputPath, mockCode, 'utf-8');
  console.log(`✅ Generated TypeScript mock: ${outputPath}\n`);
}

function generateDefaultSynonyms(taskName: string): string {
  const lower = taskName.toLowerCase();
  const synonyms = [taskName.toLowerCase()];
  
  // Add plural variations
  if (lower.includes('väggar')) {
    synonyms.push(lower.replace('väggar', 'vägg'));
    synonyms.push(lower.replace('väggar', 'väggarna'));
  }
  if (lower.includes('tak')) {
    synonyms.push(lower.replace('tak', 'taket'));
  }
  if (lower.includes('golv')) {
    synonyms.push(lower.replace('golv', 'golvet'));
  }
  if (lower.includes('dörr')) {
    synonyms.push(lower.replace('dörr', 'dörrar'));
    synonyms.push(lower.replace('dörr', 'dörren'));
  }
  if (lower.includes('list')) {
    synonyms.push(lower.replace('list', 'lister'));
    synonyms.push(lower.replace('list', 'listen'));
  }
  
  return Array.from(new Set(synonyms)).join(';');
}

// Run extraction
extractMepsCatalog().catch(console.error);

