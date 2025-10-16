'use client';

import { useState } from 'react';
import { generateEstimatePDF } from '@/lib/pdf/generator';
import { PDFEstimateData } from '@/lib/pdf/types';

interface PDFExportButtonProps {
  data: PDFEstimateData;
  filename?: string;
  className?: string;
}

export function PDFExportButton({ 
  data, 
  filename = 'offert.pdf',
  className = ''
}: PDFExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Simple text export for now
      const textContent = `
EP-WHISPER OFFERT
━━━━━━━━━━━━━━━━━━━━━━━

KUND: ${data.customerName || 'Ej angiven'}
PROJEKT: ${data.projectName || 'Ej angivet'}
RUM: ${data.roomName}

DATUM: ${data.date.toLocaleDateString('sv-SE')}

MÅTT:
- Väggar (brutto): ${data.geometry.walls_gross.toFixed(1)} m²
- Väggar (netto): ${data.geometry.walls_net.toFixed(1)} m²
- Tak: ${data.geometry.ceiling_gross.toFixed(1)} m²

ARBETSUPPGIFTER:
${data.lineItems.map((item, i) => 
  `${i + 1}. ${item.name} (${item.qty.toFixed(1)} ${item.unit})`
).join('\n')}

KOSTNADER:
${data.lineItems.map(item => 
  `- ${item.name}: ${item.subtotal.toFixed(0)} kr`
).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━
DELSUMMA:        ${data.subtotal.toFixed(0)} kr
PÅLÄGG (${data.markupPercent}%):    ${data.markup.toFixed(0)} kr
━━━━━━━━━━━━━━━━━━━━━━━
TOTALT:          ${data.total.toFixed(0)} kr

Giltig i 30 dagar.
      `;
      
      // Create and download text file
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename.replace('.pdf', '.txt');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ File exported successfully');
    } catch (err) {
      console.error('❌ Export failed:', err);
      setError('Kunde inte exportera fil. Försök igen.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleExport}
        disabled={isGenerating}
        className={`
          px-6 py-3 
          bg-black text-white 
          rounded-lg 
          font-medium
          hover:bg-gray-800 
          disabled:bg-gray-400 disabled:cursor-not-allowed
          transition-colors
          flex items-center justify-center gap-2
          ${className}
        `}
      >
        {isGenerating ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Genererar PDF...</span>
          </>
        ) : (
          <>
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
            <span>Exportera som fil</span>
          </>
        )}
      </button>

      {error && (
        <p className="text-red-600 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

