'use client';

import { useEffect, useRef } from 'react';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  step?: string;
}

interface ConversationHistoryProps {
  messages: ConversationMessage[];
  onEditStep?: (messageId: string) => void;
  allowEdit?: boolean;
}

export function ConversationHistory({ 
  messages, 
  onEditStep, 
  allowEdit = false 
}: ConversationHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [messages]);
  
  const handleBubbleTap = (message: ConversationMessage) => {
    if (allowEdit && message.role === 'user' && onEditStep) {
      onEditStep(message.id);
    }
  };
  
  return (
    <div 
      ref={scrollRef}
      className="mobile-conversation-history mobile-scroll-smooth mobile-scrollbar-hidden"
    >
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={`mobile-message-wrapper mobile-message-${message.role} mobile-slide-up`}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div
            className={`mobile-message-bubble mobile-bubble-${message.role} ${
              allowEdit && message.role === 'user' ? 'mobile-bubble-editable' : ''
            }`}
            onClick={() => handleBubbleTap(message)}
          >
            <p className="mobile-message-text">{message.text}</p>
            {allowEdit && message.role === 'user' && (
              <svg
                className="mobile-edit-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            )}
          </div>
          <span className={`mobile-message-timestamp mobile-timestamp-${message.role}`}>
            {message.timestamp.toLocaleTimeString('sv-SE', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      ))}
      
      {messages.length === 0 && (
        <div className="mobile-empty-state">
          <p className="mobile-empty-text">Konversationen börjar snart...</p>
        </div>
      )}
      
      <style jsx>{`
        .mobile-conversation-history {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background-color: #0A0A0A;
          min-height: 0; /* Allow flex child to shrink */
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }
        
        .mobile-message-wrapper {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .mobile-message-user {
          align-items: flex-end;
        }
        
        .mobile-message-assistant {
          align-items: flex-start;
        }
        
        .mobile-message-system {
          align-items: center;
        }
        
        .mobile-message-bubble {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 16px;
          position: relative;
          word-wrap: break-word;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          transition: all 250ms ease;
        }
        
        .mobile-bubble-user {
          background-color: #BFFF00;
          color: #000000;
          border-bottom-right-radius: 4px;
        }
        
        .mobile-bubble-assistant {
          background-color: #1A1A1A;
          color: #FFFFFF;
          border: 1px solid #BFFF00;
          border-bottom-left-radius: 4px;
        }
        
        .mobile-bubble-system {
          background-color: transparent;
          color: #BFFF00;
          font-style: italic;
          text-align: center;
          border: none;
          box-shadow: none;
        }
        
        .mobile-bubble-editable {
          cursor: pointer;
          padding-right: 40px;
        }
        
        .mobile-bubble-editable:active {
          transform: scale(0.98);
          box-shadow: 0 0 0 2px #BFFF00;
        }
        
        .mobile-message-text {
          margin: 0;
          font-size: 16px;
          line-height: 1.5;
        }
        
        .mobile-edit-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: #000000;
          opacity: 0.6;
        }
        
        .mobile-bubble-user:active .mobile-edit-icon {
          opacity: 1;
        }
        
        .mobile-message-timestamp {
          font-size: 11px;
          font-weight: 400;
          padding: 0 8px;
        }
        
        .mobile-timestamp-user {
          color: #404040;
          text-align: right;
        }
        
        .mobile-timestamp-assistant {
          color: #404040;
          text-align: left;
        }
        
        .mobile-timestamp-system {
          color: #404040;
          text-align: center;
        }
        
        .mobile-empty-state {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .mobile-empty-text {
          color: #404040;
          font-size: 16px;
          font-style: italic;
          margin: 0;
        }
        
        /* Smooth entrance animation */
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
        
        .mobile-slide-up {
          animation: slide-up 250ms ease-out forwards;
        }
        
        /* Responsive adjustments */
        @media (max-width: 375px) {
          .mobile-message-bubble {
            max-width: 90%;
            padding: 10px 14px;
          }
          
          .mobile-message-text {
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
}

