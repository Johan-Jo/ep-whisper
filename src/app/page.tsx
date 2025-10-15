'use client';

import { useState, useEffect } from 'react';
import { VoiceInterface } from '@/components/voice';
import type { VoiceProcessingResult } from '@/lib/openai';
import { generateEstimateFromVoice, formatVoiceEstimateResult } from '@/lib/nlp';
import type { RoomCalculation } from '@/lib/types';

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

  // Check API key status on mount
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    setApiKeyStatus(apiKey ? 'present' : 'missing');
  }, []);

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

              <VoiceInterface
                onTaskIdentified={async (result) => {
                  console.log('Voice result:', result);
                  setVoiceResults(prev => [result, ...prev].slice(0, 5)); // Keep last 5 results
                  
                  // If transcription was successful, try to generate an estimate
                  if (result.success && result.transcription.text) {
                    setVoiceEstimateLoading(true);
                    try {
                      // Create mock MEPS catalog for demo (in real app, this would come from Excel)
                      const mockMepsCatalog = [
                        {
                          meps_code: 'MÅL-VÄGG-M2',
                          task_name: 'Måla väggar',
                          surface_type: 'vägg' as const,
                          unit: 'm2' as const,
                          unit_price_sek: 45,
                          default_layers: '2',
                          material_factor_per_unit: '1.2'
                        },
                        {
                          meps_code: 'MÅL-TAK-M2',
                          task_name: 'Måla tak',
                          surface_type: 'tak' as const,
                          unit: 'm2' as const,
                          unit_price_sek: 50,
                          default_layers: '2',
                          material_factor_per_unit: '1.2'
                        },
                        {
                          meps_code: 'SPACK-VÄGG-M2',
                          task_name: 'Spackla väggar',
                          surface_type: 'vägg' as const,
                          unit: 'm2' as const,
                          unit_price_sek: 25,
                          default_layers: '1',
                          material_factor_per_unit: '0.8'
                        }
                      ];
                      
                      const roomCalculation = generateRoomCalculation();
                      
                      const estimateResult = await generateEstimateFromVoice({
                        transcription: result.transcription.text,
                        roomCalculation,
                        mepsCatalog: mockMepsCatalog
                      });
                      
                      const formattedEstimate = formatVoiceEstimateResult(estimateResult);
                      setVoiceEstimate(formattedEstimate);
                      
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
            </div>

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

          {/* Output Panel */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4 text-lime-400">Offert / Estimate</h2>
            
            {estimate ? (
              <pre className="bg-black text-lime-300 p-4 rounded overflow-x-auto text-xs font-mono whitespace-pre">
                {estimate}
              </pre>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <p className="text-lg">Fyll i rumsmått och klicka på "Skapa offert"</p>
                <p className="text-sm mt-2">Fill in room dimensions and click "Generate Estimate"</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
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
    </div>
  );
}