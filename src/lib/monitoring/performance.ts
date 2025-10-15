/**
 * Performance Monitoring System
 * Tracks timing and performance metrics for voice processing pipeline
 */

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  totalDuration: number;
  steps: PerformanceMetric[];
  bottlenecks: string[];
  summary: string;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled: boolean = true;

  constructor() {
    // Enable in development or if explicitly set
    this.enabled = process.env.NODE_ENV === 'development' || 
                   process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true' ||
                   typeof window !== 'undefined'; // Always enable in browser
    
    console.log(`🔧 [PERF] Performance monitoring ${this.enabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🔧 [PERF] NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`🔧 [PERF] NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: ${process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING}`);
  }

  /**
   * Start tracking a performance metric
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
    
    console.log(`⏱️ [PERF] Started: ${name}`, metadata || '');
  }

  /**
   * End tracking a performance metric
   */
  end(name: string, metadata?: Record<string, any>): number | null {
    if (!this.enabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`⚠️ [PERF] No start time found for: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    metric.metadata = { ...metric.metadata, ...metadata };

    console.log(`✅ [PERF] Completed: ${name} in ${duration.toFixed(2)}ms`, metadata || '');

    return duration;
  }

  /**
   * Get a specific metric
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Generate a performance report
   */
  generateReport(): PerformanceReport {
    const metrics = this.getAllMetrics().filter(m => m.duration !== undefined);
    const totalDuration = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);

    // Identify bottlenecks (operations taking > 1000ms or > 30% of total)
    const threshold = Math.max(1000, totalDuration * 0.3);
    const bottlenecks = metrics
      .filter(m => (m.duration || 0) > threshold)
      .map(m => `${m.name} (${m.duration?.toFixed(2)}ms)`);

    // Generate summary
    const summary = this.generateSummary(metrics, totalDuration, bottlenecks);

    return {
      totalDuration,
      steps: metrics,
      bottlenecks,
      summary,
    };
  }

  /**
   * Generate a human-readable summary
   */
  private generateSummary(
    metrics: PerformanceMetric[],
    totalDuration: number,
    bottlenecks: string[]
  ): string {
    const lines: string[] = [
      `📊 Performance Report`,
      `─────────────────────────────────────────`,
      `Total Duration: ${totalDuration.toFixed(2)}ms (${(totalDuration / 1000).toFixed(2)}s)`,
      ``,
      `🔍 Breakdown:`,
    ];

    // Sort by duration (longest first)
    const sorted = [...metrics].sort((a, b) => (b.duration || 0) - (a.duration || 0));

    sorted.forEach(metric => {
      const percentage = ((metric.duration || 0) / totalDuration * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(parseInt(percentage) / 5));
      lines.push(
        `  ${metric.name.padEnd(30)} ${metric.duration?.toFixed(2).padStart(8)}ms  ${percentage.padStart(5)}%  ${bar}`
      );
    });

    if (bottlenecks.length > 0) {
      lines.push(``);
      lines.push(`⚠️ Bottlenecks Detected:`);
      bottlenecks.forEach(b => lines.push(`  • ${b}`));
    }

    return lines.join('\n');
  }

  /**
   * Log the performance report to console
   */
  logReport(): void {
    if (!this.enabled) return;

    const report = this.generateReport();
    console.log('\n' + report.summary + '\n');
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Reset and start a new monitoring session
   */
  reset(): void {
    this.clear();
    console.log('🔄 [PERF] Performance monitoring reset');
  }

  /**
   * Manually enable performance monitoring
   */
  enable(): void {
    this.enabled = true;
    console.log('✅ [PERF] Performance monitoring manually enabled');
  }

  /**
   * Check if performance monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor();

/**
 * Utility function to measure async operations
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  perfMonitor.start(name, metadata);
  try {
    const result = await fn();
    perfMonitor.end(name);
    return result;
  } catch (error) {
    perfMonitor.end(name, { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

/**
 * Utility function to measure synchronous operations
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  perfMonitor.start(name, metadata);
  try {
    const result = fn();
    perfMonitor.end(name);
    return result;
  } catch (error) {
    perfMonitor.end(name, { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

