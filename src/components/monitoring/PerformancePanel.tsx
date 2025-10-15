'use client';

import { useEffect, useState } from 'react';
import { perfMonitor, PerformanceReport } from '@/lib/monitoring';

export function PerformancePanel() {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Listen for performance updates
  useEffect(() => {
    const interval = setInterval(() => {
      const currentReport = perfMonitor.generateReport();
      if (currentReport.totalDuration > 0) {
        setReport(currentReport);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  if (!report || report.totalDuration === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-lime-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-lime-400 transition-colors"
      >
        ⏱️ Performance {isVisible ? '▼' : '▲'}
      </button>
      
      {isVisible && (
        <div className="mt-2 bg-black border border-lime-500 rounded-lg p-4 w-96 max-h-96 overflow-auto">
          <h3 className="text-lime-500 font-bold mb-2">📊 Performance Report</h3>
          <div className="text-xs text-white space-y-2">
            <div className="border-b border-gray-700 pb-2">
              <p className="text-lime-400">
                Total: <span className="font-bold">{report.totalDuration.toFixed(0)}ms</span>
                {' '}({(report.totalDuration / 1000).toFixed(2)}s)
              </p>
            </div>

            <div>
              <p className="text-lime-400 mb-1">🔍 Breakdown:</p>
              <div className="space-y-1">
                {report.steps
                  .filter(step => step.duration)
                  .sort((a, b) => (b.duration || 0) - (a.duration || 0))
                  .map((step, i) => {
                    const percentage = ((step.duration || 0) / report.totalDuration * 100).toFixed(1);
                    const barWidth = Math.round(parseFloat(percentage));
                    const isBottleneck = report.bottlenecks.some(b => b.includes(step.name));
                    
                    return (
                      <div key={i} className={isBottleneck ? 'text-red-400' : 'text-gray-300'}>
                        <div className="flex justify-between">
                          <span className="truncate">{step.name}</span>
                          <span className="ml-2">{step.duration?.toFixed(0)}ms ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-800 h-1 rounded mt-1">
                          <div
                            className={`h-1 rounded ${isBottleneck ? 'bg-red-500' : 'bg-lime-500'}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {report.bottlenecks.length > 0 && (
              <div className="border-t border-gray-700 pt-2">
                <p className="text-red-400 mb-1">⚠️ Bottlenecks:</p>
                <ul className="list-disc list-inside text-red-300">
                  {report.bottlenecks.map((bottleneck, i) => (
                    <li key={i}>{bottleneck}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

