'use client';

import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Logo } from './Logo';

interface ProgressHeaderProps {
  currentStep: number;
  totalSteps: number;
}

const steps = [
  { id: 1, label: 'Kund' },
  { id: 2, label: 'Projekt' },
  { id: 3, label: 'Mått' },
  { id: 4, label: 'Uppgifter' },
  { id: 5, label: 'Klar' }
];

export function ProgressHeader({ currentStep, totalSteps }: ProgressHeaderProps) {
  return (
    <div className="sticky top-0 px-4 py-3 bg-card/80 backdrop-blur-xl border-b border-border z-50">
      <div className="mb-3">
        <Logo />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {steps.map((step) => (
            <div key={step.id} className="flex flex-col items-center">
              <div className="relative">
                {currentStep > step.id ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-8 h-8 rounded-full bg-chart-1 flex items-center justify-center shadow-sm"
                  >
                    <Check size={14} className="text-primary-foreground" />
                  </motion.div>
                ) : currentStep === step.id ? (
                  <motion.div
                    animate={{
                      boxShadow: [
                        '0 0 0 0 rgba(103, 146, 241, 0.4)',
                        '0 0 0 6px rgba(103, 146, 241, 0)',
                        '0 0 0 0 rgba(103, 146, 241, 0)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-8 h-8 rounded-full bg-chart-1 flex items-center justify-center shadow-lg"
                  >
                    <motion.div
                      animate={{ scale: [1, 0.9, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-2 h-2 rounded-full bg-primary-foreground"
                    />
                  </motion.div>
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-muted bg-muted/30" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 transition-colors ${
                  currentStep > step.id
                    ? 'text-chart-1'
                    : currentStep === step.id
                    ? 'text-chart-1'
                    : 'text-muted-foreground'
                }`}
                style={currentStep === step.id ? { fontWeight: 600 } : {}}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
        <div className="text-chart-1 bg-chart-1/10 px-2 py-1 rounded-full text-sm" style={{ fontWeight: 600 }}>
          {currentStep} / {totalSteps}
        </div>
      </div>
    </div>
  );
}

