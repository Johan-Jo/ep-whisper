'use client';

import { useState, useEffect } from 'react';
import { VoiceInterface } from '@/components/voice';
import { ConversationalVoice } from '@/components/voice/ConversationalVoice';
import { MobileVoiceLayout } from '@/components/mobile/MobileVoiceLayout';
import type { VoiceProcessingResult } from '@/lib/openai';
import { generateEstimateFromVoice, formatVoiceEstimateResult } from '@/lib/nlp';
import type { RoomCalculation, MepsRow, LineItem } from '@/lib/types';
import { MepsCatalog } from '@/lib/excel/catalog';
import { PDFExportButton } from '@/components/estimate/PDFExportButton';
import type { PDFEstimateData } from '@/lib/pdf/types';
import '../styles/mobile.css';

export default function Home() {
  const [width, setWidth] = useState('4');
  const [length, setLength] = useState('5');
  const [height, setHeight] = useState('2.5');
  const [doors, setDoors] = useState('1');
  const [windows, setWindows] = useState('1');
  const [estimate, setEstimate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [voiceResults, setVoiceResults] = useState<VoiceProcessingResult[]>([]);
  const [apiKeyStatus, setApiKeyStatus] = useState<'unknown' | 'present' | 'missing'>('unknown');
  const [voiceEstimate, setVoiceEstimate] = useState<string>('');
  const [voiceEstimateLoading, setVoiceEstimateLoading] = useState(false);
  const [pdfData, setPdfData] = useState<PDFEstimateData | null>(null);
  const [useConversationalMode, setUseConversationalMode] = useState(true);
  const [useMobileUI, setUseMobileUI] = useState(false);

  // Check API key status on mount
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    setApiKeyStatus(apiKey ? 'present' : 'missing');
  }, []);
  
  // Handle conversation completion
  const handleConversationComplete = async (summary: {
    clientName: string;
    projectName: string;
    roomName: string;
    measurements: { width: number; length: number; height: number; doors?: number; windows?: number };
    tasks: string[];
  }) => {
    console.log('✅ Conversation complete:', summary);
    console.log('👤 Client:', summary.clientName);
    
    // Update form fields
    setWidth(String(summary.measurements.width));
    setLength(String(summary.measurements.length));
    setHeight(String(summary.measurements.height));
    setDoors(String(summary.measurements.doors || 1));
    setWindows(String(summary.measurements.windows || 1));
    
    // Generate estimate from conversation
    setVoiceEstimateLoading(true);
    try {
      const mockMepsRows: MepsRow[] = [
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
          meps_id: 'MÅL-TAK-M2',
          task_name_sv: 'Måla tak',
          unit: 'm2' as const,
          labor_norm_per_unit: 0.45,
          surface_type: 'tak' as const,
          default_layers: 2,
          material_factor_per_unit: 1.2,
          price_labor_per_hour: 450,
          price_material_per_unit: 50,
          synonyms: 'måla tak;måla taket;takmålning;täckmåla tak'
        },
        {
          meps_id: 'MÅL-DÖRR-ST',
          task_name_sv: 'Måla dörr',
          unit: 'st' as const,
          labor_norm_per_unit: 2.5,
          surface_type: 'dörr' as const,
          default_layers: 2,
          material_factor_per_unit: 0.5,
          price_labor_per_hour: 450,
          price_material_per_unit: 120,
          synonyms: 'måla dörr;måla dörren;måla dörrar;dörrmålning'
        }
      ];
      
      const catalog = new MepsCatalog();
      await catalog.loadFromRows(mockMepsRows);
      
      const roomCalculation: RoomCalculation = {
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
      };
      
      // Process all tasks
      let allMappedTasks: LineItem[] = [];
      let fullTranscription = summary.tasks.join('. ');
      
      for (const task of summary.tasks) {
        const estimateResult = await generateEstimateFromVoice({
          transcription: task,
          roomCalculation,
          mepsCatalog: catalog
        });
        
        if (estimateResult.success && estimateResult.mappedTasks) {
          allMappedTasks = [...allMappedTasks, ...estimateResult.mappedTasks];
        }
      }
      
      // Calculate totals
      const subtotal = allMappedTasks.reduce((sum, item) => sum + item.lineTotal, 0);
      const markup = subtotal * 0.15;
      const total = subtotal + markup;
      
      // Format output
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
      
      setVoiceEstimate(formattedEstimate);
      
      // Prepare PDF data
      const pdfEstimateData: PDFEstimateData = {
        roomName: summary.roomName,
        date: new Date(),
        geometry: roomCalculation,
        lineItems: allMappedTasks,
        subtotal,
        markup,
        markupPercent: 15,
        total,
      };
      setPdfData(pdfEstimateData);
      
    } catch (error) {
      console.error('Error generating estimate:', error);
      setVoiceEstimate(`❌ Fel: ${error instanceof Error ? error.message : 'Okänt fel'}`);
    } finally {
      setVoiceEstimateLoading(false);
    }
  };

  // Generate room calculation from current form values
  const generateRoomCalculation = (): RoomCalculation => {
    const w = parseFloat(width) || 0;
    const l = parseFloat(length) || 0;
    const h = parseFloat(height) || 0;
    const doorCount = parseInt(doors) || 0;
    const windowCount = parseInt(windows) || 0;

    // Simple calculation - in a real app, this would use the geometry calculator
    const wallArea = 2 * (w + l) * h;
    const ceilingArea = w * l;
    const doorArea = doorCount * 0.9 * 2.1; // Standard door size
    const windowArea = windowCount * 1.2 * 1.2; // Standard window size
    
    return {
      walls_gross: wallArea,
      walls_net: wallArea - doorArea - windowArea,
      ceiling_gross: ceilingArea,
      ceiling_net: ceilingArea,
      floor_gross: w * l,
      floor_net: w * l,
      perimeter: 2 * (w + l),
      door_area: doorArea,
      window_area: windowArea,
      wardrobe_area: 0 // Not used in this demo
    };
  };

  const calculateEstimate = async () => {
    setLoading(true);
    
    const geometry = {
      W: parseFloat(width),
      L: parseFloat(length),
      H: parseFloat(height),
      doors: Array(parseInt(doors) || 0).fill({}),
      windows: Array(parseInt(windows) || 0).fill({ w: 1.2, h: 1.2 }),
      wardrobes: [],
    };

    const tasks = [
      { phrase: 'bredspackla väggar' },
      { phrase: 'grundmåla väggar' },
      { phrase: 'täckmåla väggar', layers: 2 },
      { phrase: 'måla tak', layers: 2 },
    ];

    try {
      const response = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geometry, tasks }),
      });

      const data = await response.json();
      setEstimate(data.estimate || data.error || 'Error generating estimate');
    } catch (error) {
      setEstimate('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-lime-400 to-green-400 bg-clip-text text-transparent">
          EP-Whisper
        </h1>
        <p className="text-gray-400 mb-8">Voice-to-Estimate Painting Calculator (Test Interface)</p>

        {/* Mobile UI Mode */}
        {useMobileUI ? (
          <MobileVoiceLayout onComplete={handleConversationComplete} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Panel */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4 text-lime-400">Rumsmått / Room Dimensions</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Bredd / Width (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-lime-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Längd / Length (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-lime-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Höjd / Height (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-lime-400"
                />
        </div>

              <div>
                <label className="block text-sm font-medium mb-1">Antal dörrar / Number of doors</label>
                <input
                  type="number"
                  value={doors}
                  onChange={(e) => setDoors(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-lime-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Antal fönster / Number of windows</label>
                <input
                  type="number"
                  value={windows}
                  onChange={(e) => setWindows(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-lime-400"
                />
              </div>

              <button
                onClick={calculateEstimate}
                disabled={loading}
                className="w-full bg-lime-500 hover:bg-lime-600 disabled:bg-gray-600 text-black font-semibold py-3 px-4 rounded transition-colors"
              >
                {loading ? 'Beräknar...' : 'Skapa offert / Generate Estimate'}
              </button>
            </div>

            <div className="mt-6 p-4 bg-gray-900 rounded border border-gray-700">
              <p className="text-xs text-gray-400">
                <strong>Standard uppgifter / Default tasks:</strong><br />
                • Bredspackla väggar<br />
                • Grundmåla väggar<br />
                • Täckmåla väggar (2 lager)<br />
                • Måla tak (2 lager)
              </p>
            </div>
          </div>

          {/* Voice Interface Panel */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            {/* API Key Status */}
            <div className="mb-4 p-3 rounded bg-gray-900 border border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">OpenAI API Key:</span>
                {apiKeyStatus === 'unknown' && (
                  <span className="text-sm text-yellow-400">⏳ Checking...</span>
                )}
                {apiKeyStatus === 'present' && (
                  <span className="text-sm text-green-400">✓ Configured</span>
                )}
                {apiKeyStatus === 'missing' && (
                  <span className="text-sm text-red-400">✗ Missing</span>
                )}
              </div>
              {apiKeyStatus === 'missing' && (
                <p className="text-xs text-gray-500 mt-2">
                  Set NEXT_PUBLIC_OPENAI_API_KEY in .env.local
                </p>
              )}
            </div>
            
            {/* UI Mode Toggle */}
            <div className="mb-6 flex items-center gap-4 p-3 bg-gray-900 rounded border border-gray-700">
              <span className="text-sm text-gray-400">UI-läge:</span>
              <button
                onClick={() => setUseMobileUI(false)}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  !useMobileUI 
                    ? 'bg-lime-500 text-black' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                💻 Desktop
              </button>
              <button
                onClick={() => setUseMobileUI(true)}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  useMobileUI 
                    ? 'bg-lime-500 text-black' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                📱 Mobil
              </button>
            </div>

            {/* Voice Mode Toggle (Desktop only) */}
            {!useMobileUI && (
              <div className="mb-6 flex items-center gap-4 p-3 bg-gray-900 rounded border border-gray-700">
                <span className="text-sm text-gray-400">Röstläge:</span>
                <button
                  onClick={() => setUseConversationalMode(true)}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    useConversationalMode 
                      ? 'bg-lime-500 text-black' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  🗣️ Konversation (Steg-för-steg)
                </button>
                <button
                  onClick={() => setUseConversationalMode(false)}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    !useConversationalMode 
                      ? 'bg-lime-500 text-black' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  🎤 Direkt (En kommando)
                </button>
              </div>
            )}

            {/* Desktop Voice Mode */}
            {useConversationalMode ? (
              <ConversationalVoice onComplete={handleConversationComplete} />
            ) : (
              <VoiceInterface
                onTaskIdentified={async (result) => {
                  console.log('Voice result:', result);
                  setVoiceResults(prev => [result, ...prev].slice(0, 5)); // Keep last 5 results
                  
                  // If transcription was successful, try to generate an estimate
                  console.log('🎤 Result:', result);
                  console.log('🎤 Transcription:', result.transcription);
                  console.log('🎤 Success status:', result.success);
                  
                  if (result.success && result.transcription && result.transcription.text) {
                    console.log('🎯 Starting estimate generation...');
                    setVoiceEstimateLoading(true);
                    try {
                      // Create mock MEPS catalog for demo (in real app, this would come from Excel)
                    const mockMepsRows: MepsRow[] = [
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
                        synonyms: 'grundmåla väggar;grundmåla vägg;grundmåling vägg;grundmåla väggarna;primer väggar'
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
                        synonyms: 'måla väggar;måla vägg;väggmålning;måla väggarna;täckmåla väggar;täckmåla vägg'
                      },
                      {
                        meps_id: 'GRUND-TAK-M2',
                        task_name_sv: 'Grundmåla tak',
                        unit: 'm2' as const,
                        labor_norm_per_unit: 0.5,
                        surface_type: 'tak' as const,
                        default_layers: 1,
                        material_factor_per_unit: 1.0,
                        price_labor_per_hour: 450,
                        price_material_per_unit: 40,
                        synonyms: 'grundmåla tak;grundmåla taket;grundmåling tak;primer tak'
                      },
                      {
                        meps_id: 'MÅL-TAK-M2',
                        task_name_sv: 'Måla tak',
                        unit: 'm2' as const,
                        labor_norm_per_unit: 0.6,
                        surface_type: 'tak' as const,
                        default_layers: 2,
                        material_factor_per_unit: 1.2,
                        price_labor_per_hour: 450,
                        price_material_per_unit: 50,
                        synonyms: 'måla tak;måla taket;takmålning;täckmåla tak;täckmåla taket'
                      },
                      {
                        meps_id: 'SPACK-VÄGG-M2',
                        task_name_sv: 'Spackla väggar',
                        unit: 'm2' as const,
                        labor_norm_per_unit: 0.3,
                        surface_type: 'vägg' as const,
                        default_layers: 1,
                        material_factor_per_unit: 0.8,
                        price_labor_per_hour: 450,
                        price_material_per_unit: 25,
                        synonyms: 'spackla väggar;spackla vägg;väggspackling;spackla väggarna;bredspackla väggar;bredspackla vägg'
                      },
                      {
                        meps_id: 'MÅL-GOLV-M2',
                        task_name_sv: 'Måla golv',
                        unit: 'm2' as const,
                        labor_norm_per_unit: 0.4,
                        surface_type: 'golv' as const,
                        default_layers: 2,
                        material_factor_per_unit: 1.1,
                        price_labor_per_hour: 450,
                        price_material_per_unit: 48,
                        synonyms: 'måla golv;måla golvet;golvmålning;täckmåla golv'
                      },
                      {
                        meps_id: 'MÅL-DÖRR-ST',
                        task_name_sv: 'Måla dörr',
                        unit: 'st' as const,
                        labor_norm_per_unit: 2.5,
                        surface_type: 'dörr' as const,
                        default_layers: 2,
                        material_factor_per_unit: 0.5,
                        price_labor_per_hour: 450,
                        price_material_per_unit: 120,
                        synonyms: 'måla dörr;måla dörren;måla dörrar;dörrmålning'
                      },
                      {
                        meps_id: 'MÅL-LIST-LPM',
                        task_name_sv: 'Måla lister',
                        unit: 'lpm' as const,
                        labor_norm_per_unit: 0.3,
                        surface_type: 'list' as const,
                        default_layers: 2,
                        material_factor_per_unit: 0.2,
                        price_labor_per_hour: 450,
                        price_material_per_unit: 15,
                        synonyms: 'måla lister;måla list;listmålning;måla listen;måla taklist;måla golvlist'
                      }
                    ];
                      
                      // Create catalog instance
                      const catalog = new MepsCatalog();
                      await catalog.loadFromRows(mockMepsRows);
                      
                      const roomCalculation = generateRoomCalculation();
                      
                      console.log('📊 Room calculation:', roomCalculation);
                      console.log('📋 MEPS catalog:', catalog);
                      
                      const estimateResult = await generateEstimateFromVoice({
                        transcription: result.transcription.text,
                        roomCalculation,
                        mepsCatalog: catalog
                      });
                      
                      console.log('✅ Estimate result:', estimateResult);
                      
                      const formattedEstimate = formatVoiceEstimateResult(estimateResult);
                      console.log('📄 Formatted estimate:', formattedEstimate);
                      setVoiceEstimate(formattedEstimate);
                      
                      // Prepare PDF data
                      if (estimateResult.success && estimateResult.mappedTasks) {
                        const pdfEstimateData: PDFEstimateData = {
                          roomName: 'Rum',
                          date: new Date(),
                          geometry: roomCalculation,
                          lineItems: estimateResult.mappedTasks,
                          subtotal: estimateResult.estimate?.subtotal || 0,
                          markup: estimateResult.estimate?.markup || 0,
                          markupPercent: 15,
                          total: estimateResult.estimate?.total || 0,
                        };
                        setPdfData(pdfEstimateData);
                      }
                      
                    } catch (error) {
                      console.error('Error generating voice estimate:', error);
                      setVoiceEstimate(`❌ Fel vid generering av offert: ${error instanceof Error ? error.message : 'Okänt fel'}`);
                    } finally {
                      setVoiceEstimateLoading(false);
                    }
                  }
                }}
                onError={(error) => {
                  console.error('Voice error:', error);
                }}
              />
            )}

            {/* Voice Results History */}
            {voiceResults.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="text-sm font-semibold text-lime-400">Senaste röstresultat / Recent Results</h3>
                {voiceResults.map((result, index) => (
                  <div key={index} className="p-3 bg-gray-900 rounded border border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">
                        {new Date().toLocaleTimeString('sv-SE')}
                      </span>
                      <span className={`text-xs font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                        {result.success ? '✓ Framgång' : '✗ Fel'}
                      </span>
                    </div>
                    <p className="text-sm text-white">
                      "{result.transcription?.text || 'Ingen transkription'}"
                    </p>
                    <div className="flex items-center space-x-3 mt-2 text-xs text-gray-400">
                      <span>Förtroende: {((result.transcription?.confidence || 0) * 100).toFixed(0)}%</span>
                      <span>Tid: {result.processingTime}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Voice Estimate Panel */}
            {(voiceEstimate || voiceEstimateLoading) && (
              <div className="mt-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-lime-400 mb-4">
                  🎤 Röstgenererad Offert / Voice Estimate
                </h3>
                
                {voiceEstimateLoading ? (
                  <div className="text-center text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400 mx-auto mb-2"></div>
                    <p>Genererar offert från röstkommando...</p>
                  </div>
                ) : (
                  <div className="bg-black text-lime-300 p-4 rounded overflow-x-auto text-sm font-mono whitespace-pre">
                    {voiceEstimate}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Output Panel */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-semibold mb-4 text-lime-400">Offert / Estimate</h2>
              
              {(estimate || voiceEstimate) ? (
                <div className="space-y-4">
                  <pre className="bg-black text-lime-300 p-4 rounded overflow-x-auto text-xs font-mono whitespace-pre">
                    {estimate || voiceEstimate}
                  </pre>
                  
                  {pdfData && (
                    <div className="flex justify-end">
                      <PDFExportButton 
                        data={pdfData}
                        filename={`offert-${pdfData.roomName.toLowerCase().replace(/\s+/g, '-')}.pdf`}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <p className="text-lg">Fyll i rumsmått och klicka på "Skapa offert"</p>
                  <p className="text-sm mt-2">Fill in room dimensions and click "Generate Estimate"</p>
                </div>
              )}
            </div>
          </div>

          {/* Information Panel */}
          <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700 lg:col-span-3">
            <h3 className="text-lg font-semibold mb-2 text-lime-400">ℹ️ Information</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Standard door size: 0,9m × 2,1m</li>
              <li>• Standard window size: 1,2m × 1,2m (for this demo)</li>
              <li>• All calculations use Swedish decimal format (comma separator)</li>
              <li>• Tasks are mapped from Excel catalog with strict guard-rails</li>
              <li>• ROT-avdrag calculation is not included (note displayed only)</li>
            </ul>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}