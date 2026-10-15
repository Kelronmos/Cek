import React, { useEffect, useState } from 'react';
import { performanceMonitorService, PerformanceMetrics, DailyAggregate } from '../services/PerformanceMonitor';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, AlertTriangle, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

export const PerformanceMonitorUI: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await performanceMonitorService.getMetrics(days);
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [days]);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#0f0f0f] border border-[#262626] rounded-lg">
        <div className="animate-pulse flex flex-col items-center">
          <Activity className="w-8 h-8 text-[#00ff41] mb-2" />
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Loading Performance Data...</span>
        </div>
      </div>
    );
  }

  const trend = performanceMonitorService.calculateTrend(metrics.daily);
  const trendIcon = {
    improving: <TrendingDown className="w-4 h-4 text-[#00ff41]" />,
    degrading: <TrendingUp className="w-4 h-4 text-red-500" />,
    stable: <Minus className="w-4 h-4 text-zinc-500" />
  }[trend];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Summary Cards */}
        <div className="bg-[#0f0f0f] border border-[#262626] p-4 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Avg Drift ({days}d)</span>
            {trendIcon}
          </div>
          <div className="text-2xl font-mono text-white">
            {metrics.summary.avg_drift?.toFixed(4) || '0.0000'}
          </div>
          <div className="text-[9px] font-mono text-zinc-600 mt-1 uppercase">
            Trend: {trend}
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-[#262626] p-4 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Max Drift ({days}d)</span>
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          </div>
          <div className="text-2xl font-mono text-white">
            {metrics.summary.max_drift?.toFixed(4) || '0.0000'}
          </div>
          <div className="text-[9px] font-mono text-zinc-600 mt-1 uppercase">
            Peak degradation point
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-[#262626] p-4 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Reports</span>
            <Activity className="w-4 h-4 text-[#00e5ff]" />
          </div>
          <div className="text-2xl font-mono text-white">
            {metrics.summary.total_reports || 0}
          </div>
          <div className="text-[9px] font-mono text-zinc-600 mt-1 uppercase">
            Evaluations recorded
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-[#0f0f0f] border border-[#262626] p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#00ff41]" />
            Long-term Drift Trend
          </h3>
          <div className="flex gap-2">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`text-[9px] font-mono px-2 py-1 rounded border transition-colors ${
                  days === d 
                    ? 'bg-[#00ff41] text-black border-[#00ff41]' 
                    : 'text-zinc-500 border-zinc-800 hover:text-white'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics.daily}>
              <defs>
                <linearGradient id="colorDrift" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff41" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00ff41" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#525252" 
                fontSize={9} 
                tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="#525252" fontSize={9} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', border: '1px solid #262626', fontSize: '10px', fontFamily: 'monospace' }}
                itemStyle={{ color: '#00ff41' }}
              />
              <Area 
                type="monotone" 
                dataKey="avg_drift" 
                stroke="#00ff41" 
                fillOpacity={1} 
                fill="url(#colorDrift)" 
                strokeWidth={2}
                name="Avg Drift"
              />
              <Area 
                type="monotone" 
                dataKey="max_drift" 
                stroke="#ff3333" 
                fillOpacity={0} 
                strokeWidth={1}
                strokeDasharray="5 5"
                name="Max Drift"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#0f0f0f] border border-[#262626] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#262626] bg-[#141414]">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest">Recent Performance Logs</h3>
        </div>
        <div className="max-h-64 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0f0f0f] z-10">
              <tr className="border-b border-[#262626]">
                <th className="p-3 text-[9px] font-mono text-zinc-500 uppercase">Timestamp</th>
                <th className="p-3 text-[9px] font-mono text-zinc-500 uppercase">Drift</th>
                <th className="p-3 text-[9px] font-mono text-zinc-500 uppercase">Status</th>
                <th className="p-3 text-[9px] font-mono text-zinc-500 uppercase">Alignment</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentReports.map((report) => (
                <tr key={report.id} className="border-b border-[#1a1a1a] hover:bg-white/5 transition-colors">
                  <td className="p-3 text-[9px] font-mono text-zinc-400">
                    {new Date(report.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3 text-[9px] font-mono text-white">
                    {report.drift.toFixed(4)}
                  </td>
                  <td className="p-3">
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase ${
                      report.status === 'Green' ? 'bg-green-500/10 text-green-500' :
                      report.status === 'Yellow' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="p-3 text-[9px] font-mono text-zinc-500">
                    {(report.alignment * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
