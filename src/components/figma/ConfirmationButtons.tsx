'use client';

import { motion } from 'framer-motion';

interface ConfirmationButtonsProps {
  onReviewEstimate: () => void;
  onAddMoreTasks: () => void;
}

export function ConfirmationButtons({ onReviewEstimate, onAddMoreTasks }: ConfirmationButtonsProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex gap-3 mt-4"
    >
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onReviewEstimate}
        className="flex-1 bg-gradient-to-br from-chart-1 to-chart-2 text-primary-foreground px-4 py-3 rounded-2xl border border-chart-1/50 shadow-lg shadow-chart-1/20 font-medium text-sm transition-all hover:shadow-xl hover:shadow-chart-1/30"
      >
        📋 Granska offerten
      </motion.button>
      
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onAddMoreTasks}
        className="flex-1 bg-card border border-border text-foreground px-4 py-3 rounded-2xl shadow-sm font-medium text-sm transition-all hover:shadow-md hover:border-chart-1/30"
      >
        ➕ Lägg till fler arbeten
      </motion.button>
    </motion.div>
  );
}
