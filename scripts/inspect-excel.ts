/**
 * Simple script to inspect Excel file structure
 */

import XLSX from 'xlsx';

const filePath = process.argv[2] || '../../docs/Painting_MEPS_CLEAN.xlsx';

console.log(`📊 Inspecting: ${filePath}\n`);

try {
  const workbook = XLSX.readFile(filePath);
  
  console.log(`📑 Sheets (${workbook.SheetNames.length}):`);
  workbook.SheetNames.forEach((name, i) => {
    console.log(`  ${i + 1}. ${name}`);
  });
  console.log();
  
  // Read first sheet
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
  
  console.log(`📋 First sheet: "${workbook.SheetNames[0]}"`);
  console.log(`   Rows: ${data.length}`);
  console.log();
  
  if (data.length > 0) {
    const firstRow = data[0] as Record<string, any>;
    console.log(`🔑 Columns (${Object.keys(firstRow).length}):`);
    Object.keys(firstRow).forEach((key, i) => {
      console.log(`  ${i + 1}. "${key}" = "${firstRow[key]}"`);
    });
    console.log();
    
    console.log(`📄 First 3 rows:\n`);
    data.slice(0, 3).forEach((row: any, i) => {
      console.log(`Row ${i + 1}:`);
      console.log(JSON.stringify(row, null, 2));
      console.log();
    });
  }
  
} catch (error) {
  console.error('❌ Error:', error);
}

