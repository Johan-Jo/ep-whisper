/**
 * Export all training phrases to a simple text file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const phrasesFile = path.resolve(__dirname, '../data/training-phrases.json');
const outputFile = path.resolve(__dirname, '../../docs/ALL-1792-PHRASES.txt');

console.log('📝 Exporting all training phrases...\n');

const data = JSON.parse(fs.readFileSync(phrasesFile, 'utf-8'));

let output = '';
output += '='.repeat(80) + '\n';
output += 'COMPLETE LIST OF ALL 1,792 TRAINING PHRASES\n';
output += 'EP-WHISPER - Swedish Painting Task Recognition\n';
output += '='.repeat(80) + '\n\n';
output += `Total Phrases: ${data.length}\n`;
output += `Generated: ${new Date().toISOString().split('T')[0]}\n`;
output += `Source: Painting_MEPS_CLEAN.xlsx (112 tasks)\n\n`;
output += '='.repeat(80) + '\n\n';

data.forEach((item: any, index: number) => {
  output += `${(index + 1).toString().padStart(4, ' ')}. "${item.phrase}"\n`;
  output += `      → ${item.meps_id} - ${item.task}\n`;
  output += `      → Confidence: ${item.confidence}\n\n`;
});

output += '\n' + '='.repeat(80) + '\n';
output += 'END OF LIST\n';
output += '='.repeat(80) + '\n';

fs.writeFileSync(outputFile, output, 'utf-8');

console.log(`✅ Exported ${data.length} phrases to: ${outputFile}`);
console.log(`📊 File size: ${(fs.statSync(outputFile).size / 1024).toFixed(1)} KB\n`);

