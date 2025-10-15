/**
 * Run 10 comprehensive end-to-end conversation tests
 */

import { ConversationManager } from '../src/lib/conversation/manager';

interface TestScenario {
  name: string;
  inputs: string[];
  expectedProject?: string;
  expectedRoom?: string;
  expectedTaskCount?: number;
}

const scenarios: TestScenario[] = [
  {
    name: 'Scenario 1: Kitchen Renovation',
    inputs: [
      'Kök renovering',
      'Kök',
      'fyra gånger fem gånger två och en halv',
      'måla väggar två lager',
      'måla tak',
      'klar',
      'ja'
    ],
    expectedProject: 'Kök renovering',
    expectedRoom: 'Kök',
    expectedTaskCount: 2,
  },
  {
    name: 'Scenario 2: Bedroom Project',
    inputs: [
      'Lägenhet',
      'Sovrum',
      'bredd 4, längd 5, höjd 2,5',
      'grundmåla väggar',
      'täckmåla väggar två gånger',
      'måla dörr',
      'klar',
      'ja'
    ],
    expectedProject: 'Lägenhet',
    expectedRoom: 'Sovrum',
    expectedTaskCount: 3,
  },
  {
    name: 'Scenario 3: Living Room with "och en halv"',
    inputs: [
      'Renovering',
      'Vardagsrum',
      'fem gånger sex gånger tre och en halv',
      'spackla väggar',
      'slipa väggar',
      'grundmåla tak',
      'måla tak två lager',
      'klar',
      'ja'
    ],
    expectedProject: 'Renovering',
    expectedRoom: 'Vardagsrum',
    expectedTaskCount: 4,
  },
  {
    name: 'Scenario 4: Bathroom Simple',
    inputs: [
      'Badrum projekt',
      'Lilla badrummet',
      'tre gånger tre gånger två',
      'måla tak',
      'klar',
      'ja'
    ],
    expectedProject: 'Badrum projekt',
    expectedRoom: 'Lilla badrummet',
    expectedTaskCount: 1,
  },
  {
    name: 'Scenario 5: Office with Numeric Input',
    inputs: [
      'Kontor',
      'Arbetsrummet',
      '3.5 × 4.2 × 2.7',
      'måla väggar',
      'måla lister',
      'klar',
      'ja'
    ],
    expectedProject: 'Kontor',
    expectedRoom: 'Arbetsrummet',
    expectedTaskCount: 2,
  },
  {
    name: 'Scenario 6: Hallway with Multiple Tasks',
    inputs: [
      'Villa renovering',
      'Hall',
      '2 × 8 × 2.4',
      'bredspackla väggar',
      'slipa väggar',
      'grundmåla väggar',
      'täckmåla väggar två lager',
      'måla tak',
      'måla dörrar',
      'klar',
      'ja'
    ],
    expectedProject: 'Villa renovering',
    expectedRoom: 'Hall',
    expectedTaskCount: 6,
  },
  {
    name: 'Scenario 7: Name Starting with "Det heter"',
    inputs: [
      'Det heter Stora projektet',
      'Det heter Stora rummet',
      'fyra gånger fyra gånger två',
      'måla tak',
      'klar',
      'ja'
    ],
    expectedProject: 'Stora projektet',
    expectedRoom: 'Stora rummet',
    expectedTaskCount: 1,
  },
  {
    name: 'Scenario 8: Child Room',
    inputs: [
      'Barnrum',
      'Lilla barnrummet',
      'tre och en halv gånger fyra gånger två och en halv',
      'måla väggar tre lager',
      'måla tak två lager',
      'klar',
      'ja'
    ],
    expectedProject: 'Barnrum',
    expectedRoom: 'Lilla barnrummet',
    expectedTaskCount: 2,
  },
  {
    name: 'Scenario 9: Garage',
    inputs: [
      'Garage projekt',
      'Garage',
      '5 × 6 × 2.5',
      'grundmåla golv',
      'måla golv',
      'klar',
      'ja'
    ],
    expectedProject: 'Garage projekt',
    expectedRoom: 'Garage',
    expectedTaskCount: 2,
  },
  {
    name: 'Scenario 10: Add More Tasks',
    inputs: [
      'Test',
      'Testrum',
      '4 × 4 × 2.5',
      'måla väggar',
      'klar',
      'lägg till',
      'måla tak',
      'måla dörr',
      'klar',
      'ja'
    ],
    expectedProject: 'Test',
    expectedRoom: 'Testrum',
    expectedTaskCount: 3,
  },
];

console.log('🧪 Running 10 Comprehensive Conversation Tests\n');
console.log('='.repeat(80));

let passedTests = 0;
let failedTests = 0;

scenarios.forEach((scenario, index) => {
  console.log(`\n📋 ${scenario.name}`);
  console.log('─'.repeat(80));
  
  const manager = new ConversationManager();
  let success = true;
  let errorMsg = '';
  
  try {
    scenario.inputs.forEach((input, i) => {
      const result = manager.processInput(input);
      console.log(`  ${i + 1}. "${input}" → ${result.success ? '✅' : '❌'} ${result.message}`);
      
      if (!result.success && input !== 'klar' && input !== 'lägg till' && input !== 'ja') {
        success = false;
        errorMsg = result.message;
      }
    });
    
    const summary = manager.getSummary();
    
    // Validate expectations
    if (scenario.expectedProject && summary.projectName !== scenario.expectedProject) {
      success = false;
      errorMsg = `Expected project "${scenario.expectedProject}", got "${summary.projectName}"`;
    }
    if (scenario.expectedRoom && summary.roomName !== scenario.expectedRoom) {
      success = false;
      errorMsg = `Expected room "${scenario.expectedRoom}", got "${summary.roomName}"`;
    }
    if (scenario.expectedTaskCount && summary.tasks.length !== scenario.expectedTaskCount) {
      success = false;
      errorMsg = `Expected ${scenario.expectedTaskCount} tasks, got ${summary.tasks.length}`;
    }
    
    if (success) {
      console.log(`  ✅ PASSED`);
      console.log(`     Project: ${summary.projectName}`);
      console.log(`     Room: ${summary.roomName}`);
      console.log(`     Measurements: ${summary.measurements.width}×${summary.measurements.length}×${summary.measurements.height}m`);
      console.log(`     Tasks: ${summary.tasks.length}`);
      passedTests++;
    } else {
      console.log(`  ❌ FAILED: ${errorMsg}`);
      failedTests++;
    }
    
  } catch (error) {
    console.log(`  ❌ EXCEPTION: ${error instanceof Error ? error.message : 'Unknown error'}`);
    failedTests++;
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 RESULTS: ${passedTests}/10 tests passed, ${failedTests}/10 failed`);
console.log(passedTests === 10 ? '🎉 ALL TESTS PASSED!' : '⚠️ Some tests failed');
console.log('='.repeat(80) + '\n');

process.exit(failedTests > 0 ? 1 : 0);

