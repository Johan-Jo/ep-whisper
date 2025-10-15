'use client';

import type { ConversationStep } from '@/lib/conversation/types';

interface ProgressIndicatorProps {
  currentStep: ConversationStep;
  completedSteps: ConversationStep[];
}

const STEPS: ConversationStep[] = [
  'client_name',
  'project_name',
  'room_measurements',
  'tasks',
  'confirmation',
  'complete',
];

const STEP_LABELS: Record<ConversationStep, string> = {
  client_name: 'Kund',
  project_name: 'Projekt',
  room_measurements: 'Mått',
  tasks: 'Uppgifter',
  confirmation: 'Bekräfta',
  complete: 'Klar',
};

export function ProgressIndicator({ currentStep, completedSteps }: ProgressIndicatorProps) {
  const currentIndex = STEPS.indexOf(currentStep);
  
  const getStepState = (step: ConversationStep, index: number): 'completed' | 'current' | 'future' => {
    if (completedSteps.includes(step)) return 'completed';
    if (step === currentStep) return 'current';
    if (index < currentIndex) return 'completed';
    return 'future';
  };
  
  return (
    <div className="mobile-progress-indicator">
      <div className="mobile-progress-dots">
        {STEPS.map((step, index) => {
          const state = getStepState(step, index);
          
          return (
            <div key={step} className="mobile-progress-step">
              <div
                className={`mobile-progress-dot mobile-progress-dot-${state}`}
                aria-label={`${STEP_LABELS[step]}: ${state}`}
              >
                {state === 'completed' && (
                  <svg
                    className="mobile-progress-check"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {state === 'current' && (
                  <div className="mobile-progress-pulse" />
                )}
              </div>
              <span className={`mobile-progress-label mobile-progress-label-${state}`}>
                {STEP_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="mobile-progress-counter">
        {currentIndex + 1} / {STEPS.length}
      </div>
      
      <style jsx>{`
        .mobile-progress-indicator {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background-color: #000000;
          border-bottom: 1px solid #1A1A1A;
        }
        
        .mobile-progress-dots {
          display: flex;
          gap: 8px;
          flex: 1;
        }
        
        .mobile-progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          flex: 1;
        }
        
        .mobile-progress-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 250ms ease;
          position: relative;
        }
        
        .mobile-progress-dot-completed {
          background-color: #22C55E;
          border: 2px solid #22C55E;
        }
        
        .mobile-progress-dot-current {
          background-color: #BFFF00;
          border: 2px solid #BFFF00;
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .mobile-progress-dot-future {
          background-color: transparent;
          border: 2px solid #404040;
        }
        
        .mobile-progress-check {
          width: 18px;
          height: 18px;
          color: #000000;
        }
        
        .mobile-progress-pulse {
          width: 12px;
          height: 12px;
          background-color: #000000;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }
        
        .mobile-progress-label {
          font-size: 10px;
          font-weight: 500;
          text-align: center;
          white-space: nowrap;
          transition: color 250ms ease;
        }
        
        .mobile-progress-label-completed {
          color: #22C55E;
        }
        
        .mobile-progress-label-current {
          color: #BFFF00;
          font-weight: 700;
        }
        
        .mobile-progress-label-future {
          color: #404040;
        }
        
        .mobile-progress-counter {
          font-size: 14px;
          font-weight: 700;
          color: #BFFF00;
          margin-left: 16px;
          min-width: 48px;
          text-align: right;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(0.9);
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 10px rgba(191, 255, 0, 0.4);
          }
          50% {
            box-shadow: 0 0 20px rgba(191, 255, 0, 0.8);
          }
        }
        
        @media (max-width: 375px) {
          .mobile-progress-dot {
            width: 28px;
            height: 28px;
          }
          
          .mobile-progress-label {
            font-size: 9px;
          }
          
          .mobile-progress-counter {
            font-size: 12px;
            min-width: 40px;
          }
        }
      `}</style>
    </div>
  );
}

