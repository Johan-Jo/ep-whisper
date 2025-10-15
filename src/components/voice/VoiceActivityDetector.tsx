'use client';

import { useState, useEffect, useRef } from 'react';
import { VoiceActivityDetector as VAD } from '@/lib/openai';

interface VoiceActivityDetectorProps {
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  onVolumeChange?: (volume: number) => void;
  enabled?: boolean;
  className?: string;
}

export function VoiceActivityDetector({
  onVoiceStart,
  onVoiceEnd,
  onVolumeChange,
  enabled = false,
  className = '',
}: VoiceActivityDetectorProps) {
  const [volume, setVolume] = useState(0);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const vadRef = useRef<VAD | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize audio context and VAD
  useEffect(() => {
    if (!enabled) return;

    const initializeVAD = async () => {
      try {
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        // Create audio context
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        
        // Configure analyser
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        
        // Connect stream to analyser
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        // Store references
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        
        setIsInitialized(true);
        setError(null);
        
        // Start volume monitoring
        startVolumeMonitoring();
        
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize voice activity detection';
        setError(errorMsg);
        setIsInitialized(false);
      }
    };

    initializeVAD();

    return () => {
      cleanup();
    };
  }, [enabled]);

  // Cleanup function
  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
    setIsInitialized(false);
    setIsVoiceActive(false);
    setVolume(0);
  };

  // Volume monitoring
  const startVolumeMonitoring = () => {
    const monitorVolume = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      // Calculate average volume
      const average = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
      const normalizedVolume = average / 255; // Normalize to 0-1
      
      setVolume(normalizedVolume);
      onVolumeChange?.(normalizedVolume);

      // Voice activity detection (threshold: 0.1)
      const voiceThreshold = 0.1;
      const wasVoiceActive = isVoiceActive;
      const isVoiceActiveNow = normalizedVolume > voiceThreshold;

      if (isVoiceActiveNow && !wasVoiceActive) {
        setIsVoiceActive(true);
        onVoiceStart?.();
      } else if (!isVoiceActiveNow && wasVoiceActive) {
        setIsVoiceActive(false);
        onVoiceEnd?.();
      }

      if (enabled && isInitialized) {
        animationFrameRef.current = requestAnimationFrame(monitorVolume);
      }
    };

    monitorVolume();
  };

  // Update monitoring when enabled state changes
  useEffect(() => {
    if (enabled && isInitialized) {
      startVolumeMonitoring();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsVoiceActive(false);
      setVolume(0);
    }
  }, [enabled, isInitialized]);

  const getVolumeBarWidth = (): string => {
    return `${Math.min(100, volume * 200)}%`; // Amplify for better visibility
  };

  const getVolumeColor = (): string => {
    if (volume < 0.1) return 'bg-gray-300 dark:bg-gray-600';
    if (volume < 0.3) return 'bg-yellow-400';
    if (volume < 0.6) return 'bg-orange-400';
    return 'bg-red-400';
  };

  const getStatusText = (): string => {
    if (!enabled) return 'VAD inaktiverad';
    if (!isInitialized) return 'Initialiserar...';
    if (isVoiceActive) return 'Röst aktiv';
    return 'Lyssnar...';
  };

  const getStatusColor = (): string => {
    if (!enabled || !isInitialized) return 'text-gray-500';
    if (isVoiceActive) return 'text-green-600 dark:text-green-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Röstaktivitet
        </h3>
        <div className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {/* Volume Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Volymnivå</span>
          <span>{(volume * 100).toFixed(1)}%</span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-100 ${getVolumeColor()}`}
            style={{ width: getVolumeBarWidth() }}
          />
        </div>
        
        {/* Volume threshold indicator */}
        <div className="relative">
          <div className="w-full h-1 bg-gray-300 dark:bg-gray-600 rounded-full">
            <div 
              className="absolute top-0 left-[10%] w-0.5 h-1 bg-gray-500 rounded-full"
              title="Rösttröskel (10%)"
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Tröskel: 10%
          </div>
        </div>
      </div>

      {/* Voice Activity Indicator */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              isVoiceActive 
                ? 'bg-green-500 animate-pulse' 
                : isInitialized 
                  ? 'bg-blue-500' 
                  : 'bg-gray-400'
            }`}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isVoiceActive ? 'Röst detekterad' : isInitialized ? 'Redo' : 'Inaktiv'}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg p-3">
          <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
            VAD-fel:
          </div>
          <div className="text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        </div>
      )}

      {/* Instructions */}
      {enabled && isInitialized && !error && (
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="font-medium mb-1">Instruktioner:</div>
          <ul className="space-y-1 text-xs">
            <li>• Grön indikator = röst aktiv</li>
            <li>• Blå indikator = lyssnar</li>
            <li>• Volymstapeln visar aktuell ljudnivå</li>
            <li>• Tröskel: 10% för röstdetektering</li>
          </ul>
        </div>
      )}
    </div>
  );
}

