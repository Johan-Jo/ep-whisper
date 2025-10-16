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
      className="flex-1 overflow-auto p-6 space-y-6"
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
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="flex justify-center"
            >
              <div 
                className="bg-muted px-3 py-2 rounded-2xl border border-border"
                style={{
                  color: '#ffffff !important',
                  WebkitTextFillColor: '#ffffff !important',
                  textFillColor: '#ffffff !important'
                }}
              >
                <EstimateDisplay text={message.text} />
              </div>
            </motion.div>
          );
        }

        return (
          <motion.div
            key={message.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              message.type === 'user' ? 'bg-chart-1' : 'bg-gradient-to-br from-chart-1 to-chart-2'
            }`}>
              {message.type === 'user' ? (
                <User size={16} className="text-primary-foreground" />
              ) : (
                <Bot size={16} className="text-primary-foreground" />
              )}
            </div>
            <div className={`max-w-[75%] ${message.type === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
              <div
                className={`rounded-2xl px-3 py-2 ${
                  message.type === 'user'
                    ? 'bg-chart-1 text-primary-foreground'
                    : 'bg-card border border-border text-foreground'
                } shadow-sm`}
              >
                <p className="leading-relaxed text-sm">{message.text}</p>
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
              
              <span className="text-[10px] text-muted-foreground mt-1 px-1">{time}</span>
            </div>
          </motion.div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

