/**
 * Automated test for conversational workflow
 */

import { ConversationManager } from '../src/lib/conversation/manager';
import { parseMeasurements, parseProjectName } from '../src/lib/conversation/parser';

console.log('🧪 Testing Conversational Workflow\n');
console.log('='.repeat(80));

const manager = new ConversationManager();

// Test 1: Welcome & Project Name
console.log('\n📋 Test 1: Project Name Input');
console.log('Current prompt:', manager.getCurrentPrompt());
console.log('User says: "Renovering av lägenhet"');
let result = manager.processInput('Renovering av lägenhet');
console.log('Result:', result);
console.log('State:', manager.getState());

// Test 2: Room Name
console.log('\n📋 Test 2: Room Name Input');
console.log('Current prompt:', manager.getCurrentPrompt());
console.log('User says: "Stora sovrummet"');
result = manager.processInput('Stora sovrummet');
console.log('Result:', result);
console.log('State:', manager.getState());

// Test 3: Measurements - Format 1 (numbers with "gånger")
console.log('\n📋 Test 3: Measurements - "gånger" format');
console.log('Current prompt:', manager.getCurrentPrompt());
console.log('User says: "fyra gånger fem gånger två och en halv"');
result = manager.processInput('fyra gånger fem gånger två och en halv');
console.log('Result:', result);
console.log('State:', manager.getState());
console.log('Parsed measurements:', parseMeasurements('fyra gånger fem gånger två och en halv'));

// Test 4: Add tasks
console.log('\n📋 Test 4: Adding Tasks');
console.log('Current prompt:', manager.getCurrentPrompt());

const tasks = [
  'måla väggar två lager',
  'måla tak',
  'grundmåla väggar',
  'måla dörr'
];

tasks.forEach((task, i) => {
  console.log(`\nTask ${i + 1}: "${task}"`);
  result = manager.processInput(task);
  console.log('Result:', result);
});

// Test 5: Complete
console.log('\n📋 Test 5: Completion');
console.log('User says: "klar"');
result = manager.processInput('klar');
console.log('Result:', result);
console.log('State:', manager.getState());

// Test 6: Get summary
console.log('\n📋 Test 6: Final Summary');
const summary = manager.getSummary();
console.log('Summary:', JSON.stringify(summary, null, 2));

console.log('\n' + '='.repeat(80));

// Additional parser tests
console.log('\n🧪 Testing Parsers\n');
console.log('='.repeat(80));

console.log('\n📋 Project Name Parser Tests:');
const projectTests = [
  'Renovering av lägenhet',
  'Det heter Kök',
  'Projektet heter Stora huset',
  'Badrum'
];
projectTests.forEach(test => {
  console.log(`"${test}" →`, parseProjectName(test));
});

console.log('\n📋 Measurements Parser Tests:');
const measurementTests = [
  'fyra gånger fem gånger två och en halv',
  'bredd 4, längd 5, höjd 2,5',
  '4 meter bred, 5 meter lång, 2.5 meter hög',
  'tre gånger fyra gånger två',
  '3.5 × 4.2 × 2.7',
];
measurementTests.forEach(test => {
  console.log(`"${test}" →`, parseMeasurements(test));
});

console.log('\n' + '='.repeat(80));
console.log('✅ All tests completed!\n');

