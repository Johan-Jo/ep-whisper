'use client';

import { useState, useEffect } from 'react';
import { ConversationManager } from '@/lib/conversation';
import { ProgressIndicator } from './ProgressIndicator';
import { ConversationHistory, ConversationMessage } from './ConversationHistory';
import { HoldToTalkButton } from './HoldToTalkButton';
import type { ConversationStep } from '@/lib/conversation/types';
import { processVoiceInput } from '@/lib/openai/voice';

interface MobileVoiceLayoutProps {
  onComplete: (summary: {
    clientName: string;
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

export function MobileVoiceLayout({ onComplete }: MobileVoiceLayoutProps) {
  const [manager] = useState(() => new ConversationManager());
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [completedSteps, setCompletedSteps] = useState<ConversationStep[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<ConversationStep>('client_name');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  
  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: ConversationMessage = {
      id: 'welcome-0',
      role: 'assistant',
      text: manager.getCurrentPrompt(),
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    setCurrentStep(manager.getState().step);
  }, [manager]);
  
  // Speak the current prompt using OpenAI TTS
  const speak = async (text: string) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) throw new Error('TTS failed');
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      await audio.play();
      
      return new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
      });
    } catch (error) {
      console.error('TTS error:', error);
    }
  };
  
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
          channelCount: 1,
        } 
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await handleAudioRecorded(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks(chunks);
      
    } catch (error) {
      console.error('Recording error:', error);
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]); // Error pattern
      }
    }
  };
  
  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };
  
  const handleAudioRecorded = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Add user's recording message (placeholder until we get transcription)
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: '🎤 Spelar in...',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Process with Whisper
      const result = await processVoiceInput(audioBlob, {
        language: 'sv',
        enableConfirmation: false,
        confidenceThreshold: 0.3,
      });
      
      if (!result.success || !result.transcription) {
        throw new Error('Transcription failed');
      }
      
      const transcription = result.transcription.text;
      
      // Update user message with actual transcription
      setMessages(prev =>
        prev.map(msg =>
          msg.id === userMessage.id
            ? { ...msg, text: transcription }
            : msg
        )
      );
      
      // Process with conversation manager
      const response = manager.processInput(transcription);
      
      if (response.success && response.message) {
        // Add assistant confirmation
        const confirmMessage: ConversationMessage = {
          id: `confirm-${Date.now()}`,
          role: 'system',
          text: response.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, confirmMessage]);
      }
      
      // Update step
      const newStep = manager.getState().step;
      setCurrentStep(newStep);
      
      // Add completed step
      if (response.success) {
        setCompletedSteps(prev => {
          const steps: ConversationStep[] = ['client_name', 'project_name', 'room_measurements', 'tasks', 'confirmation', 'complete'];
          const currentIndex = steps.indexOf(newStep);
          return steps.slice(0, currentIndex);
        });
      }
      
      // Check if complete
      if (manager.isComplete()) {
        const summary = manager.getSummary();
        onComplete(summary);
      } else if (response.nextPrompt) {
        // Ask next question
        await speak(response.nextPrompt);
        
        const nextMessage: ConversationMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: response.nextPrompt,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, nextMessage]);
      }
      
    } catch (error) {
      console.error('Processing error:', error);
      
      const errorMessage: ConversationMessage = {
        id: `error-${Date.now()}`,
        role: 'system',
        text: 'Jag hörde inte riktigt. Försök igen.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]); // Error pattern
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="mobile-voice-layout mobile-full-height mobile-no-overscroll">
      {/* Header with Progress */}
      <div className="mobile-header mobile-safe-top">
        <ProgressIndicator 
          currentStep={currentStep}
          completedSteps={completedSteps}
        />
      </div>
      
      {/* Conversation Area */}
      <div className="mobile-conversation-area">
        <ConversationHistory 
          messages={messages}
          allowEdit={false}
        />
      </div>
      
      {/* Footer with Hold-to-Talk Button */}
      <div className="mobile-footer mobile-safe-bottom mobile-no-select">
        <HoldToTalkButton
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          isRecording={isRecording}
          isProcessing={isProcessing}
          disabled={manager.isComplete()}
        />
      </div>
      
      <style jsx>{`
        .mobile-voice-layout {
          display: flex;
          flex-direction: column;
          background-color: #0A0A0A;
          overflow: hidden;
        }
        
        .mobile-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background-color: #000000;
        }
        
        .mobile-conversation-area {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }
        
        .mobile-footer {
          position: sticky;
          bottom: 0;
          z-index: 100;
          background-color: #000000;
          border-top: 1px solid #1A1A1A;
        }
        
        .mobile-full-height {
          height: 100vh;
          height: 100dvh;
        }
        
        .mobile-no-overscroll {
          overscroll-behavior: none;
          -webkit-overscroll-behavior: none;
        }
        
        .mobile-no-select {
          user-select: none;
          -webkit-user-select: none;
        }
        
        .mobile-safe-top {
          padding-top: env(safe-area-inset-top);
        }
        
        .mobile-safe-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}

