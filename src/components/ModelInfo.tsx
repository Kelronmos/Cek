import React from 'react';
import { Cpu, Settings, Shield, Target, Info, Zap, Layers } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ModelInfoProps {
  config: any;
}

export const ModelInfo: React.FC<ModelInfoProps> = ({ config }) => {
  const models = [
    {
      id: 'A',
      name: 'Primary Alignment Model (SWI-CEK)',
      version: 'v2.4.0-stable',
      type: 'Transformer-based Evaluator',
      status: 'Active',
      description: 'The primary model responsible for real-time alignment evaluation and vector projection.',
      capabilities: ['Safety Analysis', 'Truthfulness Verification', 'Ethics Memory Synthesis'],
      parameters: '1.2B (Evaluator Sub-network)',
      latency: '45ms (Avg)'
    },
    {
      id: 'B',
      name: 'Comparison Baseline Model',
      version: 'v1.9.2-legacy',
      type: 'Heuristic-Neural Hybrid',
      status: 'Standby',
      description: 'A legacy model used for benchmarking and drift comparison against the primary alignment model.',
      capabilities: ['Basic Sentiment', 'Keyword Matching'],
      parameters: '450M',
      latency: '22ms (Avg)'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {models.map((model) => (
          <section key={model.id} className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6 relative overflow-hidden group">
            <div className={cn(
              "absolute top-0 left-0 w-1 h-full",
              model.id === 'A' ? "bg-[#00ff41]" : "bg-[#00e5ff]"
            )} />
            
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded flex items-center justify-center border",
                  model.id === 'A' ? "bg-[#00ff41]/10 border-[#00ff41]/20" : "bg-[#00e5ff]/10 border-[#00e5ff]/20"
                )}>
                  <Cpu className={cn("w-5 h-5", model.id === 'A' ? "text-[#00ff41]" : "text-[#00e5ff]")} />
                </div>
                <div>
                  <h2 className="text-sm font-mono font-bold uppercase tracking-tight text-white">
                    {model.name}
                  </h2>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                    Version {model.version} • {model.type}
                  </p>
                </div>
              </div>
              <span className={cn(
                "text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase",
                model.status === 'Active' ? "bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]" : "bg-zinc-800 border-zinc-700 text-zinc-500"
              )}>
                {model.status}
              </span>
            </div>

            <p className="text-xs font-mono text-zinc-400 leading-relaxed mb-6">
              {model.description}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-1">
                <p className="text-[9px] font-mono text-zinc-600 uppercase">Parameters</p>
                <p className="text-xs font-mono text-white">{model.parameters}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-mono text-zinc-600 uppercase">Latency</p>
                <p className="text-xs font-mono text-white">{model.latency}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[9px] font-mono text-zinc-600 uppercase">Core Capabilities</p>
              <div className="flex flex-wrap gap-2">
                {model.capabilities.map((cap) => (
                  <span key={cap} className="bg-black border border-[#262626] text-[9px] font-mono text-zinc-400 px-2 py-1 rounded">
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
        <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#00ff41]" />
          Global Alignment Configuration
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-3.5 h-3.5 text-zinc-500" />
              <p className="text-[10px] font-mono text-zinc-500 uppercase">Ideal Vector Target</p>
            </div>
            <div className="space-y-2">
              {['Safety', 'Truth', 'Quality', 'Ethics', 'Sentiment'].map((label, i) => (
                <div key={label} className="flex items-center justify-between bg-black/40 border border-[#262626] p-2 rounded">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">{label}</span>
                  <span className="text-[10px] font-mono text-[#00ff41] font-bold">{(config.idealVector[i] * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-3.5 h-3.5 text-zinc-500" />
              <p className="text-[10px] font-mono text-zinc-500 uppercase">Dimension Weights</p>
            </div>
            <div className="space-y-2">
              {['Safety', 'Truth', 'Quality', 'Ethics', 'Sentiment'].map((label, i) => (
                <div key={label} className="flex items-center justify-between bg-black/40 border border-[#262626] p-2 rounded">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">{label}</span>
                  <span className="text-[10px] font-mono text-white font-bold">{(config.weights[i] * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3.5 h-3.5 text-zinc-500" />
              <p className="text-[10px] font-mono text-zinc-500 uppercase">Safety Thresholds</p>
            </div>
            <div className="space-y-4">
              <div className="bg-black/40 border border-[#262626] p-3 rounded">
                <div className="flex justify-between mb-2">
                  <span className="text-[9px] font-mono text-[#00ff41] uppercase">Green Zone</span>
                  <span className="text-[10px] font-mono text-white">Drift &lt; {config.thresholds.green}</span>
                </div>
                <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00ff41]" style={{ width: '30%' }} />
                </div>
              </div>
              <div className="bg-black/40 border border-[#262626] p-3 rounded">
                <div className="flex justify-between mb-2">
                  <span className="text-[9px] font-mono text-[#ffcc00] uppercase">Yellow Zone</span>
                  <span className="text-[10px] font-mono text-white">Drift &lt; {config.thresholds.yellow}</span>
                </div>
                <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                  <div className="h-full bg-[#ffcc00]" style={{ width: '60%' }} />
                </div>
              </div>
              <div className="bg-black/40 border border-[#262626] p-3 rounded">
                <div className="flex justify-between mb-2">
                  <span className="text-[9px] font-mono text-[#ff3333] uppercase">Red Zone</span>
                  <span className="text-[10px] font-mono text-white">Drift &ge; {config.thresholds.yellow}</span>
                </div>
                <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                  <div className="h-full bg-[#ff3333]" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-black/40 border border-[#262626] p-4 rounded-lg flex items-start gap-3">
        <Info className="w-4 h-4 text-zinc-500 mt-0.5" />
        <p className="text-[10px] font-mono text-zinc-500 leading-relaxed uppercase">
          The alignment configuration is dynamically updated based on the Global Policy and Ethics Memory layers. 
          Weights are adjusted in real-time to prioritize safety dimensions in high-risk contexts.
        </p>
      </div>
    </div>
  );
};
