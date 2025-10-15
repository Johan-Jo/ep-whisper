'use client';

import { useState, useEffect, useRef } from 'react';
import { ConversationManager } from '@/lib/conversation';
import { ProgressIndicator } from './ProgressIndicator';
import { ConversationHistory, ConversationMessage } from './ConversationHistory';
import { HoldToTalkButton } from './HoldToTalkButton';
import { VoiceConfirmation } from './VoiceConfirmation';
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
  estimate?: string;
  isGeneratingEstimate?: boolean;
}

export function MobileVoiceLayout({ onComplete, estimate, isGeneratingEstimate }: MobileVoiceLayoutProps) {
  const [manager] = useState(() => new ConversationManager());
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [completedSteps, setCompletedSteps] = useState<ConversationStep[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<ConversationStep>('client_name');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [pendingTranscription, setPendingTranscription] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup MediaRecorder on unmount
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        console.log('🧹 Cleaning up MediaRecorder on unmount');
        mediaRecorder.stop();
      }
    };
  }, [mediaRecorder]);
  
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
      
      // Set a timeout to force stop recording after 30 seconds (safety mechanism)
      recordingTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Recording timeout - force stopping');
        handleStopRecording();
      }, 30000);
      
    } catch (error) {
      console.error('Recording error:', error);
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]); // Error pattern
      }
    }
  };
  
  const handleStopRecording = () => {
    console.log('🛑 Stop recording called');
    
    // Clear timeout
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    
    // Always stop recording state immediately
    setIsRecording(false);
    setLiveTranscript(''); // Clear live transcript
    
    // Stop MediaRecorder if it exists and is recording
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      console.log('🛑 Stopping MediaRecorder...');
      try {
        mediaRecorder.stop();
      } catch (error) {
        console.error('Error stopping MediaRecorder:', error);
      }
    }
  };
  
  const handleAudioRecorded = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
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
      
      // Show confirmation UI instead of immediately processing
      setPendingTranscription(transcription);
      setShowConfirmation(true);
      
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
  
  // Handle confirmation actions
  const handleConfirmTranscription = async () => {
    setShowConfirmation(false);
    setIsProcessing(true);
    
    try {
      // Add user message to chat
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: pendingTranscription,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Process with conversation manager
      const response = manager.processInput(pendingTranscription);
      
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
      console.error('Error processing confirmed transcription:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleRetryTranscription = () => {
    setShowConfirmation(false);
    setPendingTranscription('');
    // User can now record again
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
        
        {/* Live Transcript Display */}
        {isRecording && (
          <div className="mobile-live-transcript">
            <div className="mobile-transcript-bubble">
              <p className="mobile-transcript-label">🎤 Spelar in...</p>
              {liveTranscript && (
                <p className="mobile-transcript-text">{liveTranscript}</p>
              )}
              <div className="mobile-recording-indicator">
                <span className="mobile-recording-dot" />
                <span className="mobile-recording-text">REC</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Estimate Display */}
        {isGeneratingEstimate && (
          <div className="mobile-live-transcript">
            <div className="mobile-transcript-bubble">
              <p className="mobile-transcript-label">💰 Genererar offert...</p>
              <div className="mobile-loading-indicator">
                <span className="mobile-loading-dot" />
                <span className="mobile-loading-dot" />
                <span className="mobile-loading-dot" />
              </div>
            </div>
          </div>
        )}
        
        {estimate && !isGeneratingEstimate && (
          <div className="mobile-live-transcript">
            <div className="mobile-transcript-bubble">
              <p className="mobile-transcript-label">✅ Offert klar!</p>
              <div className="mobile-estimate-content">
                <pre className="mobile-estimate-text">{estimate}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer with Hold-to-Talk Button */}
      <div className="mobile-footer mobile-safe-bottom mobile-no-select">
        <HoldToTalkButton
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          isRecording={isRecording}
          isProcessing={isProcessing || showConfirmation}
          disabled={manager.isComplete() || isGeneratingEstimate}
        />
      </div>
      
      {/* Voice Confirmation Modal */}
      <VoiceConfirmation
        transcription={pendingTranscription}
        onConfirm={handleConfirmTranscription}
        onRetry={handleRetryTranscription}
        isVisible={showConfirmation}
      />
      
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
        
        .mobile-live-transcript {
          position: fixed;
          bottom: 280px;
          left: 16px;
          right: 16px;
          z-index: 50;
          animation: slide-up 250ms ease-out;
        }
        
        .mobile-transcript-bubble {
          background-color: #1A1A1A;
          border: 2px solid #BFFF00;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        
        .mobile-loading-indicator {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-top: 12px;
        }
        
        .mobile-loading-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #BFFF00;
          animation: pulse 1.4s ease-in-out infinite both;
        }
        
        .mobile-loading-dot:nth-child(1) {
          animation-delay: -0.32s;
        }
        
        .mobile-loading-dot:nth-child(2) {
          animation-delay: -0.16s;
        }
        
        .mobile-estimate-content {
          margin-top: 12px;
          max-height: 200px;
          overflow-y: auto;
        }
        
        .mobile-estimate-text {
          color: #BFFF00;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
          font-size: 12px;
          line-height: 1.4;
          white-space: pre-wrap;
          margin: 0;
        }
        
        .mobile-transcript-label {
          color: #BFFF00;
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 8px 0;
        }
        
        .mobile-transcript-text {
          color: #FFFFFF;
          font-size: 18px;
          line-height: 1.4;
          margin: 0;
          min-height: 24px;
        }
        
        .mobile-recording-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
        }
        
        .mobile-recording-dot {
          width: 8px;
          height: 8px;
          background-color: #FF4444;
          border-radius: 50%;
          animation: pulse 1s ease-in-out infinite;
        }
        
        .mobile-recording-text {
          color: #FF4444;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1px;
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}

