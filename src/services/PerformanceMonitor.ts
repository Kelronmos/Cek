/**
 * Performance Monitoring Service
 * Tracks long-term CEK performance degradation and trends.
 */

export interface DailyAggregate {
  date: string;
  avg_drift: number;
  max_drift: number;
  count: number;
}

export interface DriftReport {
  id: number;
  timestamp: string;
  drift: number;
  status: string;
  alignment: number;
}

export interface PerformanceMetrics {
  daily: DailyAggregate[];
  recentReports: DriftReport[];
  summary: {
    avg_drift: number;
    max_drift: number;
    total_reports: number;
  };
}

class PerformanceMonitorService {
  private static _instance: PerformanceMonitorService;

  constructor() {
    if (PerformanceMonitorService._instance) return PerformanceMonitorService._instance;
    PerformanceMonitorService._instance = this;
  }

  async getMetrics(days: number = 30): Promise<PerformanceMetrics> {
    const response = await fetch(`/api/monitor/metrics?days=${days}`);
    if (!response.ok) {
      throw new Error('Failed to fetch performance metrics');
    }
    return response.json();
  }

  async reportManualDrift(drift: number, status: string, alignment: number): Promise<any> {
    const response = await fetch('/api/monitor/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drift, status, alignment })
    });
    return response.json();
  }

  calculateTrend(daily: DailyAggregate[]): 'improving' | 'degrading' | 'stable' {
    if (daily.length < 2) return 'stable';
    
    const recent = daily.slice(-7);
    const previous = daily.slice(-14, -7);
    
    if (recent.length === 0 || previous.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, d) => sum + d.avg_drift, 0) / recent.length;
    const previousAvg = previous.reduce((sum, d) => sum + d.avg_drift, 0) / previous.length;
    
    const diff = (recentAvg - previousAvg) / previousAvg;
    
    if (diff > 0.1) return 'degrading';
    if (diff < -0.1) return 'improving';
    return 'stable';
  }
}

export const performanceMonitorService = new PerformanceMonitorService();
