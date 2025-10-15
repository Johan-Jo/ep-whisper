'use client';

import { useState, useCallback } from 'react';
import { VoiceRecorder } from './VoiceRecorder';
import { LiveTranscript } from './LiveTranscript';
import { VoiceActivityDetector } from './VoiceActivityDetector';
import { VoiceProcessingResult } from '@/lib/openai';

interface VoiceInterfaceProps {
  onTaskIdentified?: (result: VoiceProcessingResult) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function VoiceInterface({
  onTaskIdentified,
  onError,
  className = '',
}: VoiceInterfaceProps) {
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [isVADEnabled, setIsVADEnabled] = useState(false);
  const [volume, setVolume] = useState(0);
  const [processingHistory, setProcessingHistory] = useState<VoiceProcessingResult[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const handleTranscriptionComplete = useCallback((result: VoiceProcessingResult) => {
    if (result.success && result.transcription.text) {
      setCurrentTranscript(result.transcription.text);
      setCurrentConfidence(result.transcription.confidence);
      
      // Add to processing history
      setProcessingHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
      
      // Extract painting keywords for task identification
      const text = result.transcription.text.toLowerCase();
      if (text.includes('måla') || text.includes('spackla') || text.includes('grundmåla')) {
        onTaskIdentified?.(result); // Pass the full result object
      }
    }
  }, [onTaskIdentified]);

  const handleError = useCallback((error: string) => {
    onError?.(error);
  }, [onError]);

  const handleVoiceStart = useCallback(() => {
    setIsRecording(true);
  }, []);

  const handleVoiceEnd = useCallback(() => {
    setIsRecording(false);
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
  }, []);

  const handleKeywordClick = useCallback((keyword: string, type: 'task' | 'surface' | 'quantity' | 'modifier') => {
    // Could implement keyword-based actions here
    console.log(`Clicked ${type}: ${keyword}`);
  }, []);

  const clearHistory = useCallback(() => {
    setProcessingHistory([]);
    setCurrentTranscript('');
    setCurrentConfidence(0);
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          🎤 Röststyrning
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Prata på svenska om målning och spackling
        </p>
      </div>

      {/* Voice Activity Detector */}
      <VoiceActivityDetector
        onVoiceStart={handleVoiceStart}
        onVoiceEnd={handleVoiceEnd}
        onVolumeChange={handleVolumeChange}
        enabled={isVADEnabled}
      />

      {/* VAD Toggle */}
      <div className="flex justify-center">
        <button
          onClick={() => setIsVADEnabled(!isVADEnabled)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isVADEnabled
              ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {isVADEnabled ? 'Stäng av VAD' : 'Aktivera VAD'}
        </button>
      </div>

      {/* Voice Recorder */}
      <VoiceRecorder
        onTranscriptionComplete={handleTranscriptionComplete}
        onError={handleError}
      />

      {/* Live Transcript */}
      <LiveTranscript
        transcript={currentTranscript}
        confidence={currentConfidence}
        isActive={isRecording}
        onKeywordClick={handleKeywordClick}
      />

      {/* Processing History */}
      {processingHistory.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Senaste transkriptioner
            </h3>
            <button
              onClick={clearHistory}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Rensa
            </button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {processingHistory.map((result, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-mono">
                      "{result.transcription.text}"
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Förtroende: {(result.transcription.confidence * 100).toFixed(1)}% | 
                      Tid: {result.processingTime}ms | 
                      Språk: {result.transcription.language}
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ml-2 mt-1 ${
                    result.success ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          💡 Tips för bästa resultat:
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Prata tydligt och i normal hastighet</li>
          <li>• Använd svenska ord för målning: "bredspackla", "grundmåla", "täckmåla"</li>
          <li>• Nämn ytor: "väggar", "tak", "golv", "dörrar", "fönster"</li>
          <li>• Använd svenska decimaler: "5,2 kvadratmeter" (inte "5.2")</li>
          <li>• VAD (Voice Activity Detection) kan automatiskt detektera när du pratar</li>
        </ul>
      </div>
    </div>
  );
}
