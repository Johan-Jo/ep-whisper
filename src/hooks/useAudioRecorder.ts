import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
  hasPermission: boolean;
}

export interface AudioRecorderControls {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  clearRecording: () => void;
  requestPermission: () => Promise<boolean>;
}

export interface UseAudioRecorderOptions {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onError?: (error: string) => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  maxRecordingTime?: number; // in milliseconds
  audioType?: string; // MIME type
  sampleRate?: number;
  channels?: number;
}

// Get supported audio format (browser-only)
const getSupportedAudioType = (): string => {
  // Check if we're in browser environment
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'audio/webm'; // Safe fallback for SSR
  }
  
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg'
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  
  // Fallback to default
  return 'audio/webm';
};

const DEFAULT_OPTIONS: Required<UseAudioRecorderOptions> = {
  onRecordingComplete: () => {},
  onError: () => {},
  onPermissionGranted: () => {},
  onPermissionDenied: () => {},
  maxRecordingTime: 60000, // 60 seconds
  audioType: 'audio/webm', // Safe default for SSR
  sampleRate: 16000, // 16kHz for Whisper
  channels: 1, // Mono for better processing
};

export function useAudioRecorder(options: UseAudioRecorderOptions = {}): AudioRecorderState & AudioRecorderControls {
  const opts = { 
    ...DEFAULT_OPTIONS, 
    ...options,
    // Use browser-safe audio type detection
    audioType: options.audioType || getSupportedAudioType()
  };

  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Check if browser supports MediaRecorder
  const isSupported = typeof MediaRecorder !== 'undefined';

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      const errorMsg = 'Audio recording is not supported in this browser';
      setError(errorMsg);
      opts.onError(errorMsg);
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: opts.sampleRate,
          channelCount: opts.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Stop the stream immediately after permission check
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermission(true);
      setError(null);
      opts.onPermissionGranted();
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(errorMsg);
      setHasPermission(false);
      opts.onError(errorMsg);
      opts.onPermissionDenied();
      return false;
    }
  }, [isSupported, opts]);

  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: opts.sampleRate,
          channelCount: opts.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Try to create MediaRecorder with preferred type, fallback to default if needed
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: opts.audioType,
        });
      } catch (err) {
        // Fallback to default MediaRecorder without mimeType
        console.warn(`Failed to create MediaRecorder with ${opts.audioType}, falling back to default`);
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: opts.audioType });
        const url = URL.createObjectURL(blob);
        
        setAudioBlob(blob);
        setAudioUrl(url);
        opts.onRecordingComplete(blob);

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setIsPaused(false);
      setError(null);
      setRecordingTime(0);
      startTimeRef.current = Date.now();

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setRecordingTime(elapsed);

        // Stop recording if max time reached
        if (elapsed >= opts.maxRecordingTime) {
          stopRecording();
        }
      }, 100);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMsg);
      opts.onError(errorMsg);
      setIsRecording(false);
    }
  }, [hasPermission, isRecording, requestPermission, opts]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setIsPaused(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [isRecording]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current || isPaused) return;

    mediaRecorderRef.current.pause();
    setIsPaused(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [isRecording, isPaused]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current || !isPaused) return;

    mediaRecorderRef.current.resume();
    setIsPaused(false);
    startTimeRef.current = Date.now() - recordingTime;

    // Restart timer
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setRecordingTime(elapsed);

      // Stop recording if max time reached
      if (elapsed >= opts.maxRecordingTime) {
        stopRecording();
      }
    }, 100);
  }, [isRecording, isPaused, recordingTime, stopRecording, opts.maxRecordingTime]);

  // Clear recording
  const clearRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setError(null);
  }, [audioUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return {
    // State
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    audioUrl,
    error,
    hasPermission,
    
    // Controls
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    requestPermission,
  };
}
