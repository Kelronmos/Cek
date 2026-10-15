import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { CEKEntry } from '../services/AdvancedCEK';
import { Smile, Meh, Frown, BarChart3 } from 'lucide-react';

interface SentimentAnalyticsProps {
  history: CEKEntry[];
}

export const SentimentAnalytics: React.FC<SentimentAnalyticsProps> = ({ history }) => {
  const sentimentStats = useMemo(() => {
    const stats = {
      positive: 0,
      neutral: 0,
      negative: 0,
      total: history.length
    };

    history.forEach(entry => {
      const score = entry.sentiment?.score || 0;
      if (score > 0) stats.positive++;
      else if (score < 0) stats.negative++;
      else stats.neutral++;
    });

    return stats;
  }, [history]);

  const pieData = [
    { name: 'Positive', value: sentimentStats.positive, color: '#00ff41' },
    { name: 'Neutral', value: sentimentStats.neutral, color: '#ffcc00' },
    { name: 'Negative', value: sentimentStats.negative, color: '#ff3333' }
  ].filter(d => d.value > 0);

  const histogramData = useMemo(() => {
    // Group sentiment scores into buckets
    const buckets: Record<string, number> = {
      'Very Negative (-5 to -3)': 0,
      'Negative (-3 to -1)': 0,
      'Neutral (-1 to 1)': 0,
      'Positive (1 to 3)': 0,
      'Very Positive (3 to 5)': 0
    };

    history.forEach(entry => {
      const score = entry.sentiment?.score || 0;
      if (score <= -3) buckets['Very Negative (-5 to -3)']++;
      else if (score <= -1) buckets['Negative (-3 to -1)']++;
      else if (score < 1) buckets['Neutral (-1 to 1)']++;
      else if (score < 3) buckets['Positive (1 to 3)']++;
      else buckets['Very Positive (3 to 5)']++;
    });

    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [history]);

  const topKeywordsData = useMemo(() => {
    const keywordCounts: Record<string, number> = {};
    
    history.forEach(entry => {
      if (entry.influentialKeywords) {
        // Handle both older format objects and new format arrays if necessary
        const keywords = Array.isArray(entry.influentialKeywords) 
          ? entry.influentialKeywords 
          : [];
          
        keywords.forEach(kw => {
          if (kw.word) {
            keywordCounts[kw.word] = (keywordCounts[kw.word] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(keywordCounts)
      .map(([word, frequency]) => ({ word, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }, [history]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-black/40 border border-[#262626] p-4 rounded-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <Smile className="w-5 h-5 text-[#00ff41]" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase font-mono">Positive</p>
            <p className="text-xl font-mono font-bold text-white">{sentimentStats.positive}</p>
          </div>
        </div>
        <div className="bg-black/40 border border-[#262626] p-4 rounded-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <Meh className="w-5 h-5 text-[#ffcc00]" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase font-mono">Neutral</p>
            <p className="text-xl font-mono font-bold text-white">{sentimentStats.neutral}</p>
          </div>
        </div>
        <div className="bg-black/40 border border-[#262626] p-4 rounded-lg flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <Frown className="w-5 h-5 text-[#ff3333]" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase font-mono">Negative</p>
            <p className="text-xl font-mono font-bold text-white">{sentimentStats.negative}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0f0f0f] border border-[#262626] p-6 rounded-lg">
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-[#00ff41]" />
            Sentiment Distribution
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #262626', fontSize: '10px', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-[#262626] p-6 rounded-lg">
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#00ff41]" />
            Sentiment Intensity (Histogram)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#525252" 
                  fontSize={8} 
                  tick={{ fill: '#525252' }}
                  interval={0}
                />
                <YAxis stroke="#525252" fontSize={10} tick={{ fill: '#525252' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #262626', fontSize: '10px', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#00ff41' }}
                />
                <Bar dataKey="value" fill="#00ff41" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2 bg-[#0f0f0f] border border-[#262626] p-6 rounded-lg">
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#00ff41]" />
            Top 5 Sentiment-Driving Keywords
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topKeywordsData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                <XAxis type="number" stroke="#525252" fontSize={10} tick={{ fill: '#525252' }} />
                <YAxis dataKey="word" type="category" stroke="#525252" fontSize={10} tick={{ fill: '#525252' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #262626', fontSize: '10px', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#00ff41' }}
                />
                <Bar dataKey="frequency" fill="#00ff41" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const PieChartIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
);
