'use client';

import { useState, useCallback } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { processVoiceInput, VoiceProcessingResult } from '@/lib/openai';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  onTranscriptionComplete?: (result: VoiceProcessingResult) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceRecorder({
  onTranscriptionComplete,
  onError,
  disabled = false,
  className = '',
}: VoiceRecorderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTranscription, setLastTranscription] = useState<string>('');
  const [lastConfidence, setLastConfidence] = useState<number>(0);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    error,
    hasPermission,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    requestPermission,
  } = useAudioRecorder({
    maxRecordingTime: 30000, // 30 seconds max
    audioType: 'audio/webm',
    sampleRate: 16000, // 16kHz for Whisper
    channels: 1, // Mono
    onRecordingComplete: async (blob) => {
      if (blob.size === 0) return;
      
      setIsProcessing(true);
      try {
        // Convert blob to ArrayBuffer for processing
        const arrayBuffer = await blob.arrayBuffer();
        
        // Debug: Show audio info
        setDebugInfo(`Audio: ${blob.type}, ${blob.size} bytes, ${Math.round(blob.size / 1000)}KB`);
        console.log('Audio blob info:', {
          type: blob.type,
          size: blob.size,
          sizeKB: Math.round(blob.size / 1000)
        });
        
        // Process voice input (just transcription, no TTS confirmation for conversational mode)
        const result = await processVoiceInput(arrayBuffer, {
          enableConfirmation: false, // Disable TTS confirmation to avoid errors
          confidenceThreshold: 0.3,  // Lower threshold for better acceptance
        });

        if (result.success && result.transcription?.text) {
          setLastTranscription(result.transcription.text);
          setLastConfidence(result.transcription.confidence);
          onTranscriptionComplete?.(result);
        } else {
          // Still call the callback with failed result so conversational mode can handle it
          onTranscriptionComplete?.(result);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Voice processing failed';
        onError?.(errorMsg);
      } finally {
        setIsProcessing(false);
      }
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const handleStartRecording = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    await startRecording();
  }, [hasPermission, requestPermission, startRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleTogglePause = useCallback(() => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  }, [isPaused, pauseRecording, resumeRecording]);

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getButtonText = (): string => {
    if (!hasPermission) return 'Mikrofon Tillstånd';
    if (isProcessing) return 'Bearbetar...';
    if (isRecording) {
      return isPaused ? 'Fortsätt Spela In' : 'Sluta Spela In';
    }
    return 'Börja Spela In';
  };

  const getButtonVariant = (): 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' => {
    if (!hasPermission || isProcessing) return 'secondary';
    if (isRecording) return 'destructive';
    return 'default';
  };

  const isButtonDisabled = disabled || isProcessing;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Recording Controls */}
      <div className="flex items-center justify-center space-x-4">
        <Button
          onClick={hasPermission ? (isRecording ? handleStopRecording : handleStartRecording) : requestPermission}
          variant={getButtonVariant()}
          size="lg"
          disabled={isButtonDisabled}
          className="min-w-[200px]"
        >
          <div className="flex items-center space-x-2">
            {isRecording && !isPaused && (
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
            {isPaused && (
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            )}
            {isProcessing && (
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-spin" />
            )}
            <span>{getButtonText()}</span>
          </div>
        </Button>

        {isRecording && (
          <Button
            onClick={handleTogglePause}
            variant="outline"
            size="sm"
            disabled={isButtonDisabled}
          >
            {isPaused ? 'Fortsätt' : 'Pausa'}
          </Button>
        )}
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-red-500">
            {formatTime(recordingTime)}
          </div>
          <div className="text-sm text-gray-500">
            {isPaused ? 'Pausad' : 'Spelar in...'}
          </div>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="text-center">
          <div className="text-lg text-blue-500">
            Bearbetar röst...
          </div>
          <div className="text-sm text-gray-500">
            Detta kan ta några sekunder
          </div>
        </div>
      )}

      {/* Debug Info */}
      {debugInfo && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
            Debug Info:
          </div>
          <div className="text-sm font-mono text-blue-600 dark:text-blue-400">
            {debugInfo}
          </div>
        </div>
      )}

      {/* Last Transcription */}
      {lastTranscription && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Senaste transkription:
          </div>
          <div className="text-lg font-mono">
            &quot;{lastTranscription}&quot;
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Förtroende: {(lastConfidence * 100).toFixed(1)}%
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg p-4">
          <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
            Fel:
          </div>
          <div className="text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        </div>
      )}

      {/* Permission Status */}
      {!hasPermission && !error && (
        <div className="text-center text-sm text-gray-500">
          Klicka på knappen för att be om tillstånd att använda mikrofonen
        </div>
      )}

      {/* Clear Recording Button */}
      {audioBlob && !isRecording && !isProcessing && (
        <div className="text-center">
          <Button
            onClick={clearRecording}
            variant="outline"
            size="sm"
          >
            Rensa inspelning
          </Button>
        </div>
      )}
    </div>
  );
}
