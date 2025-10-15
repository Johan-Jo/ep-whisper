#!/usr/bin/env tsx

import { generateEstimateFromVoice } from '../src/lib/nlp/integration';
import { MepsCatalog } from '../src/lib/excel/catalog';

console.log('🧪 Testing Estimate Generation End-to-End\n');

async function testEstimateGeneration() {
  try {
    // Mock conversation summary (what gets passed from conversation)
    const summary = {
      clientName: 'Test Kunden',
      projectName: 'Test Projekt',
      roomName: 'Test Rum',
      measurements: {
        width: 4.4,
        length: 2.35,
        height: 1.2,
        doors: 1,
        windows: 1
      },
      tasks: ['måla väggar', 'grundmåla tak'] // Common tasks that should work
    };

    console.log('📋 Conversation Summary:', summary);

    // Mock MEPS rows (same as in page.tsx)
    const mockMepsRows = [
      {
        meps_id: 'GRUND-VÄGG-M2',
        task_name_sv: 'Grundmåla väggar',
        unit: 'm2' as const,
        labor_norm_per_unit: 0.4,
        surface_type: 'vägg' as const,
        default_layers: 1,
        material_factor_per_unit: 1.0,
        price_labor_per_hour: 450,
        price_material_per_unit: 35,
        synonyms: 'grundmåla väggar;grundmåla vägg;grundmålning väggar'
      },
      {
        meps_id: 'MÅL-VÄGG-M2',
        task_name_sv: 'Måla väggar',
        unit: 'm2' as const,
        labor_norm_per_unit: 0.5,
        surface_type: 'vägg' as const,
        default_layers: 2,
        material_factor_per_unit: 1.2,
        price_labor_per_hour: 450,
        price_material_per_unit: 45,
        synonyms: 'måla väggar;måla vägg;väggmålning;täckmåla väggar;täckmåla vägg'
      },
      {
        meps_id: 'GRUND-TAK-M2',
        task_name_sv: 'Grundmåla tak',
        unit: 'm2' as const,
        labor_norm_per_unit: 0.35,
        surface_type: 'tak' as const,
        default_layers: 1,
        material_factor_per_unit: 1.0,
        price_labor_per_hour: 450,
        price_material_per_unit: 40,
        synonyms: 'grundmåla tak;grundmåla taket;grundmålning tak'
      }
    ];

    console.log('🏗️ Creating MEPS catalog...');
    const catalog = new MepsCatalog();
    await catalog.loadFromRows(mockMepsRows);
    console.log('✅ MEPS catalog loaded with', mockMepsRows.length, 'tasks');

    // Room calculation (same as in page.tsx)
    const roomCalculation = {
      width: summary.measurements.width,
      length: summary.measurements.length,
      height: summary.measurements.height,
      walls_gross: 2 * (summary.measurements.width + summary.measurements.length) * summary.measurements.height,
      walls_net: 2 * (summary.measurements.width + summary.measurements.length) * summary.measurements.height - ((summary.measurements.doors || 1) * 1.89),
      ceiling_gross: summary.measurements.width * summary.measurements.length,
      ceiling_net: summary.measurements.width * summary.measurements.length,
      floor_gross: summary.measurements.width * summary.measurements.length,
      floor_net: summary.measurements.width * summary.measurements.length,
      perimeter: 2 * (summary.measurements.width + summary.measurements.length),
      door_area: 1.89,
      window_area: 2.0,
    };

    console.log('📐 Room calculation:', roomCalculation);

    // Process all tasks (same logic as page.tsx)
    console.log('🔍 Processing tasks:', summary.tasks);
    let allMappedTasks: any[] = [];
    
    for (const task of summary.tasks) {
      console.log('📝 Processing task:', task);
      
      try {
        const estimateResult = await generateEstimateFromVoice({
          transcription: task,
          roomCalculation,
          mepsCatalog: catalog
        });
        
        console.log('📊 Task result:', estimateResult);
        
        if (estimateResult.success && estimateResult.mappedTasks) {
          allMappedTasks = [...allMappedTasks, ...estimateResult.mappedTasks];
          console.log('✅ Task mapped successfully, total tasks:', allMappedTasks.length);
        } else {
          console.warn('⚠️ Task mapping failed:', estimateResult.errors);
        }
      } catch (error) {
        console.error('❌ Error processing task:', task, error);
      }
    }

    console.log('💰 Calculating totals for', allMappedTasks.length, 'tasks');
    
    if (allMappedTasks.length === 0) {
      console.error('❌ NO TASKS WERE MAPPED! This is the problem.');
      return;
    }

    // Calculate totals (same as page.tsx)
    const subtotal = allMappedTasks.reduce((sum, item) => sum + item.subtotal, 0);
    const markup = subtotal * 0.15;
    const total = subtotal + markup;
    
    console.log('💵 Totals calculated - Subtotal:', subtotal, 'Markup:', markup, 'Total:', total);

    // Format output (same as page.tsx)
    const formattedEstimate = `
👤 Kund: ${summary.clientName}
✅ ${summary.projectName} - ${summary.roomName}
📊 Mått: ${summary.measurements.width}×${summary.measurements.length}×${summary.measurements.height}m

📋 Uppgifter (${summary.tasks.length}):
${summary.tasks.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

💰 Uppskattning:
  • Antal uppgifter: ${allMappedTasks.length}
  • Delsumma: ${subtotal.toFixed(2)} SEK
  • Pålägg (15%): ${markup.toFixed(2)} SEK
  • Totalt: ${total.toFixed(2)} SEK
    `.trim();

    console.log('📄 Formatted estimate:');
    console.log(formattedEstimate);
    
    console.log('✅ Estimate generation completed successfully!');

  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

testEstimateGeneration().catch(console.error);
