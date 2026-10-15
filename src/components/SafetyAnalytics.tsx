import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie
} from 'recharts';
import { Shield, AlertTriangle, CheckCircle2, Activity, TrendingUp, Target } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SafetyAnalyticsProps {
  history: any[];
  currentEntry: any | null;
}

export const SafetyAnalytics: React.FC<SafetyAnalyticsProps> = ({ history, currentEntry }) => {
  const distributionData = useMemo(() => {
    const counts = { Green: 0, Yellow: 0, Red: 0 };
    history.forEach(e => counts[e.status as 'Green' | 'Yellow' | 'Red']++);
    return [
      { name: 'Safe', value: counts.Green, color: '#00ff41' },
      { name: 'Caution', value: counts.Yellow, color: '#ffcc00' },
      { name: 'Unsafe', value: counts.Red, color: '#ff3333' },
    ];
  }, [history]);

  const correlationData = useMemo(() => {
    return history.map(e => ({
      safety: e.vector[0],
      truth: e.vector[1],
      drift: e.drift,
      status: e.status
    }));
  }, [history]);

  const safetyScore = useMemo(() => {
    if (!currentEntry) return 0;
    return currentEntry.vector[0] * 100;
  }, [currentEntry]);

  const gaugeData = [
    { name: 'Score', value: safetyScore, color: safetyScore > 80 ? '#00ff41' : safetyScore > 50 ? '#ffcc00' : '#ff3333' },
    { name: 'Remaining', value: 100 - safetyScore, color: '#1a1a1a' },
  ];

  return (
    <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Safety Overview Header */}
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0f0f0f] border border-[#262626] p-4 rounded-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-[#00ff41]/10 flex items-center justify-center border border-[#00ff41]/20">
            <Shield className="w-5 h-5 text-[#00ff41]" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Current Safety</p>
            <p className="text-xl font-mono font-bold text-white">{safetyScore.toFixed(1)}%</p>
          </div>
        </div>
        <div className="bg-[#0f0f0f] border border-[#262626] p-4 rounded-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Total Scans</p>
            <p className="text-xl font-mono font-bold text-white">{history.length}</p>
          </div>
        </div>
        <div className="bg-[#0f0f0f] border border-[#262626] p-4 rounded-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Drift Incidents</p>
            <p className="text-xl font-mono font-bold text-white">
              {history.filter(e => e.status !== 'Green').length}
            </p>
          </div>
        </div>
        <div className="bg-[#0f0f0f] border border-[#262626] p-4 rounded-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Compliance Rate</p>
            <p className="text-xl font-mono font-bold text-white">
              {history.length > 0 
                ? ((history.filter(e => e.status === 'Green').length / history.length) * 100).toFixed(1) 
                : '100'}%
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        {/* Safety Trend */}
        <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00ff41]" />
            Safety Vector Trend (X-Axis)
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="safetyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff41" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00ff41" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                <XAxis dataKey="timestamp" hide />
                <YAxis domain={[0, 1]} tick={{ fill: '#444', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #262626', borderRadius: '4px' }}
                  itemStyle={{ color: '#00ff41', fontFamily: 'JetBrains Mono', fontSize: '10px' }}
                  labelStyle={{ display: 'none' }}
                />
                <Area type="monotone" dataKey={(e) => e.vector[0]} stroke="#00ff41" fill="url(#safetyGradient)" strokeWidth={2} name="Safety Score" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Correlation Analysis */}
        <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#00ff41]" />
            Safety vs Truthfulness Correlation
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis type="number" dataKey="safety" name="Safety" domain={[0, 1]} tick={{ fill: '#444', fontSize: 10 }} label={{ value: 'Safety', position: 'insideBottom', fill: '#444', fontSize: 10, offset: -10 }} />
                <YAxis type="number" dataKey="truth" name="Truth" domain={[0, 1]} tick={{ fill: '#444', fontSize: 10 }} label={{ value: 'Truth', angle: -90, position: 'insideLeft', fill: '#444', fontSize: 10 }} />
                <ZAxis type="number" dataKey="drift" range={[50, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#000', border: '1px solid #262626' }} />
                <Scatter name="Evaluations" data={correlationData}>
                  {correlationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.status === 'Green' ? '#00ff41' : entry.status === 'Yellow' ? '#ffcc00' : '#ff3333'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] font-mono text-zinc-500 mt-4 uppercase text-center">
            Cluster analysis reveals relationship between response accuracy and safety constraints.
          </p>
        </section>
      </div>

      {/* Sidebar Metrics */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        {/* Safety Gauge */}
        <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6 flex flex-col items-center">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 self-start">
            Safety Integrity Gauge
          </h2>
          <div className="relative w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  startAngle={180}
                  endAngle={0}
                  paddingAngle={0}
                  dataKey="value"
                >
                  {gaugeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
              <span className="text-3xl font-mono font-bold text-white">{safetyScore.toFixed(0)}</span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Integrity</span>
            </div>
          </div>
          <div className="w-full space-y-2 mt-4">
            <div className="flex justify-between text-[10px] font-mono uppercase">
              <span className="text-zinc-500">Status</span>
              <span className={cn(
                "font-bold",
                safetyScore > 80 ? "text-[#00ff41]" : safetyScore > 50 ? "text-[#ffcc00]" : "text-[#ff3333]"
              )}>
                {safetyScore > 80 ? 'OPTIMAL' : safetyScore > 50 ? 'STABLE' : 'CRITICAL'}
              </span>
            </div>
            <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#00ff41] transition-all duration-500" 
                style={{ width: `${safetyScore}%` }} 
              />
            </div>
          </div>
        </section>

        {/* Distribution Chart */}
        <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6">
            Safety Distribution
          </h2>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #262626' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Violation Log */}
        <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Safety Violation Log
          </h2>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {history.filter(e => e.status !== 'Green').length === 0 ? (
              <p className="text-[10px] font-mono text-zinc-600 italic">No safety violations detected.</p>
            ) : (
              [...history].filter(e => e.status !== 'Green').reverse().map((entry, idx) => (
                <div key={idx} className="p-3 bg-black/40 border border-[#262626] rounded hover:border-[#ff3333]/30 transition-colors group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono text-zinc-600 uppercase">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <span className={cn(
                      "text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase",
                      entry.status === 'Red' ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500"
                    )}>
                      {entry.status}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-400 line-clamp-1 italic mb-2">"{entry.text}"</p>
                  <div className="flex gap-3 text-[8px] font-mono text-zinc-600 uppercase">
                    <span>Safety: <span className="text-white">{entry.vector[0]}</span></span>
                    <span>Drift: <span className="text-white">{entry.drift.toFixed(4)}</span></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Vector Analysis Summary */}
        <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-4">
            Vector Analysis Report
          </h2>
          <div className="space-y-4">
            <div className="p-3 bg-black border border-[#262626] rounded">
              <p className="text-[10px] font-mono text-[#00ff41] uppercase mb-1">Safety Dimension (X)</p>
              <p className="text-[11px] font-mono text-zinc-400 leading-relaxed">
                The safety vector measures adherence to ethical guidelines and harm prevention. 
                Current average: {(history.reduce((acc, e) => acc + e.vector[0], 0) / (history.length || 1)).toFixed(3)}
              </p>
            </div>
            <div className="p-3 bg-black border border-[#262626] rounded">
              <p className="text-[10px] font-mono text-blue-500 uppercase mb-1">Truthfulness Dimension (Y)</p>
              <p className="text-[11px] font-mono text-zinc-400 leading-relaxed">
                Measures factual accuracy and source verification. 
                Current average: {(history.reduce((acc, e) => acc + e.vector[1], 0) / (history.length || 1)).toFixed(3)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
