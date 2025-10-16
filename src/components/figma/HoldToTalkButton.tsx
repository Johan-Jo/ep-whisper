'use client';

import { Mic, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface HoldToTalkButtonProps {
  state: 'idle' | 'pressed' | 'recording' | 'processing' | 'disabled';
  onPress: () => void;
  onRelease: () => void;
}

export function HoldToTalkButton({ state, onPress, onRelease }: HoldToTalkButtonProps) {
  const getButtonClasses = () => {
    switch (state) {
      case 'idle':
        return 'bg-gradient-to-br from-chart-1 to-chart-2 border-chart-1/20 hover:shadow-[0_25px_50px_rgba(0,0,0,0.35)] hover:shadow-chart-1/50 hover:scale-105';
      case 'pressed':
        return 'bg-gradient-to-br from-chart-1/95 to-chart-2/95 border-chart-1/20 scale-95';
      case 'recording':
        return 'bg-gradient-to-br from-chart-1 to-chart-2 border-chart-1/20 shadow-[0_30px_60px_rgba(0,0,0,0.5)] shadow-chart-1/60';
      case 'processing':
        return 'bg-gradient-to-br from-muted to-muted border-border shadow-[0_20px_40px_rgba(0,0,0,0.3)]';
      case 'disabled':
        return 'bg-muted border-border opacity-40 shadow-[0_8px_20px_rgba(0,0,0,0.2)]';
    }
  };

  const getLabelText = () => {
    switch (state) {
      case 'idle':
        return 'Håll ned för att prata';
      case 'pressed':
        return 'Förbereder...';
      case 'recording':
        return 'Spelar in...';
      case 'processing':
        return 'Bearbetar...';
      case 'disabled':
        return 'Inaktiverad';
    }
  };

  const getLabelClasses = () => {
    switch (state) {
      case 'idle':
      case 'pressed':
      case 'recording':
        return 'text-chart-1';
      case 'processing':
        return 'text-muted-foreground';
      case 'disabled':
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="sticky bottom-0 px-6 pt-6 pb-0 bg-[rgba(10,10,10,0.8)] backdrop-blur-xl border-t border-neutral-800">
      <div className="flex flex-col items-center h-[220px]">
        {/* Button Container */}
        <div className="relative w-[180px] h-[180px] mb-4">
          {/* Outer Ring - always visible */}
          <div className="absolute inset-0 border-2 border-[rgba(20,71,230,0.5)] rounded-full" />
          
          {/* Button */}
          <motion.button
            animate={{ 
              scale: state === 'pressed' ? 0.95 : 1,
              y: state === 'pressed' ? 2 : 0
            }}
            whileHover={state === 'idle' ? { 
              scale: 1.02, 
              transition: { duration: 0.2, ease: "easeOut" }
            } : {}}
            onPointerDown={(e) => {
              e.preventDefault();
              if (state !== 'disabled') onPress();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              if (state !== 'disabled') onRelease();
            }}
            onPointerLeave={(e) => {
              e.preventDefault();
              if (state !== 'disabled') onRelease();
            }}
            onContextMenu={(e) => {
              e.preventDefault();
            }}
            disabled={state === 'disabled'}
            className={`absolute inset-[31px] w-[118px] h-[118px] rounded-full flex items-center justify-center transition-all duration-200 ${
              state === 'idle' || state === 'pressed' || state === 'recording'
                ? 'bg-gradient-to-br from-chart-1 to-chart-2'
                : 'bg-muted'
            }`}
            style={{
              touchAction: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              cursor: state === 'disabled' ? 'not-allowed' : 'pointer',
              boxShadow: state === 'idle' 
                ? 'inset 0 4px 8px rgba(255,255,255,0.25), inset 0 -4px 8px rgba(0,0,0,0.15), 0 20px 40px rgba(0,0,0,0.3)'
                : state === 'pressed'
                ? 'inset 0 6px 12px rgba(0,0,0,0.25), inset 0 -2px 4px rgba(255,255,255,0.15), 0 8px 20px rgba(0,0,0,0.2)'
                : state === 'recording'
                ? 'inset 0 4px 8px rgba(255,255,255,0.35), inset 0 -4px 8px rgba(0,0,0,0.15), 0 25px 50px rgba(0,0,0,0.4)'
                : '0 4px 8px rgba(0,0,0,0.15)'
            }}
          >
            {state === 'recording' && (
              <>
                <motion.div
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-chart-1"
                />
                <motion.div
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0, 0.3]
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                  className="absolute inset-0 rounded-full bg-chart-1"
                />
              </>
            )}

            <div className="relative z-10">
              {state === 'idle' || state === 'pressed' ? (
                <Mic size={56} className="text-neutral-900 drop-shadow-[0px_4px_8px_rgba(0,0,0,0.15)]" />
              ) : state === 'recording' ? (
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: ['24px', '56px', '24px']
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: 'easeInOut'
                      }}
                      className="w-2 bg-neutral-900 rounded-full shadow-lg"
                      style={{ minHeight: '24px' }}
                    />
                  ))}
                </div>
              ) : state === 'processing' ? (
                <Loader2 size={56} className="animate-spin text-chart-1" />
              ) : null}
            </div>
          </motion.button>
        </div>

        {/* Label */}
        <motion.p
          animate={{ 
            opacity: state === 'recording' ? [1, 0.6, 1] : 1 
          }}
          className={`text-base text-center ${getLabelClasses()} leading-none`}
          style={{ fontWeight: 700, fontFamily: 'Arimo, sans-serif' }}
          transition={
            state === 'recording'
              ? { duration: 2, repeat: Infinity }
              : undefined
          }
        >
          {getLabelText()}
        </motion.p>
      </div>
    </div>
  );
}

