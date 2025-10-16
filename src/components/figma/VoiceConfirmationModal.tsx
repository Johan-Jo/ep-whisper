'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Check } from 'lucide-react';

interface VoiceConfirmationModalProps {
  isOpen: boolean;
  transcript: string;
  onRetry: () => void;
  onConfirm: () => void;
}

export function VoiceConfirmationModal({
  isOpen,
  transcript,
  onRetry,
  onConfirm
}: VoiceConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          onClick={onRetry}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-chart-1/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-chart-1" />
              </div>
              <h3 className="text-foreground mb-2">
                Hörde jag dig rätt?
              </h3>
              <p className="text-muted-foreground">
                Bekräfta att transkriptionen är korrekt
              </p>
            </div>

            <div className="mb-6">
              <div className="bg-muted/50 border border-border rounded-2xl p-4">
                <p className="text-foreground leading-relaxed">
                  &ldquo;{transcript}&rdquo;
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onRetry}
                className="flex-1 min-h-12 bg-background border-2 border-border text-foreground rounded-xl hover:bg-muted transition-all flex items-center justify-center gap-2"
                style={{ fontWeight: 600 }}
              >
                <RotateCcw size={18} />
                Prata om
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 min-h-12 bg-gradient-to-br from-chart-1 to-chart-2 text-primary-foreground rounded-xl hover:shadow-lg hover:shadow-chart-1/20 transition-all flex items-center justify-center gap-2"
                style={{ fontWeight: 600 }}
              >
                <Check size={18} />
                Fortsätt
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

