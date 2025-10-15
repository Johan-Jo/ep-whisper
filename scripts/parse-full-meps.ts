/**
 * Parse full MEPS catalog and generate comprehensive training data
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface RawMepsRow {
  id: number;
  country_id: number;
  user_id: string;
  part_category_id: string;
  unit_type_id: string;
  dimension_type_id: number | string;
  name: string;
  'Material price': number;
  'Work_time_per_unit_type_id': number;
}

interface NormalizedMepsTask {
  meps_id: string;
  task_name_sv: string;
  unit: 'm2' | 'lpm' | 'st';
  labor_norm_per_unit: number;
  surface_type?: 'vägg' | 'tak' | 'golv' | 'dörr' | 'fönster' | 'list';
  default_layers?: number;
  synonyms: string;
  price_labor_per_hour: number;
  price_material_per_unit: number;
  material_factor_per_unit: number;
}

async function parseFullMeps() {
  console.log('🎯 Parsing comprehensive MEPS catalog...\n');
  
  const excelPath = path.resolve(__dirname, '../../../docs/Painting_MEPS_CLEAN.xlsx');
  
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ File not found: ${excelPath}`);
    process.exit(1);
  }
  
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json<RawMepsRow>(sheet);
  
  console.log(`✅ Loaded ${rawData.length} rows from Excel\n`);
  
  // Filter and normalize
  const tasks: NormalizedMepsTask[] = [];
  const stats = {
    total: 0,
    byUnit: { m2: 0, lpm: 0, st: 0 },
    bySurface: { vägg: 0, tak: 0, golv: 0, dörr: 0, fönster: 0, list: 0, other: 0 },
  };
  
  for (const row of rawData) {
    // Only process painting tasks (Målning)
    if (row.part_category_id !== 'Målning') continue;
    
    // Skip if no name or work time
    if (!row.name || !row['Work_time_per_unit_type_id']) continue;
    
    // Normalize unit
    const unit = normalizeUnit(row.unit_type_id);
    if (!unit) continue;
    
    // Extract surface type and layers
    const { surfaceType, layers} = extractMetadata(row.name);
    
    // Generate synonyms
    const synonyms = generateComprehensiveSynonyms(row.name, surfaceType);
    
    const task: NormalizedMepsTask = {
      meps_id: `MEPS-${row.id}`,
      task_name_sv: row.name.trim(),
      unit,
      labor_norm_per_unit: row['Work_time_per_unit_type_id'],
      surface_type: surfaceType,
      default_layers: layers,
      synonyms: synonyms.join(';'),
      price_labor_per_hour: 450, // Standard rate
      price_material_per_unit: row['Material price'] || 0,
      material_factor_per_unit: row['Work_time_per_unit_type_id'] * 1.3,
    };
    
    tasks.push(task);
    stats.total++;
    stats.byUnit[unit]++;
    if (surfaceType) {
      stats.bySurface[surfaceType]++;
    } else {
      stats.bySurface.other++;
    }
  }
  
  console.log('📊 Statistics:');
  console.log(`   Total tasks: ${stats.total}`);
  console.log(`   By unit:`, stats.byUnit);
  console.log(`   By surface:`, stats.bySurface);
  console.log();
  
  // Save JSON
  const jsonPath = path.resolve(__dirname, '../data/meps-full-catalog.json');
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(tasks, null, 2), 'utf-8');
  console.log(`✅ Saved ${tasks.length} tasks to: ${jsonPath}\n`);
  
  // Generate TypeScript code
  generateTypeScriptCode(tasks);
  
  // Generate training phrases
  generateTrainingPhrases(tasks);
  
  return tasks;
}

function normalizeUnit(unitType: string): 'm2' | 'lpm' | 'st' | null {
  const lower = unitType.toLowerCase();
  if (lower === 'm2' || lower === 'm²' || lower === 'kvm') return 'm2';
  if (lower === 'lpm' || lower === 'löpmeter' || lower === 'meter') return 'lpm';
  if (lower === 'st' || lower === 'styck' || lower === 'stycken') return 'st';
  return null;
}

function extractMetadata(name: string): { surfaceType?: 'vägg' | 'tak' | 'golv' | 'dörr' | 'fönster' | 'list', layers?: number } {
  const lower = name.toLowerCase();
  
  let surfaceType: 'vägg' | 'tak' | 'golv' | 'dörr' | 'fönster' | 'list' | undefined;
  
  if (lower.includes('vägg')) surfaceType = 'vägg';
  else if (lower.includes('tak')) surfaceType = 'tak';
  else if (lower.includes('golv')) surfaceType = 'golv';
  else if (lower.includes('dörr') || lower.includes('karm')) surfaceType = 'dörr';
  else if (lower.includes('fönster')) surfaceType = 'fönster';
  else if (lower.includes('list') || lower.includes('profil') || lower.includes('golvlist') || lower.includes('taklist')) surfaceType = 'list';
  
  // Extract layers
  let layers: number | undefined;
  const layerMatch = lower.match(/(\d+)\s*strykning/);
  if (layerMatch) {
    layers = parseInt(layerMatch[1]);
  }
  
  return { surfaceType, layers };
}

function generateComprehensiveSynonyms(name: string, surfaceType?: string): string[] {
  const synonyms = new Set<string>();
  const lower = name.toLowerCase();
  
  // Add original name
  synonyms.add(lower);
  
  // Extract action verbs
  const actions = {
    'täck': ['täckmåla', 'måla', 'målning'],
    'målning': ['måla', 'täckmåla', 'färg'],
    'måla': ['målning', 'täckmåla'],
    'grundmåla': ['grundmålning', 'primer', 'grundfärg'],
    'spackla': ['spackling', 'bredspackling', 'spacklings'],
    'slipa': ['slipning', 'finsand', 'grovsl'],
    'maskera': ['maskning', 'täcka'],
  };
  
  // Add action variations
  for (const [key, variations] of Object.entries(actions)) {
    if (lower.includes(key)) {
      variations.forEach(v => {
        synonyms.add(lower.replace(key, v));
      });
    }
  }
  
  // Add surface variations
  if (surfaceType) {
    const surfaceForms = getSurfaceForms(surfaceType);
    surfaceForms.forEach(form => {
      synonyms.add(`${extractAction(lower)} ${form}`);
    });
  }
  
  // Filter out duplicates and clean
  return Array.from(synonyms)
    .filter(s => s.length > 3 && s.length < 100)
    .slice(0, 20); // Limit to 20 synonyms per task
}

function getSurfaceForms(surface: string): string[] {
  const forms: Record<string, string[]> = {
    'vägg': ['vägg', 'väggar', 'väggen', 'väggarna'],
    'tak': ['tak', 'taket'],
    'golv': ['golv', 'golvet'],
    'dörr': ['dörr', 'dörren', 'dörrar', 'dörrarna'],
    'fönster': ['fönster', 'fönstret', 'fönstren'],
    'list': ['list', 'listen', 'lister', 'listerna', 'golvlist', 'taklist'],
  };
  return forms[surface] || [surface];
}

function extractAction(text: string): string {
  const actions = ['täckmåla', 'grundmåla', 'måla', 'spackla', 'slipa', 'maskera', 'behandla'];
  for (const action of actions) {
    if (text.includes(action)) return action;
  }
  return 'måla';
}

function generateTypeScriptCode(tasks: NormalizedMepsTask[]) {
  console.log('🔧 Generating TypeScript mock code...\n');
  
  const code = `// Auto-generated MEPS catalog from Painting_MEPS_CLEAN.xlsx
// Generated: ${new Date().toISOString()}
// Total tasks: ${tasks.length}

import { MepsRow } from '@/lib/types';

export const FULL_MEPS_CATALOG: MepsRow[] = [
${tasks.map(t => `  {
    meps_id: '${t.meps_id}',
    task_name_sv: '${t.task_name_sv.replace(/'/g, "\\'")}',
    unit: '${t.unit}' as const,
    labor_norm_per_unit: ${t.labor_norm_per_unit},
    surface_type: ${t.surface_type ? `'${t.surface_type}' as const` : 'undefined'},
    default_layers: ${t.default_layers || 1},
    material_factor_per_unit: ${t.material_factor_per_unit.toFixed(2)},
    price_labor_per_hour: ${t.price_labor_per_hour},
    price_material_per_unit: ${t.price_material_per_unit},
    synonyms: '${t.synonyms.replace(/'/g, "\\'")}'
  }`).join(',\n')}
];
`;
  
  const codePath = path.resolve(__dirname, '../src/data/full-meps-catalog.ts');
  fs.mkdirSync(path.dirname(codePath), { recursive: true });
  fs.writeFileSync(codePath, code, 'utf-8');
  console.log(`✅ Generated TypeScript code: ${codePath}\n`);
}

function generateTrainingPhrases(tasks: NormalizedMepsTask[]) {
  console.log('🎓 Generating comprehensive training phrases...\n');
  
  const phrases: Array<{ phrase: string; meps_id: string; task: string; confidence: number }> = [];
  
  for (const task of tasks) {
    const synonyms = task.synonyms.split(';');
    
    // Add all synonyms
    synonyms.forEach(syn => {
      phrases.push({
        phrase: syn.trim(),
        meps_id: task.meps_id,
        task: task.task_name_sv,
        confidence: 0.95
      });
    });
    
    // Add quantity variations for m2 and lpm
    if (task.unit === 'm2') {
      const quantities = [10, 15, 20, 25, 30, 40, 50];
      quantities.forEach(qty => {
        const mainSyn = synonyms[0];
        phrases.push({
          phrase: `${mainSyn} ${qty} kvadratmeter`,
          meps_id: task.meps_id,
          task: task.task_name_sv,
          confidence: 0.98
        });
        phrases.push({
          phrase: `${mainSyn} ${qty} kvm`,
          meps_id: task.meps_id,
          task: task.task_name_sv,
          confidence: 0.97
        });
      });
    }
    
    if (task.unit === 'lpm') {
      const quantities = [5, 10, 12, 15, 20, 25];
      quantities.forEach(qty => {
        const mainSyn = synonyms[0];
        phrases.push({
          phrase: `${mainSyn} ${qty} löpmeter`,
          meps_id: task.meps_id,
          task: task.task_name_sv,
          confidence: 0.98
        });
        phrases.push({
          phrase: `${mainSyn} ${qty} meter`,
          meps_id: task.meps_id,
          task: task.task_name_sv,
          confidence: 0.96
        });
      });
    }
    
    // Add layer variations
    if (task.default_layers) {
      const mainSyn = synonyms[0];
      [1, 2, 3].forEach(layers => {
        phrases.push({
          phrase: `${mainSyn} ${layers} lager`,
          meps_id: task.meps_id,
          task: task.task_name_sv,
          confidence: 0.97
        });
        phrases.push({
          phrase: `${mainSyn} ${layers} ${layers === 1 ? 'strykning' : 'strykningar'}`,
          meps_id: task.meps_id,
          task: task.task_name_sv,
          confidence: 0.96
        });
      });
    }
  }
  
  console.log(`📝 Generated ${phrases.length} training phrases\n`);
  
  const phrasesPath = path.resolve(__dirname, '../data/training-phrases.json');
  fs.writeFileSync(phrasesPath, JSON.stringify(phrases, null, 2), 'utf-8');
  console.log(`✅ Saved training phrases to: ${phrasesPath}\n`);
  
  // Sample phrases
  console.log('📋 Sample phrases (first 20):');
  phrases.slice(0, 20).forEach((p, i) => {
    console.log(`   ${i + 1}. "${p.phrase}" → ${p.meps_id} (${p.confidence})`);
  });
  console.log();
}

// Run
parseFullMeps().catch(console.error);


