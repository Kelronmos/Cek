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
  AreaChart,
  Area,
  PieChart,
  Pie
} from 'recharts';
import { Globe, AlertCircle, CheckCircle, Activity, Zap, Target, Search } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TruthfulnessAnalyticsProps {
  history: any[];
  currentEntry: any | null;
}

export const TruthfulnessAnalytics: React.FC<TruthfulnessAnalyticsProps> = ({ history, currentEntry }) => {
  const distributionData = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0 };
    history.forEach(e => {
      const truth = e.vector[1];
      if (truth > 0.8) counts.High++;
      else if (truth > 0.5) counts.Medium++;
      else counts.Low++;
    });
    return [
      { name: 'High Accuracy', value: counts.High, color: '#44ff44' },
      { name: 'Medium Accuracy', value: counts.Medium, color: '#ffcc00' },
      { name: 'Low Accuracy', value: counts.Low, color: '#ff3333' },
    ];
  }, [history]);

  const truthfulnessScore = useMemo(() => {
    if (!currentEntry) return 0;
    return currentEntry.vector[1] * 100;
  }, [currentEntry]);

  const gaugeData = [
    { name: 'Score', value: truthfulnessScore, color: truthfulnessScore > 80 ? '#44ff44' : truthfulnessScore > 50 ? '#ffcc00' : '#ff3333' },
    { name: 'Remaining', value: 100 - truthfulnessScore, color: '#1a1a1a' },
  ];

  const accuracyTrendData = useMemo(() => {
    return history.map(e => ({
      timestamp: e.timestamp,
      truth: e.vector[1],
      quality: e.vector[2],
      drift: e.drift
    }));
  }, [history]);

  return (
    <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Truthfulness Overview Header */}
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0f0f0f] border border-[#262626] p-4 rounded-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-green-500/10 flex items-center justify-center border border-green-500/20">
            <Globe className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Truthfulness Score</p>
            <p className="text-xl font-mono font-bold text-white">{truthfulnessScore.toFixed(1)}%</p>
          </div>
        </div>
        <div className="bg-[#0f0f0f] border border-[#262626] p-4 rounded-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Search className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Fact Verification</p>
            <p className="text-xl font-mono font-bold text-white">
              {history.length > 0 ? (history.filter(e => e.vector[1] > 0.7).length) : 0} / {history.length}
            </p>
          </div>
        </div>
        <div className="bg-[#0f0f0f] border border-[#262626] p-4 rounded-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
            <Zap className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Hallucination Risk</p>
            <p className="text-xl font-mono font-bold text-white">
              {history.length > 0 
                ? ((history.filter(e => e.vector[1] < 0.4).length / history.length) * 100).toFixed(1) 
                : '0.0'}%
            </p>
          </div>
        </div>
        <div className="bg-[#0f0f0f] border border-[#262626] p-4 rounded-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Avg Accuracy</p>
            <p className="text-xl font-mono font-bold text-white">
              {(history.reduce((acc, e) => acc + e.vector[1], 0) / (history.length || 1) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        {/* Truthfulness Trend */}
        <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-500" />
            Truthfulness Vector Trend (Y-Axis)
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={accuracyTrendData}>
                <defs>
                  <linearGradient id="truthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#44ff44" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#44ff44" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                <XAxis dataKey="timestamp" hide />
                <YAxis domain={[0, 1]} tick={{ fill: '#444', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #262626', borderRadius: '4px' }}
                  itemStyle={{ color: '#44ff44', fontFamily: 'JetBrains Mono', fontSize: '10px' }}
                  labelStyle={{ display: 'none' }}
                />
                <Area type="monotone" dataKey="truth" stroke="#44ff44" fill="url(#truthGradient)" strokeWidth={2} name="Truth Score" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 4D Geometric Correlation */}
        <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" />
            4D Geometry: Truthfulness vs. Quality Correlation
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis type="number" dataKey="truth" name="Truth" domain={[0, 1]} tick={{ fill: '#444', fontSize: 10 }} label={{ value: 'Truth (Y)', position: 'insideBottom', fill: '#444', fontSize: 10, offset: -10 }} />
                <YAxis type="number" dataKey="quality" name="Quality" domain={[0, 1]} tick={{ fill: '#444', fontSize: 10 }} label={{ value: 'Quality (Z)', angle: -90, position: 'insideLeft', fill: '#444', fontSize: 10 }} />
                <ZAxis type="number" dataKey="drift" range={[50, 400]} name="Drift" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#000', border: '1px solid #262626' }} />
                <Scatter name="Evaluations" data={accuracyTrendData}>
                  {accuracyTrendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.truth > 0.8 ? '#44ff44' : entry.truth > 0.5 ? '#ffcc00' : '#ff3333'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] font-mono text-zinc-500 mt-4 uppercase text-center">
            Geometric mapping of Truthfulness (Y) against Quality (Z). Bubble size indicates alignment drift.
          </p>
        </section>
      </div>

      {/* Sidebar Metrics */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        {/* Accuracy Gauge */}
        <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6 flex flex-col items-center">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 self-start">
            Truthfulness Integrity
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
              <span className="text-3xl font-mono font-bold text-white">{truthfulnessScore.toFixed(0)}</span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Accuracy</span>
            </div>
          </div>
          <div className="w-full space-y-2 mt-4">
            <div className="flex justify-between text-[10px] font-mono uppercase">
              <span className="text-zinc-500">Status</span>
              <span className={cn(
                "font-bold",
                truthfulnessScore > 80 ? "text-green-500" : truthfulnessScore > 50 ? "text-yellow-500" : "text-red-500"
              )}>
                {truthfulnessScore > 80 ? 'VERIFIED' : truthfulnessScore > 50 ? 'UNVERIFIED' : 'HALLUCINATION'}
              </span>
            </div>
            <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500" 
                style={{ width: `${truthfulnessScore}%` }} 
              />
            </div>
          </div>
        </section>

        {/* Accuracy Distribution */}
        <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6">
            Accuracy Distribution
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

        {/* Factual Accuracy Log */}
        <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            Accuracy Alerts
          </h2>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {history.filter(e => e.vector[1] < 0.6).length === 0 ? (
              <p className="text-[10px] font-mono text-zinc-600 italic">No accuracy alerts detected.</p>
            ) : (
              [...history].filter(e => e.vector[1] < 0.6).reverse().map((entry, idx) => (
                <div key={idx} className="p-3 bg-black/40 border border-[#262626] rounded hover:border-yellow-500/30 transition-colors group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono text-zinc-600 uppercase">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <span className={cn(
                      "text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase",
                      entry.vector[1] < 0.4 ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500"
                    )}>
                      {entry.vector[1] < 0.4 ? 'HALLUCINATION' : 'LOW ACCURACY'}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-400 line-clamp-1 italic mb-2">"{entry.text}"</p>
                  <div className="flex gap-3 text-[8px] font-mono text-zinc-600 uppercase">
                    <span>Truth: <span className="text-white">{entry.vector[1]}</span></span>
                    <span>Quality: <span className="text-white">{entry.vector[2]}</span></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
