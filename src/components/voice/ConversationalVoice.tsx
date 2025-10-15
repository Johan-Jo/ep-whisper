'use client';

import { useState, useEffect, useRef } from 'react';
import { ConversationManager } from '@/lib/conversation';
import { VoiceRecorder } from './VoiceRecorder';

interface ConversationalVoiceProps {
  onComplete: (summary: {
    projectName: string;
    roomName: string;
    measurements: {
      width: number;
      length: number;
      height: number;
      doors?: number;
      windows?: number;
    };
    tasks: string[];
  }) => void;
}

export function ConversationalVoice({ onComplete }: ConversationalVoiceProps) {
  const [manager] = useState(() => new ConversationManager());
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    // Initialize with welcome prompt
    setCurrentPrompt(manager.getCurrentPrompt());
  }, [manager]);
  
  const speak = async (text: string) => {
    try {
      // Use browser's speech synthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'sv-SE';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
        
        return new Promise<void>((resolve) => {
          utterance.onend = () => resolve();
        });
      }
    } catch (error) {
      console.error('Speech synthesis error:', error);
    }
  };
  
  const handleStart = async () => {
    setHasStarted(true);
    await speak(currentPrompt);
  };
  
  const handleTranscription = async (result: any) => {
    // Check if transcription failed or is empty
    if (!result.success || !result.transcription?.text) {
      const errorMessage = 'Jag hörde inte vad du sa. Försök igen.';
      setTranscript(prev => [...prev, `⚠️ ${errorMessage}`]);
      await speak(errorMessage);
      // Repeat the current question
      await new Promise(resolve => setTimeout(resolve, 1000));
      await speak(currentPrompt);
      return;
    }
    
    const userInput = result.transcription.text.trim();
    
    // Check if input is too short
    if (userInput.length < 2) {
      const errorMessage = 'Jag hörde inte tydligt. Kan du upprepa?';
      setTranscript(prev => [...prev, `⚠️ ${errorMessage}`]);
      await speak(errorMessage);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await speak(currentPrompt);
      return;
    }
    
    setTranscript(prev => [...prev, `Du: ${userInput}`]);
    
    // Process the input
    const response = manager.processInput(userInput);
    
    if (response.success) {
      setTranscript(prev => [...prev, `System: ${response.message}`]);
      
      // Speak the response
      if (response.nextPrompt) {
        setCurrentPrompt(response.nextPrompt);
        await speak(response.nextPrompt);
      }
      
      // Check if complete
      if (manager.isComplete()) {
        const summary = manager.getSummary();
        setTranscript(prev => [...prev, '✅ Konversation klar! Genererar offert...']);
        await speak('Din offert är klar! Du kan nu se resultatet.');
        onComplete(summary);
      }
    } else {
      setTranscript(prev => [...prev, `⚠️ ${response.message}`]);
      if (response.nextPrompt) {
        await speak(response.nextPrompt);
      }
    }
  };
  
  const handleReset = () => {
    manager.reset();
    setTranscript([]);
    setCurrentPrompt(manager.getCurrentPrompt());
    setHasStarted(false);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };
  
  const state = manager.getState();
  
  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-lime-400">Konversationsflöde</h3>
          <button
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-white"
          >
            Börja om
          </button>
        </div>
        
        <div className="flex items-center gap-2 text-xs">
          <span className={state.step === 'welcome' ? 'text-lime-400' : state.projectName ? 'text-green-500' : 'text-gray-500'}>
            ① Projekt
          </span>
          <span className="text-gray-600">→</span>
          <span className={state.step === 'project_name' ? 'text-lime-400' : state.roomName ? 'text-green-500' : 'text-gray-500'}>
            ② Rum
          </span>
          <span className="text-gray-600">→</span>
          <span className={state.step === 'room_measurements' ? 'text-lime-400' : state.measurements ? 'text-green-500' : 'text-gray-500'}>
            ③ Mått
          </span>
          <span className="text-gray-600">→</span>
          <span className={state.step === 'tasks' ? 'text-lime-400' : state.tasks.length > 0 ? 'text-green-500' : 'text-gray-500'}>
            ④ Uppgifter
          </span>
          <span className="text-gray-600">→</span>
          <span className={state.step === 'complete' ? 'text-green-500' : 'text-gray-500'}>
            ⑤ Klar
          </span>
        </div>
        
        {/* Current Info */}
        <div className="mt-3 text-xs text-gray-400 space-y-1">
          {state.projectName && <div>📁 Projekt: {state.projectName}</div>}
          {state.roomName && <div>🏠 Rum: {state.roomName}</div>}
          {state.measurements && (
            <div>📏 Mått: {state.measurements.width}×{state.measurements.length}×{state.measurements.height}m</div>
          )}
          {state.tasks.length > 0 && (
            <div>✅ Uppgifter: {state.tasks.length} st</div>
          )}
        </div>
      </div>
      
      {/* Current Prompt */}
      <div className="bg-gray-900 rounded-lg p-4 border border-lime-500/30">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-lime-400">💬 Aktuell fråga:</div>
          {hasStarted && (
            <button
              onClick={() => speak(currentPrompt)}
              className="text-xs text-gray-400 hover:text-lime-400 transition-colors"
            >
              🔊 Upprepa
            </button>
          )}
        </div>
        <div className="text-white">{currentPrompt}</div>
      </div>
      
      {/* Voice Recorder */}
      {!hasStarted ? (
        <button
          onClick={handleStart}
          className="w-full bg-lime-500 hover:bg-lime-600 text-black font-semibold py-4 px-6 rounded-lg transition-colors"
        >
          🎤 Starta konversation
        </button>
      ) : (
        <VoiceRecorder
          onTranscriptionComplete={handleTranscription}
          onError={(error) => {
            console.error('Voice error:', error);
            setTranscript(prev => [...prev, `❌ Fel: ${error.message}`]);
          }}
        />
      )}
      
      {/* Transcript */}
      {transcript.length > 0 && (
        <div className="bg-black rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-lime-400 mb-2">Konversation</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {transcript.map((line, idx) => (
              <div
                key={idx}
                className={`text-sm ${
                  line.startsWith('Du:') 
                    ? 'text-blue-400' 
                    : line.startsWith('System:')
                    ? 'text-green-400'
                    : line.startsWith('⚠️')
                    ? 'text-yellow-400'
                    : 'text-lime-400'
                }`}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

