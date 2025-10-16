'use client';

import { motion } from 'framer-motion';
import { Mic, Sparkles, CheckCircle2 } from 'lucide-react';

interface StatusAreaProps {
  status: 'idle' | 'recording' | 'generating' | 'complete';
  transcript?: string;
  estimate?: string;
}

export function StatusArea({ status, transcript, estimate }: StatusAreaProps) {
  if (status === 'idle') return null;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="px-6 pb-4 max-h-[300px] overflow-auto"
    >
      <div className="bg-gradient-to-br from-card to-muted/30 border border-border rounded-2xl p-5 shadow-lg backdrop-blur-sm">
        {status === 'recording' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-3 h-3 rounded-full bg-destructive"
                />
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 w-3 h-3 rounded-full bg-destructive"
                />
              </div>
              <Mic size={18} className="text-chart-1" />
              <span className="text-foreground" style={{ fontWeight: 600 }}>
                Spelar in...
              </span>
            </div>
            {transcript && (
              <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                <p className="text-foreground leading-relaxed">{transcript}</p>
              </div>
            )}
          </div>
        )}

        {status === 'generating' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles size={18} className="text-chart-1" />
              <span className="text-foreground" style={{ fontWeight: 600 }}>
                Genererar offert...
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                  className="w-2.5 h-2.5 rounded-full bg-chart-1"
                />
              ))}
            </div>
          </div>
        )}

        {status === 'complete' && estimate && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-chart-1" />
              <span className="text-foreground" style={{ fontWeight: 600 }}>
                Offert klar!
              </span>
            </div>
            <div className="bg-background/50 rounded-xl p-4 max-h-[200px] overflow-auto border border-border/50">
              <pre
                className="text-white text-[13px] whitespace-pre-wrap leading-relaxed"
                style={{ fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace' }}
              >
                {estimate}
              </pre>
            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
}

