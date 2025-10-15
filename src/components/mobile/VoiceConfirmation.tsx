import React from 'react';

interface VoiceConfirmationProps {
  transcription: string;
  onConfirm: () => void;
  onRetry: () => void;
  isVisible: boolean;
}

export function VoiceConfirmation({ 
  transcription, 
  onConfirm, 
  onRetry, 
  isVisible 
}: VoiceConfirmationProps) {
  if (!isVisible) return null;

  return (
    <div className="mobile-voice-confirmation">
      <div className="mobile-confirmation-bubble">
        <div className="mobile-confirmation-header">
          <h3 className="mobile-confirmation-title">🎤 Bekräfta transkription</h3>
          <p className="mobile-confirmation-subtitle">Hörde jag dig rätt?</p>
        </div>
        
        <div className="mobile-confirmation-content">
          <div className="mobile-transcription-display">
            <p className="mobile-transcription-label">Du sa:</p>
            <p className="mobile-transcription-text">&quot;{transcription}&quot;</p>
          </div>
        </div>
        
        <div className="mobile-confirmation-actions">
          <button 
            className="mobile-confirm-button"
            onClick={onConfirm}
          >
            ✅ Ja, fortsätt
          </button>
          <button 
            className="mobile-retry-button"
            onClick={onRetry}
          >
            🔄 Prata om
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .mobile-voice-confirmation {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fade-in 200ms ease-out;
        }
        
        .mobile-confirmation-bubble {
          background-color: #1A1A1A;
          border: 2px solid #BFFF00;
          border-radius: 20px;
          padding: 24px;
          margin: 16px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
          animation: slide-up 300ms ease-out;
        }
        
        .mobile-confirmation-header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .mobile-confirmation-title {
          color: #BFFF00;
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 8px 0;
        }
        
        .mobile-confirmation-subtitle {
          color: #CCCCCC;
          font-size: 14px;
          margin: 0;
        }
        
        .mobile-confirmation-content {
          margin-bottom: 24px;
        }
        
        .mobile-transcription-display {
          background-color: #2A2A2A;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #444444;
        }
        
        .mobile-transcription-label {
          color: #BFFF00;
          font-size: 12px;
          font-weight: 600;
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .mobile-transcription-text {
          color: #FFFFFF;
          font-size: 16px;
          line-height: 1.4;
          margin: 0;
          font-style: italic;
        }
        
        .mobile-confirmation-actions {
          display: flex;
          gap: 12px;
          flex-direction: column;
        }
        
        .mobile-confirm-button,
        .mobile-retry-button {
          flex: 1;
          padding: 16px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 200ms ease;
          text-align: center;
        }
        
        .mobile-confirm-button {
          background-color: #BFFF00;
          color: #000000;
        }
        
        .mobile-confirm-button:hover {
          background-color: #A3E600;
          transform: translateY(-2px);
        }
        
        .mobile-confirm-button:active {
          transform: translateY(0);
        }
        
        .mobile-retry-button {
          background-color: transparent;
          color: #BFFF00;
          border: 2px solid #BFFF00;
        }
        
        .mobile-retry-button:hover {
          background-color: rgba(191, 255, 0, 0.1);
          transform: translateY(-2px);
        }
        
        .mobile-retry-button:active {
          transform: translateY(0);
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
