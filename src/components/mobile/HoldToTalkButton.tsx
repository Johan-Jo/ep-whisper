'use client';

import { useRef, useState, useEffect } from 'react';

interface HoldToTalkButtonProps {
  onStartRecording: () => void;
  onStopRecording: () => void;
  isRecording: boolean;
  isProcessing: boolean;
  disabled?: boolean;
}

export function HoldToTalkButton({
  onStartRecording,
  onStopRecording,
  isRecording,
  isProcessing,
  disabled = false,
}: HoldToTalkButtonProps) {
  const [isTouching, setIsTouching] = useState(false);
  const touchStartTimeRef = useRef<number>(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const MIN_HOLD_DURATION = 200; // Minimum 200ms to prevent accidental taps
  
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (disabled || isProcessing) return;
    
    setIsTouching(true);
    touchStartTimeRef.current = Date.now();
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10); // Light tap
    }
    
    // Start recording after minimum hold check
    setTimeout(() => {
      if (isTouching && Date.now() - touchStartTimeRef.current >= MIN_HOLD_DURATION) {
        onStartRecording();
      }
    }, MIN_HOLD_DURATION);
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (disabled || isProcessing) return;
    
    setIsTouching(false);
    const holdDuration = Date.now() - touchStartTimeRef.current;
    
    // Only stop recording if we actually started (held long enough)
    if (holdDuration >= MIN_HOLD_DURATION && isRecording) {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(20); // Medium tap
      }
      onStopRecording();
    }
  };
  
  const handleTouchCancel = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsTouching(false);
    
    if (isRecording) {
      onStopRecording();
    }
  };
  
  // Mouse events for desktop testing
  const handleMouseDown = () => {
    if (disabled || isProcessing) return;
    setIsTouching(true);
    touchStartTimeRef.current = Date.now();
    
    setTimeout(() => {
      if (isTouching && Date.now() - touchStartTimeRef.current >= MIN_HOLD_DURATION) {
        onStartRecording();
      }
    }, MIN_HOLD_DURATION);
  };
  
  const handleMouseUp = () => {
    if (disabled || isProcessing) return;
    setIsTouching(false);
    const holdDuration = Date.now() - touchStartTimeRef.current;
    
    if (holdDuration >= MIN_HOLD_DURATION && isRecording) {
      onStopRecording();
    }
  };
  
  const getButtonState = () => {
    if (disabled) return 'disabled';
    if (isProcessing) return 'processing';
    if (isRecording) return 'recording';
    return 'idle';
  };
  
  const getButtonText = () => {
    if (disabled) return 'Inaktiverad';
    if (isProcessing) return 'Bearbetar...';
    if (isRecording) return 'Spelar in...';
    return 'Håll för att prata';
  };
  
  const state = getButtonState();
  
  return (
    <div className="mobile-hold-button-container">
      <button
        ref={buttonRef}
        className={`mobile-hold-button mobile-hold-button-${state} mobile-no-select`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        aria-label={getButtonText()}
      >
        {/* Mic Icon (Idle) */}
        {state === 'idle' && (
          <svg
            className="mobile-button-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
        
        {/* Waveform Animation (Recording) */}
        {state === 'recording' && (
          <div className="mobile-waveform">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="mobile-waveform-bar"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        )}
        
        {/* Spinner (Processing) */}
        {state === 'processing' && (
          <div className="mobile-spinner" />
        )}
      </button>
      
      <p className={`mobile-button-label mobile-button-label-${state}`}>
        {getButtonText()}
      </p>
      
      <style jsx>{`
        .mobile-hold-button-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 24px;
        }
        
        .mobile-hold-button {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
          transition: all 150ms ease;
          position: relative;
        }
        
        .mobile-hold-button-idle {
          background-color: #000000;
          border: 3px solid #BFFF00;
        }
        
        .mobile-hold-button-idle:active {
          transform: scale(0.95);
          background-color: #1A1A1A;
        }
        
        .mobile-hold-button-recording {
          background-color: #BFFF00;
          border: 3px solid #BFFF00;
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .mobile-hold-button-processing {
          background-color: #1A1A1A;
          border: 3px solid #BFFF00;
        }
        
        .mobile-hold-button-disabled {
          background-color: #1A1A1A;
          border: 3px solid #404040;
          cursor: not-allowed;
          opacity: 0.5;
        }
        
        .mobile-button-icon {
          width: 64px;
          height: 64px;
          color: #BFFF00;
        }
        
        .mobile-hold-button-recording .mobile-button-icon {
          color: #000000;
        }
        
        .mobile-waveform {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          height: 80px;
        }
        
        .mobile-waveform-bar {
          width: 6px;
          background-color: #000000;
          border-radius: 3px;
          animation: waveform-pulse 1s ease-in-out infinite;
        }
        
        .mobile-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #404040;
          border-top-color: #BFFF00;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .mobile-button-label {
          font-size: 18px;
          font-weight: 600;
          text-align: center;
          margin: 0;
          transition: color 250ms ease;
        }
        
        .mobile-button-label-idle {
          color: #BFFF00;
        }
        
        .mobile-button-label-recording {
          color: #BFFF00;
          animation: pulse 2s ease-in-out infinite;
        }
        
        .mobile-button-label-processing {
          color: #BFFF00;
        }
        
        .mobile-button-label-disabled {
          color: #404040;
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(191, 255, 0, 0.4);
          }
          50% {
            box-shadow: 0 0 40px rgba(191, 255, 0, 0.8);
          }
        }
        
        @keyframes waveform-pulse {
          0%, 100% {
            height: 20px;
          }
          50% {
            height: 60px;
          }
        }
        
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        /* Small phones */
        @media (max-width: 375px) {
          .mobile-hold-button {
            width: 160px;
            height: 160px;
          }
          
          .mobile-button-icon {
            width: 48px;
            height: 48px;
          }
          
          .mobile-button-label {
            font-size: 16px;
          }
        }
        
        /* Tablets and larger */
        @media (min-width: 768px) {
          .mobile-hold-button {
            width: 240px;
            height: 240px;
          }
          
          .mobile-button-icon {
            width: 80px;
            height: 80px;
          }
        }
      `}</style>
    </div>
  );
}

