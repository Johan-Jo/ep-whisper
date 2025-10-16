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
    <div className="sticky top-0 px-6 pt-4 pb-4 bg-[rgba(10,10,10,0.8)] backdrop-blur-xl border-b border-neutral-800 z-50">
      {/* Logo Section */}
      <div className="mb-4">
        <Logo />
      </div>
      
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {/* Steps Container */}
        <div className="flex items-center gap-3">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center gap-2">
              {/* Step Circle */}
              <div className="relative">
                {currentStep > step.id ? (
                  // Completed step
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-10 h-10 rounded-full bg-[#1447e6] flex items-center justify-center shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
                  >
                    <Check size={18} className="text-neutral-900" strokeWidth={2.5} />
                  </motion.div>
                ) : currentStep === step.id ? (
                  // Current step - pulsing with inner dot
                  <motion.div
                    animate={{
                      boxShadow: [
                        '0 0 0 0 rgba(103, 146, 241, 0)',
                        '0 0 0 8px rgba(103, 146, 241, 0)',
                        '0 0 0 0 rgba(103, 146, 241, 0)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-10 h-10 rounded-full bg-[#1447e6] flex items-center justify-center"
                  >
                    <motion.div
                      animate={{ scale: [1, 0.8, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-3 h-3 rounded-full bg-neutral-900"
                    />
                  </motion.div>
                ) : (
                  // Future step
                  <div className="w-10 h-10 rounded-full border-2 border-neutral-800 bg-[rgba(38,38,38,0.3)]" />
                )}
              </div>
              
              {/* Step Label */}
              <span
                className={`text-[11px] leading-none transition-colors ${
                  currentStep >= step.id
                    ? currentStep === step.id
                      ? 'text-[#1447e6] font-bold'
                      : 'text-[#1447e6] font-normal'
                    : 'text-[#a1a1a1] font-normal'
                }`}
                style={{ fontFamily: 'Arimo, sans-serif' }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
        
        {/* Step Counter */}
        <div className="bg-[rgba(20,71,230,0.1)] px-3 py-2 rounded-full">
          <p className="text-base font-bold text-[#1447e6] leading-none" style={{ fontFamily: 'Arimo, sans-serif' }}>
            {currentStep} / {totalSteps}
          </p>
        </div>
      </div>
    </div>
  );
}

