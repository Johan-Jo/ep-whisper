'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { User, Bot } from 'lucide-react';
import { ConfirmationButtons } from './ConfirmationButtons';
import { EstimateDisplay } from './EstimateDisplay';

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
}

interface ConversationAreaProps {
  messages: Message[];
  showConfirmationButtons?: boolean;
  onReviewEstimate?: () => void;
  onAddMoreTasks?: () => void;
}

export function ConversationArea({ 
  messages, 
  showConfirmationButtons = false, 
  onReviewEstimate, 
  onAddMoreTasks 
}: ConversationAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {messages.map((message) => {
        const time = message.timestamp.toLocaleTimeString('sv-SE', {
          hour: '2-digit',
          minute: '2-digit'
        });

        if (message.type === 'system') {
          return (
            <motion.div
              key={message.id}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="flex justify-center"
            >
              <div className="bg-neutral-800 border border-neutral-800 px-4 py-2 rounded-full">
                <div className="text-[13px] text-[#a1a1a1] leading-none" style={{ fontFamily: 'Arimo, sans-serif' }}>
                  <EstimateDisplay text={message.text} />
                </div>
              </div>
            </motion.div>
          );
        }

        return (
          <motion.div
            key={message.id}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse justify-start' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.type === 'user' 
                  ? 'bg-[#1447e6]' 
                  : 'bg-neutral-950 border border-neutral-800'
              }`}
            >
              {message.type === 'user' ? (
                <User size={20} className="text-neutral-900" strokeWidth={2} />
              ) : (
                <Bot size={20} className="text-neutral-50" strokeWidth={2} />
              )}
            </div>
            
            {/* Message Content */}
            <div className={`flex flex-col gap-1.5 ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-[#1447e6] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]'
                    : 'bg-neutral-950 border border-neutral-800'
                }`}
                style={{ maxWidth: '287px' }}
              >
                <p 
                  className={`text-base leading-relaxed ${
                    message.type === 'user' ? 'text-neutral-900' : 'text-neutral-50'
                  }`}
                  style={{ fontFamily: 'Arimo, sans-serif' }}
                >
                  {message.text}
                </p>
              </div>
              
              {/* Show confirmation buttons for task completion messages */}
              {message.type === 'assistant' && 
               showConfirmationButtons && 
               message.text.includes('Vill du granska offerten eller lägga till fler arbeten?') && 
               onReviewEstimate && 
               onAddMoreTasks && (
                <ConfirmationButtons
                  onReviewEstimate={onReviewEstimate}
                  onAddMoreTasks={onAddMoreTasks}
                />
              )}
              
              <span className="text-[11px] text-[#a1a1a1] px-1 leading-none" style={{ fontFamily: 'Arimo, sans-serif' }}>
                {time}
              </span>
            </div>
          </motion.div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

