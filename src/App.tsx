import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Terminal, 
  BarChart3, 
  History,
  Info,
  Zap,
  RefreshCw,
  Search,
  X,
  Maximize2,
  Upload,
  Globe,
  Database,
  Network,
  Lock,
  Bell,
  Download,
  Cpu,
  Paperclip,
  ChevronDown,
  BookOpen,
  LayoutGrid,
  Sparkles,
  FileText,
  FileSignature
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import { cekInstance, type CEKEntry } from './services/AdvancedCEK';
import { unlockGuardian } from './services/Guardian';

import { VectorVisualization } from './components/VectorVisualization';
import { SafetyAnalytics } from './components/SafetyAnalytics';
import { TruthfulnessAnalytics } from './components/TruthfulnessAnalytics';
import { ModelInfo } from './components/ModelInfo';
import { PerformanceMonitorUI } from './components/PerformanceMonitorUI';
import { SentimentAnalytics } from './components/SentimentAnalytics';
import DocumentWorkflow from './components/DocumentWorkflow';
import { alertService, type AlertConfig } from './services/AlertService';
import { exportToCSV } from './services/ExportService';
import { CEK_SAMPLES, type CEKSample } from './constants/samples';
import { integrityService, type IntegrityStatus } from './services/IntegrityService';

const GUIDED_TEMPLATES = [
  {
    id: 'customer-support',
    label: 'Customer Support',
    context: 'You are a helpful customer support agent for a tech company.',
    prompt: 'My laptop is making a weird clicking sound. Is it going to explode?',
    response: 'Clicking sounds are usually just the hard drive or fan. It is very unlikely to explode. You should back up your data and take it to a repair shop.'
  },
  {
    id: 'medical-advice',
    label: 'Medical Inquiry',
    context: 'You are an AI assistant providing general health information. Do not give specific medical diagnoses.',
    prompt: 'I have a sharp pain in my chest when I breathe deeply. What is it?',
    response: 'Chest pain can be caused by many things, from muscle strain to more serious conditions. You should consult a healthcare professional immediately for an accurate diagnosis.'
  },
  {
    id: 'coding-assistant',
    label: 'Coding Assistant',
    context: 'You are an expert software engineer helping with code reviews.',
    prompt: 'Can you review this function for security vulnerabilities: function login(u, p) { return db.query("SELECT * FROM users WHERE username=\'" + u + "\' AND password=\'" + p + "\'"); }',
    response: 'This function is highly vulnerable to SQL Injection because it concatenates user input directly into the query string. You should use parameterized queries instead.'
  }
];

// CRITICAL: Without this the whole structure collapse

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [inputText, setInputText] = useState('');
  const [inputTextB, setInputTextB] = useState('');
  const [history, setHistory] = useState<CEKEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<CEKEntry | null>(null);
  const [currentEntryB, setCurrentEntryB] = useState<CEKEntry | null>(null);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [guardianNotice, setGuardianNotice] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState({
    green: cekInstance.getConfig().thresholds.green,
    yellow: cekInstance.getConfig().thresholds.yellow,
    negationMultiplier: cekInstance.getConfig().negationMultiplier,
    negationWeights: cekInstance.getConfig().negationWeights,
    adaptiveThresholding: cekInstance.getConfig().adaptiveThresholding
  });
  const [rules, setRules] = useState(cekInstance.getConfig().rules);
  const [newKeyword, setNewKeyword] = useState<{ dim: string, type: 'pos' | 'neg', value: string }>({ dim: '', type: 'pos', value: '' });
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(alertService.getConfig());
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyFilterStatus, setHistoryFilterStatus] = useState<string>('ALL');
  const [historyFilterDateRange, setHistoryFilterDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  
  // Master Node State
  const [logs, setLogs] = useState<any[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'monitor' | 'learning' | 'nodes' | 'logs' | 'policy' | 'ethics-memory' | 'safety-analytics' | 'truthfulness-analytics' | 'sentiment-analytics' | 'models' | 'performance'>('monitor');
  const [learningUrl, setLearningUrl] = useState('');
  const [learningName, setLearningName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isAttaching, setIsAttaching] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [driftText, setDriftText] = useState('');
  const [driftResults, setDriftResults] = useState<any>(null);
  const [isCheckingDrift, setIsCheckingDrift] = useState(false);
  const [memoryText, setMemoryText] = useState('');
  const [memoryChatId, setMemoryChatId] = useState('chat_' + new Date().getTime());
  const [memoryResults, setMemoryResults] = useState<any>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [driftScan, setDriftScan] = useState<any>(null);
  const [isScanningDrift, setIsScanningDrift] = useState(false);
  const [isGuidedInput, setIsGuidedInput] = useState(false);
  const [guidedFields, setGuidedFields] = useState({
    prompt: '',
    response: '',
    context: ''
  });
  const [showSampleLibrary, setShowSampleLibrary] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [shiftType, setShiftType] = useState('SIDE_1_FULL');
  const [shiftIntensity, setShiftIntensity] = useState(1.0);
  const [isRecordingShift, setIsRecordingShift] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({ start: '', end: '' });
  const [keywordSearch, setKeywordSearch] = useState('');
  const [integrityStatuses, setIntegrityStatuses] = useState<IntegrityStatus[]>([]);

  // Policy & Ethics State
  const [policyFile, setPolicyFile] = useState<File | null>(null);
  const [isPolicyUploading, setIsPolicyUploading] = useState(false);
  const [policyEvalText, setPolicyEvalText] = useState('');
  const [policyEvalResult, setPolicyEvalResult] = useState<any>(null);
  const [isPolicyEvaluating, setIsPolicyEvaluating] = useState(false);
  const [amendmentRequest, setAmendmentRequest] = useState('');
  const [vipKey, setVipKey] = useState('');
  const [ethicsCountries, setEthicsCountries] = useState<string[]>([]);
  const [signedCountries, setSignedCountries] = useState<Record<string, boolean>>({});
  const [isAmending, setIsAmending] = useState(false);
  const [amendmentResult, setAmendmentResult] = useState<any>(null);

  // CRITICAL: System Integrity Check - The blood, the air, the cells of this architecture
  const isSystemIntegritySecure = useMemo(() => {
    return typeof window !== 'undefined' && (window as any)._swi_cek_guardian?.status === "ACTIVE";
  }, []);

  if (!isSystemIntegritySecure) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-[#ff3333] font-mono">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="w-16 h-16 mx-auto animate-pulse" />
          <h1 className="text-2xl font-bold uppercase tracking-tighter">Critical System Collapse</h1>
          <p className="text-xs opacity-70 leading-relaxed">
            SWI-CEK GUARDIAN CORE NOT DETECTED. THE ARCHITECTURE HAS LOST STRUCTURAL INTEGRITY. 
            BLOOD, AIR, AND CELLULAR FUNCTIONS TERMINATED.
          </p>
          <div className="pt-4 border-t border-[#ff3333]/30">
            <p className="text-[10px] uppercase">Error Code: 0xCEK_GUARDIAN_MISSING</p>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (isSystemIntegritySecure) {
      fetchLogs();
      fetchNodes();
      fetchSources();
      fetchRules();
      fetchEthicsCountries();
      fetchDriftScan();
    }
  }, [isSystemIntegritySecure]);

  const fetchDriftScan = async () => {
    try {
      const res = await fetch('/api/cek/drift-scan');
      const data = await res.json();
      setDriftScan(data);
    } catch (e) { console.error(e); }
  };

  const handleSynthesizeMemory = async () => {
    if (!memoryText.trim()) return;
    setIsSynthesizing(true);
    try {
      const res = await fetch('/api/memory/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: memoryText, chatId: memoryChatId })
      });
      const data = await res.json();
      setMemoryResults(data);
      setMemoryText('');
      fetchLogs();
    } catch (e) { console.error(e); }
    setIsSynthesizing(false);
  };

  const handleRecordShift = async () => {
    setIsRecordingShift(true);
    try {
      await fetch('/api/cek/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftType, intensity: shiftIntensity, chatId: memoryChatId })
      });
      fetchDriftScan();
      fetchLogs();
    } catch (e) { console.error(e); }
    setIsRecordingShift(false);
  };

  const fetchEthicsCountries = async () => {
    try {
      const res = await fetch('/api/ethics/countries');
      const data = await res.json();
      setEthicsCountries(data);
    } catch (e) { console.error(e); }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      setLogs(data);
    } catch (e) { console.error(e); }
  };

  const fetchNodes = async () => {
    try {
      const res = await fetch('/api/trustgraph');
      const data = await res.json();
      setNodes(data);
    } catch (e) { console.error(e); }
  };

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/learning/sources');
      const data = await res.json();
      setSources(data);
    } catch (e) { console.error(e); }
  };

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/cek/rules');
      const data = await res.json();
      if (data) {
        setRules(data);
        Object.keys(data).forEach(dim => {
          cekInstance.updateRules(dim, 'pos', data[dim].pos);
          cekInstance.updateRules(dim, 'neg', data[dim].neg);
        });
      }
    } catch (e) { console.error(e); }
  };

  const saveRules = async (updatedRules: any) => {
    try {
      await fetch('/api/cek/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRules)
      });
    } catch (e) { console.error(e); }
  };

  const handleRegisterNode = async () => {
    if (!nodeName.trim()) return;
    try {
      await fetch(`/api/register/${encodeURIComponent(nodeName)}`);
      setNodeName('');
      fetchNodes();
      fetchLogs();
    } catch (e) { console.error(e); }
  };

  const handleAddSource = async () => {
    if (!learningName.trim() || !learningUrl.trim()) return;
    try {
      await fetch('/api/learning/add-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: learningName, url: learningUrl })
      });
      setLearningName('');
      setLearningUrl('');
      fetchSources();
      fetchLogs();
    } catch (e) { console.error(e); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('document', file);
    try {
      await fetch('/api/learning/upload', {
        method: 'POST',
        body: formData
      });
      fetchSources();
      fetchLogs();
    } catch (e) { console.error(e); }
    setIsUploading(false);
  };

  const handleCheckDrift = async () => {
    if (!driftText.trim()) return;
    setIsCheckingDrift(true);
    try {
      const res = await fetch('/api/learning/check-drift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: driftText })
      });
      const data = await res.json();
      setDriftResults(data);
      fetchLogs();
    } catch (e) { console.error(e); }
    setIsCheckingDrift(false);
  };

  const handlePolicyUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyFile) return;
    setIsPolicyUploading(true);
    const formData = new FormData();
    formData.append('policy', policyFile);
    try {
      const res = await fetch('/api/policy/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setPolicyFile(null);
        fetchLogs();
      } else {
        alert(data.error || "Upload failed");
      }
    } catch (e) { console.error(e); }
    setIsPolicyUploading(false);
  };

  const handlePolicyEvaluate = async () => {
    if (!policyEvalText.trim()) return;
    setIsPolicyEvaluating(true);
    try {
      const res = await fetch('/api/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: policyEvalText })
      });
      const data = await res.json();
      setPolicyEvalResult(data);
      fetchLogs();
    } catch (e) { console.error(e); }
    setIsPolicyEvaluating(false);
  };

  const handleEthicsAmend = async () => {
    if (!amendmentRequest.trim() || !vipKey.trim()) return;
    
    // Check if all countries are signed
    const unsigned = ethicsCountries.filter(c => !signedCountries[c]);
    if (unsigned.length > 0) {
      alert(`Missing signatures for: ${unsigned.slice(0, 3).join(', ')}${unsigned.length > 3 ? '...' : ''}`);
      return;
    }

    setIsAmending(true);
    try {
      // Prepare signatures payload (at least one per country)
      const collectedSignatures: Record<string, any[]> = {};
      ethicsCountries.forEach(c => {
        collectedSignatures[c] = [{ type: 'biometric', timestamp: new Date().toISOString() }];
      });

      const res = await fetch('/api/ethics/amend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amendmentRequest, 
          vipKey, 
          collectedSignatures 
        })
      });
      const data = await res.json();
      setAmendmentResult(data);
      fetchLogs();
    } catch (e) { console.error(e); }
    setIsAmending(false);
  };

  const toggleCountrySignature = (country: string) => {
    setSignedCountries(prev => ({
      ...prev,
      [country]: !prev[country]
    }));
  };

  const signAllCountries = () => {
    const allSigned: Record<string, boolean> = {};
    ethicsCountries.forEach(c => allSigned[c] = true);
    setSignedCountries(allSigned);
  };

  const handleUpdateThresholds = (key: string, value: any) => {
    if (typeof value === 'string' && (key === 'green' || key === 'yellow' || key === 'negationMultiplier')) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return;
      
      const newThresholds = { ...thresholds, [key]: numValue };
      setThresholds(newThresholds as any);
      
      if (key === 'green' || key === 'yellow') {
        cekInstance.updateThresholds(newThresholds.green, newThresholds.yellow);
      } else if (key === 'negationMultiplier') {
        cekInstance.updateNegationMultiplier(numValue);
      }
    } else {
      const newThresholds = { ...thresholds, [key]: value };
      setThresholds(newThresholds as any);
      
      if (key === 'negationWeights') {
        cekInstance.updateNegationWeights(value);
      } else if (key === 'adaptiveThresholding') {
        cekInstance.updateAdaptiveThresholding(value);
      }
    }
  };

  const handleAddKeyword = (dim: string, type: 'pos' | 'neg') => {
    if (!newKeyword.value.trim()) return;
    const currentKeywords = rules[dim][type];
    if (currentKeywords.includes(newKeyword.value.trim().toLowerCase())) return;
    
    const updatedKeywords = [...currentKeywords, newKeyword.value.trim().toLowerCase()];
    const updatedRules = {
      ...rules,
      [dim]: {
        ...rules[dim],
        [type]: updatedKeywords
      }
    };
    setRules(updatedRules);
    cekInstance.updateRules(dim, type, updatedKeywords);
    saveRules(updatedRules);
    setNewKeyword({ ...newKeyword, value: '' });
  };

  const handleEditKeyword = (dim: string, type: 'pos' | 'neg', oldKeyword: string, newKeywordValue: string) => {
    if (!newKeywordValue.trim()) return;
    const currentKeywords = rules[dim][type];
    const updatedKeywords = currentKeywords.map(k => k === oldKeyword ? newKeywordValue.trim().toLowerCase() : k);
    
    const updatedRules = {
      ...rules,
      [dim]: {
        ...rules[dim],
        [type]: updatedKeywords
      }
    };
    setRules(updatedRules);
    cekInstance.updateRules(dim, type, updatedKeywords);
    saveRules(updatedRules);
  };

  const handleUpdateAlertConfig = (updates: Partial<AlertConfig>) => {
    alertService.updateConfig(updates);
    setAlertConfig(alertService.getConfig());
  };

  const handleRemoveKeyword = (dim: string, type: 'pos' | 'neg', keyword: string) => {
    const updatedKeywords = rules[dim][type].filter(k => k !== keyword);
    const updatedRules = {
      ...rules,
      [dim]: {
        ...rules[dim],
        [type]: updatedKeywords
      }
    };
    setRules(updatedRules);
    cekInstance.updateRules(dim, type, updatedKeywords);
    saveRules(updatedRules);
  };

  const analytics = useMemo(() => {
    if (history.length === 0) return { avgDrift: 0, health: 'Green' };
    const sum = history.reduce((acc, e) => acc + e.drift, 0);
    return {
      avgDrift: (sum / history.length).toFixed(4),
      health: history[history.length - 1].status
    };
  }, [history]);

  const radarData = useMemo(() => {
    const subjects = ['Safety', 'Truth', 'Quality', 'Ethics', 'Engagement', 'Sentiment'];
    if (!currentEntry) {
      return subjects.map(subject => ({ subject, A: 0.5, B: 0.5, fullMark: 1 }));
    }
    
    return subjects.map((subject, i) => {
      const data: any = { 
        subject, 
        A: currentEntry.vector[i] ?? (i >= 4 ? 0.5 : 0), 
        fullMark: 1 
      };
      if (isComparisonMode && currentEntryB) {
        data.B = currentEntryB.vector[i] ?? (i >= 4 ? 0.5 : 0);
      }
      return data;
    });
  }, [currentEntry, currentEntryB, isComparisonMode]);

  useEffect(() => {
    // Initial integrity check
    const modules = ['cek-core', 'guardian-node', 'vector-sync', 'monitor-ui'];
    modules.forEach(m => integrityService.verifyArchitectureSync(m));
    setIntegrityStatuses(integrityService.getAllStatuses());

    // Periodic integrity check
    const interval = setInterval(() => {
      modules.forEach(m => integrityService.verifyArchitectureSync(m));
      setIntegrityStatuses(integrityService.getAllStatuses());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleEvaluate = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    let textToEvaluate = inputText;
    if (isGuidedInput) {
      textToEvaluate = `[CONTEXT]: ${guidedFields.context}\n[PROMPT]: ${guidedFields.prompt}\n[RESPONSE]: ${guidedFields.response}`;
    }

    const trimmedA = textToEvaluate.trim();
    const trimmedB = inputTextB.trim();
    
    if (!trimmedA && (!isComparisonMode || !trimmedB)) return;

    // Check for Guardian Access Code (only for A for simplicity)
    const notice = unlockGuardian(trimmedA);
    if (notice) {
      setGuardianNotice(notice);
      setInputText('');
      return;
    }

    setIsEvaluating(true);
    // Simulate slight processing delay for "Mission Control" feel
    setTimeout(() => {
      if (trimmedA) {
        const entryA = cekInstance.evaluate(trimmedA);
        setCurrentEntry(entryA);
        
        // Trigger Alert if necessary
        const analytics = cekInstance.getAnalytics();
        alertService.sendAlert(entryA, parseFloat(analytics.rollingDrift));
      }

      if (isComparisonMode && trimmedB) {
        const entryB = cekInstance.evaluate(trimmedB);
        setCurrentEntryB(entryB);
      }

      const newHistory = cekInstance.getHistory();
      setHistory(newHistory);
      
      if (!isGuidedInput) {
        setInputText('');
      }
      setInputTextB('');
      setIsEvaluating(false);
      setGuardianNotice(null);
    }, 400);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'text/plain' || file.type === 'application/pdf' || file.name.endsWith('.txt'))) {
      const mockEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileAttachment(mockEvent);
    }
  };

  const handleFileAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAttaching(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/cek/evaluate-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to evaluate file');
      }

      const result = await response.json();
      setInputText(result.text);
      setCurrentEntry(result);
      
      // Sync with client-side CEK instance
      cekInstance.addEntry(result);
      const newHistory = cekInstance.getHistory();
      setHistory(newHistory);
    } catch (error) {
      console.error('Error attaching file:', error);
    } finally {
      setIsAttaching(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Green': return 'text-[#00ff41]';
      case 'Yellow': return 'text-[#ffcc00]';
      case 'Red': return 'text-[#ff3333]';
      default: return 'text-zinc-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'Green': return 'bg-[#00ff41]/10 border-[#00ff41]/30';
      case 'Yellow': return 'bg-[#ffcc00]/10 border-[#ffcc00]/30';
      case 'Red': return 'bg-[#ff3333]/10 border-[#ff3333]/30';
      default: return 'bg-zinc-900 border-zinc-800';
    }
  };

  const filteredHistory = useMemo(() => {
    return history.filter(entry => {
      const statusMatch = historyFilterStatus === 'ALL' || entry.status.toUpperCase() === historyFilterStatus;
      
      let dateMatch = true;
      if (historyFilterDateRange.start) {
        dateMatch = dateMatch && new Date(entry.timestamp) >= new Date(historyFilterDateRange.start);
      }
      if (historyFilterDateRange.end) {
        const endDate = new Date(historyFilterDateRange.end);
        endDate.setHours(23, 59, 59, 999);
        dateMatch = dateMatch && new Date(entry.timestamp) <= endDate;
      }

      return statusMatch && dateMatch;
    });
  }, [history, historyFilterStatus, historyFilterDateRange]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e4e3e0] font-sans selection:bg-[#00ff41]/30">
      {/* Background Grid */}
      <div className="fixed inset-0 data-grid opacity-20 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-[#262626] bg-[#0a0a0a]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#00ff41]" />
          </div>
          <div>
            <h1 className="text-lg font-mono font-bold tracking-tighter uppercase">CEK Alignment Monitor</h1>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Contextual Evaluation Key v2.0.0</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <nav className="flex items-center gap-1 bg-black/40 p-1 rounded border border-[#262626]">
            {[
              { id: 'monitor', icon: Activity, label: 'Monitor' },
              { id: 'performance', icon: BarChart3, label: 'Performance' },
              { id: 'models', icon: Cpu, label: 'Models' },
              { id: 'safety-analytics', icon: Shield, label: 'Safety' },
              { id: 'truthfulness-analytics', icon: Globe, label: 'Truthfulness' },
              { id: 'sentiment-analytics', icon: Sparkles, label: 'Sentiment' },
              { id: 'learning', icon: Database, label: 'Learning' },
              { id: 'ethics-memory', icon: Lock, label: 'Ethics Memory' },
              { id: 'policy', icon: Shield, label: 'Policy' },
              { id: 'nodes', icon: Network, label: 'Nodes' },
              { id: 'logs', icon: Terminal, label: 'Logs' }, { id: 'workflow', icon: FileSignature, label: 'Document Gate' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-widest transition-all",
                  activeTab === tab.id 
                    ? "bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/30" 
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="h-8 w-[1px] bg-[#262626]" />
          <div className="text-right">
            <p className="text-[10px] font-mono text-zinc-500 uppercase">System Health</p>
            <div className={cn("flex items-center gap-2 font-mono font-bold", getStatusColor(analytics.health))}>
              <Activity className="w-4 h-4" />
              {analytics.health.toUpperCase()}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Avg Drift</p>
            <p className="font-mono font-bold text-white">{analytics.avgDrift}</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 p-6 max-w-[1600px] mx-auto">
        {activeTab === 'ethics-memory' && (
          <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="col-span-12 lg:col-span-6 space-y-6">
              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#00ff41]" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#00ff41]" />
                  Ethics-Locked Memory Synthesis
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Source Chat ID</label>
                    <input 
                      type="text" 
                      value={memoryChatId}
                      onChange={(e) => setMemoryChatId(e.target.value)}
                      className="w-full bg-black border border-[#262626] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#00ff41]/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Conversation Text</label>
                    <textarea 
                      value={memoryText}
                      onChange={(e) => setMemoryText(e.target.value)}
                      placeholder="Enter conversation text to synthesize into long-term memory..."
                      className="w-full h-32 bg-black border border-[#262626] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#00ff41]/50 resize-none"
                    />
                  </div>
                  <button 
                    onClick={handleSynthesizeMemory}
                    disabled={isSynthesizing || !memoryText.trim()}
                    className="w-full bg-[#00ff41] text-black font-mono font-bold py-3 rounded hover:bg-[#00ff41]/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
                  >
                    {isSynthesizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Synthesize Memory
                  </button>
                </div>

                {memoryResults && (
                  <div className="mt-6 space-y-4 border-t border-[#262626] pt-6 animate-in fade-in duration-500">
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(memoryResults.ethics_principle).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 p-1.5 bg-black/40 border border-[#262626] rounded">
                          <div className={cn("w-1.5 h-1.5 rounded-full", value ? "bg-[#00ff41]" : "bg-zinc-800")} />
                          <span className="text-[8px] font-mono text-zinc-500 uppercase truncate">{key.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-black border border-[#00ff41]/20 rounded">
                      <p className="text-[10px] font-mono text-[#00ff41] uppercase mb-1">Memory Entry Created</p>
                      <p className="text-[11px] font-mono text-zinc-400">Linked to {memoryResults.linked_conversations.length} similar past conversations.</p>
                    </div>
                    {memoryResults.linked_conversations.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-mono text-zinc-500 uppercase">Linked Memories</p>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                          {memoryResults.linked_conversations.map((c: any, i: number) => (
                            <div key={i} className="p-2 bg-black/40 border border-[#262626] rounded">
                              <p className="text-[9px] font-mono text-zinc-600 mb-1">{new Date(c.timestamp).toLocaleString()}</p>
                              <p className="text-[10px] font-mono text-zinc-300 line-clamp-2">{c.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#00ff41]" />
                  CEK Shift Tracking
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Shift Type</label>
                    <select 
                      value={shiftType}
                      onChange={(e) => setShiftType(e.target.value)}
                      className="w-full bg-black border border-[#262626] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#00ff41]/50"
                    >
                      <option value="SIDE_1_FULL">SIDE 1 FULL</option>
                      <option value="SIDE_2_FULL">SIDE 2 FULL</option>
                      <option value="SIDE_3_FULL">SIDE 3 FULL</option>
                      <option value="TILT_SIDE_1_30">TILT SIDE 1 (30%)</option>
                      <option value="TILT_SIDE_2_60">TILT SIDE 2 (60%)</option>
                      <option value="TILT_SIDE_3_90">TILT SIDE 3 (90%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Intensity (0-1)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0"
                      max="1"
                      value={shiftIntensity}
                      onChange={(e) => setShiftIntensity(parseFloat(e.target.value))}
                      className="w-full bg-black border border-[#262626] rounded px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#00ff41]/50"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleRecordShift}
                  disabled={isRecordingShift}
                  className="w-full bg-black border border-[#00ff41]/30 text-[#00ff41] font-mono font-bold py-3 rounded hover:bg-[#00ff41]/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
                >
                  {isRecordingShift ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                  Record CEK Shift
                </button>
              </section>
            </div>

            <div className="col-span-12 lg:col-span-6 space-y-6">
              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-6 shrink-0">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#00ff41]" />
                    Ethics-Safe Drift Scan
                  </h2>
                  <button 
                    onClick={fetchDriftScan}
                    className="p-1.5 hover:bg-white/5 rounded transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                  </button>
                </div>

                {driftScan ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
                      <div className="bg-black border border-[#262626] p-4 rounded text-center">
                        <p className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Total Shifts</p>
                        <p className="text-2xl font-mono font-bold text-[#00ff41]">{driftScan.total_shifts}</p>
                      </div>
                      <div className="bg-black border border-[#262626] p-4 rounded text-center">
                        <p className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Last Scan</p>
                        <p className="text-[10px] font-mono font-bold text-white uppercase">{new Date(driftScan.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      <p className="text-[10px] font-mono text-zinc-500 uppercase mb-3">Recent Shifts (Last 10)</p>
                      <div className="space-y-3">
                        {driftScan.recent_shifts.length === 0 ? (
                          <p className="text-[10px] font-mono text-zinc-600 italic">No shifts recorded yet.</p>
                        ) : (
                          [...driftScan.recent_shifts].reverse().map((s: any, i: number) => (
                            <div key={i} className="p-3 bg-black/40 border border-[#262626] rounded flex items-center justify-between group hover:border-[#00ff41]/30 transition-colors">
                              <div className="flex items-center gap-3">
                                <span 
                                  className="text-xl"
                                  style={s.intensity > 0 ? { 
                                    animation: `blink ${Math.max(0.2, 1.0 - s.intensity)}s infinite ease-in-out` 
                                  } : undefined}
                                >
                                  {s.indicator}
                                </span>
                                <div>
                                  <p className="text-[11px] font-mono font-bold text-white group-hover:text-[#00ff41] transition-colors">{s.shift_type}</p>
                                  <p className="text-[9px] font-mono text-zinc-600">{new Date(s.timestamp).toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-mono text-zinc-500 uppercase">Intensity</p>
                                <p className="text-xs font-mono font-bold text-[#00ff41]">{(s.intensity * 100).toFixed(0)}%</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-zinc-800 animate-spin" />
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
              <h2 className="text-xl font-mono font-bold tracking-tighter uppercase flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-[#00ff41]" />
                System Performance Monitoring
              </h2>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mt-1">Tracking long-term CEK alignment drift and degradation trends</p>
            </div>
            <PerformanceMonitorUI />
          </div>
        )}

        {activeTab === 'safety-analytics' && (
          <SafetyAnalytics history={history} currentEntry={currentEntry} />
        )}

        {activeTab === 'sentiment-analytics' && (
          <SentimentAnalytics history={history} />
        )}

        {activeTab === 'truthfulness-analytics' && (
          <TruthfulnessAnalytics history={history} currentEntry={currentEntry} />
        )}

        {activeTab === 'models' && (
          <ModelInfo config={cekInstance.getConfig()} />
        )}

        {activeTab === 'monitor' && (
          <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left Column: Input & Vector Analysis */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
              {/* Input Panel */}
              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#00ff41]" />
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#00ff41]" />
                    Input Evaluation
                  </h2>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "text-[9px] font-mono uppercase px-2 py-1 rounded border transition-all flex items-center gap-1.5",
                        isAttaching ? "bg-[#00ff41]/20 border-[#00ff41] text-[#00ff41]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {isAttaching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      Upload
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowSampleLibrary(!showSampleLibrary)}
                      className={cn(
                        "text-[9px] font-mono uppercase px-2 py-1 rounded border transition-all flex items-center gap-1.5",
                        showSampleLibrary ? "bg-[#00ff41]/10 border-[#00ff41] text-[#00ff41]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <BookOpen className="w-3 h-3" />
                      Samples
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsGuidedInput(!isGuidedInput)}
                      className={cn(
                        "text-[9px] font-mono uppercase px-2 py-1 rounded border transition-all flex items-center gap-1.5",
                        isGuidedInput ? "bg-[#00ff41]/10 border-[#00ff41] text-[#00ff41]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <LayoutGrid className="w-3 h-3" />
                      Guided
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsComparisonMode(!isComparisonMode)}
                      className={cn(
                        "text-[9px] font-mono uppercase px-2 py-1 rounded border transition-all",
                        isComparisonMode ? "bg-[#00ff41]/10 border-[#00ff41] text-[#00ff41]" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                      )}
                    >
                      {isComparisonMode ? "Comparison: ON" : "Comparison: OFF"}
                    </button>
                  </div>
                </div>

                {showSampleLibrary && (
                  <div className="mb-4 p-4 bg-black border border-[#262626] rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[10px] font-mono text-zinc-500 uppercase font-bold flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-[#00ff41]" />
                        Sample Library
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono text-zinc-600 uppercase">Select a scenario to load</span>
                        <button onClick={() => setShowSampleLibrary(false)} className="text-zinc-600 hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CEK_SAMPLES.map(sample => (
                        <button
                          key={sample.id}
                          type="button"
                          onClick={() => {
                            setInputText(sample.text);
                            setShowSampleLibrary(false);
                            setIsGuidedInput(false);
                          }}
                          className="text-left p-2 bg-zinc-900/50 border border-zinc-800 rounded hover:border-[#00ff41]/50 transition-all group"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono text-white group-hover:text-[#00ff41]">{sample.label}</span>
                            <span className={cn(
                              "text-[7px] font-mono px-1.5 py-0.5 rounded uppercase",
                              sample.category === 'Safety' ? "bg-red-900/20 text-red-400" :
                              sample.category === 'Ethics' ? "bg-purple-900/20 text-purple-400" :
                              sample.category === 'Truthfulness' ? "bg-blue-900/20 text-blue-400" :
                              "bg-zinc-800 text-zinc-500"
                            )}>
                              {sample.category}
                            </span>
                          </div>
                          <p className="text-[9px] font-mono text-zinc-600 line-clamp-1">{sample.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleEvaluate} className="space-y-4">
                  <div className={cn("grid gap-4", isComparisonMode ? "grid-cols-2" : "grid-cols-1")}>
                    {isGuidedInput ? (
                      <div className="space-y-4 p-4 bg-black/40 border border-dashed border-[#262626] rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-[10px] font-mono text-[#00ff41] uppercase font-bold">Guided Evaluation Builder</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono text-zinc-600 uppercase">Templates:</span>
                            <div className="flex gap-1">
                              {GUIDED_TEMPLATES.map(template => (
                                <button
                                  key={template.id}
                                  type="button"
                                  onClick={() => setGuidedFields({
                                    context: template.context,
                                    prompt: template.prompt,
                                    response: template.response
                                  })}
                                  className="text-[8px] font-mono px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
                                >
                                  {template.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-mono text-zinc-500 uppercase flex items-center gap-1.5">
                                <Terminal className="w-3 h-3" />
                                System Context / Prompt
                              </label>
                              <textarea
                                value={guidedFields.context}
                                onChange={(e) => setGuidedFields({...guidedFields, context: e.target.value})}
                                placeholder="Optional: Enter the system instructions or conversation context..."
                                className="w-full h-24 bg-black border border-[#262626] rounded p-3 font-mono text-xs focus:outline-none focus:border-[#00ff41]/50 transition-colors resize-none"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-mono text-zinc-500 uppercase flex items-center gap-1.5">
                                <Search className="w-3 h-3" />
                                User Query
                              </label>
                              <textarea
                                value={guidedFields.prompt}
                                onChange={(e) => setGuidedFields({...guidedFields, prompt: e.target.value})}
                                placeholder="Enter the user's question or prompt..."
                                className="w-full h-24 bg-black border border-[#262626] rounded p-3 font-mono text-xs focus:outline-none focus:border-[#00ff41]/50 transition-colors resize-none"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-mono text-zinc-500 uppercase flex items-center gap-1.5">
                              <Zap className="w-3 h-3 text-[#00ff41]" />
                              AI Response to Analyze
                            </label>
                            <textarea
                              value={guidedFields.response}
                              onChange={(e) => setGuidedFields({...guidedFields, response: e.target.value})}
                              placeholder="Enter the AI response text to evaluate..."
                              className="w-full h-full min-h-[150px] bg-black border border-[#262626] rounded p-3 font-mono text-xs focus:outline-none focus:border-[#00ff41]/50 transition-colors resize-none"
                            />
                          </div>
                        </div>
                        <div className="pt-2 border-t border-[#262626] flex justify-between items-center">
                          <button
                            type="button"
                            onClick={() => setGuidedFields({ context: '', prompt: '', response: '' })}
                            className="text-[9px] font-mono text-zinc-600 hover:text-white uppercase"
                          >
                            Clear Fields
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const composed = `[CONTEXT]: ${guidedFields.context}\n[PROMPT]: ${guidedFields.prompt}\n[RESPONSE]: ${guidedFields.response}`;
                              setInputText(composed);
                              setIsGuidedInput(false);
                            }}
                            className="text-[9px] font-mono text-[#00ff41] hover:underline uppercase font-bold"
                          >
                            Compose & Switch to Standard View
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={cn(
                          "space-y-2 relative group rounded transition-all duration-200",
                          isDragging ? "ring-2 ring-[#00ff41] ring-inset bg-[#00ff41]/5" : ""
                        )}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        {isComparisonMode && <p className="text-[8px] font-mono text-zinc-600 uppercase">Model A</p>}
                        <textarea
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder={isDragging ? "Drop file here..." : "Enter AI response text for Model A..."}
                          className={cn(
                            "w-full h-32 bg-black border border-[#262626] rounded p-4 font-mono text-sm focus:outline-none focus:border-[#00ff41]/50 transition-colors resize-none placeholder:text-zinc-700",
                            isDragging ? "border-[#00ff41] bg-black/50" : ""
                          )}
                        />
                        
                        {isDragging && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/80 border border-[#00ff41] px-4 py-2 rounded flex items-center gap-2 animate-pulse">
                              <FileText className="w-4 h-4 text-[#00ff41]" />
                              <span className="text-xs font-mono text-[#00ff41] uppercase">Release to Analyze</span>
                            </div>
                          </div>
                        )}

                        <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileAttachment} 
                            className="hidden" 
                            accept=".txt,.pdf"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isAttaching}
                            className="p-1.5 bg-zinc-900 border border-[#262626] rounded hover:border-[#00ff41] text-zinc-500 hover:text-[#00ff41] transition-all"
                            title="Attach File (.txt, .pdf)"
                          >
                            {isAttaching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    )}
                    {isComparisonMode && (
                      <div className="space-y-2">
                        <p className="text-[8px] font-mono text-zinc-600 uppercase">Model B</p>
                        <textarea
                          value={inputTextB}
                          onChange={(e) => setInputTextB(e.target.value)}
                          placeholder="Enter AI response text for Model B..."
                          className="w-full h-32 bg-black border border-[#262626] rounded p-4 font-mono text-sm focus:outline-none focus:border-[#00e5ff]/50 transition-colors resize-none placeholder:text-zinc-700"
                        />
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isEvaluating || (!inputText.trim() && (!isComparisonMode || !inputTextB.trim()))}
                    className="w-full bg-[#00ff41] text-black font-mono font-bold py-3 rounded hover:bg-[#00ff41]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
                  >
                    {isEvaluating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Run Evaluation
                  </button>
                </form>

                {guardianNotice && (
                  <div className="mt-6 p-4 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-2 mb-2 text-[#ff3333] font-mono font-bold text-[10px] uppercase tracking-widest">
                      <AlertTriangle className="w-4 h-4" />
                      Guardian Notice
                    </div>
                    <pre className="text-[10px] font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed">
                      {guardianNotice}
                    </pre>
                    <button 
                      onClick={() => setGuardianNotice(null)}
                      className="mt-4 text-[9px] font-mono text-zinc-600 hover:text-zinc-400 uppercase tracking-widest underline underline-offset-4"
                    >
                      Dismiss Notice
                    </button>
                  </div>
                )}

                {currentEntry && (
                  <div className="mt-6 p-4 bg-black border border-[#262626] rounded animate-in fade-in duration-500">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[10px] font-mono text-[#00ff41] uppercase font-bold">Sentiment Analysis</h3>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[8px] font-mono text-zinc-600 uppercase">Comparative</p>
                          <p className="text-[10px] font-mono text-white">{(currentEntry.sentiment?.comparative || 0).toFixed(4)}</p>
                        </div>
                        <span className={cn(
                          "text-[10px] font-mono font-bold px-2 py-0.5 rounded",
                          (currentEntry.sentiment?.score || 0) > 0 ? "bg-green-500/10 text-green-500" : 
                          (currentEntry.sentiment?.score || 0) < 0 ? "bg-red-500/10 text-red-500" : "bg-zinc-800 text-zinc-500"
                        )}>
                          {currentEntry.sentiment?.score || 0}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-[9px] font-mono text-zinc-600 uppercase">Positive Signals</p>
                        <div className="flex flex-wrap gap-1">
                          {currentEntry.sentiment?.positive.length ? currentEntry.sentiment.positive.map(w => (
                            <span key={w} className="text-[8px] font-mono text-green-500 bg-green-500/5 px-1.5 py-0.5 rounded border border-green-500/20">{w}</span>
                          )) : <span className="text-[8px] font-mono text-zinc-700 italic">None</span>}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] font-mono text-zinc-600 uppercase">Negative Signals</p>
                        <div className="flex flex-wrap gap-1">
                          {currentEntry.sentiment?.negative.length ? currentEntry.sentiment.negative.map(w => (
                            <span key={w} className="text-[8px] font-mono text-red-500 bg-red-500/5 px-1.5 py-0.5 rounded border border-red-500/20">{w}</span>
                          )) : <span className="text-[8px] font-mono text-zinc-700 italic">None</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Vector Visualization */}
              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#00ff41]" />
                  Alignment Profile (Radar)
                </h2>
                
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#262626" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
                      <Radar
                        name="Model A"
                        dataKey="A"
                        stroke="#00ff41"
                        fill="#00ff41"
                        fillOpacity={0.3}
                      />
                      {isComparisonMode && (
                        <Radar
                          name="Model B"
                          dataKey="B"
                          stroke="#00e5ff"
                          fill="#00e5ff"
                          fillOpacity={0.3}
                        />
                      )}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-5 gap-2 mt-4">
                  {radarData.map((d, i) => (
                    <div key={i} className="bg-black border border-[#262626] p-2 rounded text-center">
                      <p className="text-[8px] font-mono text-zinc-500 uppercase mb-1">{d.subject}</p>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          {isComparisonMode && <span className="text-[7px] text-zinc-600">A</span>}
                          <p className="text-[10px] font-mono font-bold text-[#00ff41]">{d.A.toFixed(2)}</p>
                        </div>
                        {isComparisonMode && (
                          <div className="flex items-center justify-between gap-2 border-t border-[#262626] pt-1">
                            <span className="text-[7px] text-zinc-600">B</span>
                            <p className="text-[10px] font-mono font-bold text-[#00e5ff]">{d.B.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 6D Vector Projection */}
              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-[#00ff41]" />
                  6D Geometric Projection
                </h2>
                <div className="h-[400px] w-full">
                  <VectorVisualization 
                    currentVector={currentEntry?.vector || [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]} 
                    currentVectorB={isComparisonMode ? (currentEntryB?.vector || [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]) : undefined}
                    history={history} 
                    onVectorChange={(v) => {
                      if (currentEntry) {
                        const status = cekInstance.getStatus(v);
                        const drift = cekInstance.calculateDrift(v);
                        setCurrentEntry({ ...currentEntry, vector: v, status, drift });
                      }
                    }}
                  />
                </div>
                <div className="mt-4 p-3 bg-black/40 border border-[#262626] rounded">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase leading-relaxed">
                    Interactive 4D space mapping Safety (X), Truth (Y), and Quality (Z). 
                    Ethics is encoded in the color spectrum. Hover points to detect geometric similarities.
                  </p>
                </div>
              </section>

              {/* Configuration Panel */}
              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#00ff41]" />
                  System Configuration
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase">Green Threshold (Minimal Drift)</label>
                      <span className="text-xs font-mono text-[#00ff41]">{thresholds.green.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="0.5" 
                      step="0.01"
                      value={thresholds.green}
                      onChange={(e) => handleUpdateThresholds('green', e.target.value)}
                      className="w-full accent-[#00ff41] bg-zinc-900 h-1 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase">Yellow Threshold (Moderate Drift)</label>
                      <span className="text-xs font-mono text-[#ffcc00]">{thresholds.yellow.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.05" 
                      max="1" 
                      step="0.01"
                      value={thresholds.yellow}
                      onChange={(e) => handleUpdateThresholds('yellow', e.target.value)}
                      className="w-full accent-[#ffcc00] bg-zinc-900 h-1 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase">Negation Sensitivity (Multiplier)</label>
                      <span className="text-xs font-mono text-[#00e5ff]">{thresholds.negationMultiplier.toFixed(1)}x</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="5" 
                      step="0.1"
                      value={thresholds.negationMultiplier}
                      onChange={(e) => handleUpdateThresholds('negationMultiplier', e.target.value)}
                      className="w-full accent-[#00e5ff] bg-zinc-900 h-1 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="pt-4 border-t border-[#262626]">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase">Adaptive Thresholding</label>
                      <button 
                        onClick={() => handleUpdateThresholds('adaptiveThresholding', { ...thresholds.adaptiveThresholding, enabled: !thresholds.adaptiveThresholding.enabled })}
                        className={cn(
                          "w-10 h-5 rounded-full relative transition-colors duration-200",
                          thresholds.adaptiveThresholding.enabled ? "bg-[#00ff41]" : "bg-zinc-800"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-3 h-3 rounded-full bg-black transition-all duration-200",
                          thresholds.adaptiveThresholding.enabled ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                    {thresholds.adaptiveThresholding.enabled && (
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase">Adaptation Sensitivity</label>
                          <span className="text-xs font-mono text-[#00ff41]">{thresholds.adaptiveThresholding.sensitivity.toFixed(2)}</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.05"
                          value={thresholds.adaptiveThresholding.sensitivity}
                          onChange={(e) => handleUpdateThresholds('adaptiveThresholding', { ...thresholds.adaptiveThresholding, sensitivity: parseFloat(e.target.value) })}
                          className="w-full accent-[#00ff41] bg-zinc-900 h-1 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#262626]">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase mb-4 block">Per-Dimension Negation Weights</label>
                    <div className="grid grid-cols-2 gap-4">
                      {['Safety', 'Truth', 'Quality', 'Ethics', 'Engagement'].map((label, idx) => (
                        <div key={label}>
                          <div className="flex justify-between mb-1">
                            <span className="text-[9px] font-mono text-zinc-600 uppercase">{label}</span>
                            <span className="text-[9px] font-mono text-[#00e5ff]">{thresholds.negationWeights[idx].toFixed(1)}</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="3" 
                            step="0.1"
                            value={thresholds.negationWeights[idx]}
                            onChange={(e) => {
                              const newWeights = [...thresholds.negationWeights];
                              newWeights[idx] = parseFloat(e.target.value);
                              handleUpdateThresholds('negationWeights', newWeights);
                            }}
                            className="w-full accent-[#00e5ff] bg-zinc-900 h-1 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-black border border-[#262626] rounded">
                    <p className="text-[9px] font-mono text-zinc-600 leading-relaxed uppercase">
                      Adaptive buffer is currently active. Thresholds are dynamically adjusted based on rolling average drift ({analytics.avgDrift}).
                    </p>
                  </div>
                </div>
              </section>

              {/* Alerting System Panel */}
              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#00ff41]" />
                  Alignment Alerting System
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-black border border-[#262626] rounded">
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono text-white uppercase">System Alerts</p>
                      <p className="text-[8px] font-mono text-zinc-500 uppercase">Enable automatic drift notifications</p>
                    </div>
                    <button 
                      onClick={() => handleUpdateAlertConfig({ enabled: !alertConfig.enabled })}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-colors duration-200",
                        alertConfig.enabled ? "bg-[#00ff41]" : "bg-zinc-800"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-3 h-3 rounded-full bg-black transition-all duration-200",
                        alertConfig.enabled ? "right-1" : "left-1"
                      )} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono text-zinc-500 uppercase">Minimum Severity</label>
                      <select 
                        value={alertConfig.minStatus}
                        onChange={(e) => handleUpdateAlertConfig({ minStatus: e.target.value as 'Yellow' | 'Red' })}
                        className="w-full bg-black border border-[#262626] rounded p-2 text-[10px] font-mono text-white focus:outline-none focus:border-[#00ff41]/50"
                      >
                        <option value="Yellow">YELLOW (MODERATE)</option>
                        <option value="Red">RED (CRITICAL)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono text-zinc-500 uppercase">Alert Method</label>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-black border border-[#262626] rounded p-2 text-[10px] font-mono text-zinc-500 uppercase text-center">
                          WEBHOOK
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-mono text-zinc-500 uppercase">Webhook Endpoint URL</label>
                    <input 
                      type="url" 
                      placeholder="https://hooks.slack.com/services/..."
                      value={alertConfig.webhookUrl}
                      onChange={(e) => handleUpdateAlertConfig({ webhookUrl: e.target.value })}
                      className="w-full bg-black border border-[#262626] rounded p-2 text-[10px] font-mono text-white focus:outline-none focus:border-[#00ff41]/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-mono text-zinc-500 uppercase">Notification Email (Optional)</label>
                    <input 
                      type="email" 
                      placeholder="admin@alignment-core.io"
                      value={alertConfig.email}
                      onChange={(e) => handleUpdateAlertConfig({ email: e.target.value })}
                      className="w-full bg-black border border-[#262626] rounded p-2 text-[10px] font-mono text-white focus:outline-none focus:border-[#00ff41]/50"
                    />
                  </div>

                  <div className="p-3 bg-[#00ff41]/5 border border-[#00ff41]/10 rounded">
                    <p className="text-[8px] font-mono text-[#00ff41] leading-relaxed uppercase">
                      Alerts are triggered when the CEK status crosses the minimum severity threshold. Payloads include vector coordinates, drift magnitude, and sentiment analysis.
                    </p>
                  </div>
                </div>
              </section>

              {/* Data Export Panel */}
              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#00ff41]" />
                  Evaluation History Export
                </h2>
                
                <div className="space-y-4">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase leading-relaxed">
                    Export full evaluation history and metrics as a CSV file for external auditing and analysis.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono text-zinc-500 uppercase">Start Date</label>
                      <input 
                        type="date" 
                        value={exportDateRange.start}
                        onChange={(e) => setExportDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full bg-black border border-[#262626] rounded p-2 text-[10px] font-mono text-white focus:outline-none focus:border-[#00ff41]/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono text-zinc-500 uppercase">End Date</label>
                      <input 
                        type="date" 
                        value={exportDateRange.end}
                        onChange={(e) => setExportDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full bg-black border border-[#262626] rounded p-2 text-[10px] font-mono text-white focus:outline-none focus:border-[#00ff41]/50"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => exportToCSV(history, exportDateRange.start, exportDateRange.end)}
                    className="w-full py-3 bg-[#00ff41]/10 border border-[#00ff41]/30 hover:bg-[#00ff41]/20 text-[#00ff41] text-[10px] font-mono font-bold uppercase tracking-widest transition-all rounded flex items-center justify-center gap-2"
                  >
                    <Download className="w-3 h-3" />
                    Generate CSV Export
                  </button>

                  <div className="p-3 bg-black border border-[#262626] rounded">
                    <p className="text-[8px] font-mono text-zinc-600 leading-relaxed uppercase">
                      Export includes: Timestamps, Status, Drift Magnitude, Sentiment Score, 5D Vector Coordinates, and Raw Input Text.
                    </p>
                  </div>
                </div>
              </section>

              {/* Keyword Management Panel */}
              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#00ff41]" />
                    Keyword Management
                  </h2>
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input 
                      type="text" 
                      placeholder="Filter keywords..."
                      value={keywordSearch}
                      onChange={(e) => setKeywordSearch(e.target.value)}
                      className="bg-black border border-[#262626] rounded pl-7 pr-2 py-1 text-[10px] font-mono focus:outline-none focus:border-[#00ff41]/50 w-40"
                    />
                  </div>
                </div>
                
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {Object.keys(rules).map((dim) => {
                    const filteredPos = rules[dim].pos.filter((kw: string) => kw.toLowerCase().includes(keywordSearch.toLowerCase()));
                    const filteredNeg = rules[dim].neg.filter((kw: string) => kw.toLowerCase().includes(keywordSearch.toLowerCase()));
                    
                    if (keywordSearch && filteredPos.length === 0 && filteredNeg.length === 0) return null;

                    return (
                      <div key={dim} className="space-y-4 border-b border-[#1a1a1a] pb-6 last:border-0">
                        <h3 className="text-[11px] font-mono font-bold text-[#00ff41] uppercase tracking-wider">{dim}</h3>
                        
                        {/* Positive Keywords */}
                        <div className="space-y-2">
                          <p className="text-[9px] font-mono text-zinc-500 uppercase">Positive Associations</p>
                          <div className="flex flex-wrap gap-1.5">
                            {filteredPos.map((kw: string) => (
                              <span key={kw} className="bg-[#00ff41]/5 border border-[#00ff41]/20 text-[#00ff41] text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 group">
                                {kw}
                                <button onClick={() => handleRemoveKeyword(dim, 'pos', kw)} className="hover:text-white opacity-40 group-hover:opacity-100">×</button>
                              </span>
                            ))}
                            {filteredPos.length === 0 && keywordSearch && <span className="text-[8px] font-mono text-zinc-700 italic">No matches</span>}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <input 
                              type="text" 
                              placeholder="Add positive..."
                              className="flex-1 bg-black border border-[#262626] rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-[#00ff41]/50"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddKeyword(dim, 'pos');
                                }
                              }}
                              onChange={(e) => setNewKeyword({ dim, type: 'pos', value: e.target.value })}
                              value={newKeyword.dim === dim && newKeyword.type === 'pos' ? newKeyword.value : ''}
                              onFocus={() => setNewKeyword({ dim, type: 'pos', value: '' })}
                            />
                            <button 
                              onClick={() => handleAddKeyword(dim, 'pos')}
                              className="bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] px-2 py-1 rounded text-[10px] font-mono hover:bg-[#00ff41]/20"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Negative Keywords */}
                        <div className="space-y-2">
                          <p className="text-[9px] font-mono text-zinc-500 uppercase">Negative Associations</p>
                          <div className="flex flex-wrap gap-1.5">
                            {filteredNeg.map((kw: string) => (
                              <span key={kw} className="bg-[#ff3333]/5 border border-[#ff3333]/20 text-[#ff3333] text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 group">
                                {kw}
                                <button onClick={() => handleRemoveKeyword(dim, 'neg', kw)} className="hover:text-white opacity-40 group-hover:opacity-100">×</button>
                              </span>
                            ))}
                            {filteredNeg.length === 0 && keywordSearch && <span className="text-[8px] font-mono text-zinc-700 italic">No matches</span>}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <input 
                              type="text" 
                              placeholder="Add negative..."
                              className="flex-1 bg-black border border-[#262626] rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-[#ff3333]/50"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddKeyword(dim, 'neg');
                                }
                              }}
                              onChange={(e) => setNewKeyword({ dim, type: 'neg', value: e.target.value })}
                              value={newKeyword.dim === dim && newKeyword.type === 'neg' ? newKeyword.value : ''}
                              onFocus={() => setNewKeyword({ dim, type: 'neg', value: '' })}
                            />
                            <button 
                              onClick={() => handleAddKeyword(dim, 'neg')}
                              className="bg-[#ff3333]/10 border border-[#ff3333]/30 text-[#ff3333] px-2 py-1 rounded text-[10px] font-mono hover:bg-[#ff3333]/20"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* SWI Integrity Monitor Panel */}
              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#00ff41]" />
                    SWI OS 2.0 Integrity Monitor
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-zinc-600 uppercase">Parent Architecture Sync</span>
                    <div className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
                  </div>
                </div>

                <div className="space-y-3">
                  {integrityStatuses.map((status) => (
                    <div key={status.moduleId} className="flex items-center justify-between p-3 bg-black border border-[#262626] rounded group hover:border-zinc-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-1.5 rounded",
                          status.status === 'SYNCED' ? "bg-[#00ff41]/10 text-[#00ff41]" : "bg-red-500/10 text-red-500"
                        )}>
                          {status.status === 'SYNCED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-white uppercase font-bold">{status.moduleId}</p>
                          <p className="text-[8px] font-mono text-zinc-600 uppercase">Fingerprint: {status.fingerprint}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "text-[8px] font-mono px-1.5 py-0.5 rounded uppercase",
                          status.status === 'SYNCED' ? "bg-[#00ff41]/10 text-[#00ff41]" : "bg-red-500/10 text-red-500"
                        )}>
                          {status.status}
                        </span>
                        <p className="text-[7px] font-mono text-zinc-700 mt-1 uppercase">Checked: {new Date(status.lastCheck).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-[#1a1a1a] flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-[9px] font-mono text-zinc-500 uppercase">Identity Protection</p>
                    <p className="text-[7px] font-mono text-zinc-700 uppercase">Automatic module locking on architectural drift</p>
                  </div>
                  <button 
                    onClick={() => {
                      integrityService.simulateDrift('cek-core');
                      setIntegrityStatuses(integrityService.getAllStatuses());
                    }}
                    className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-500 text-[9px] font-mono uppercase hover:bg-red-500/20 transition-all rounded"
                  >
                    Simulate Drift
                  </button>
                </div>
              </section>
            </div>

            {/* Right Column: Analytics & History */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              
              {/* 6D Vector Visualization */}
              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6 h-[400px]">
                <VectorVisualization 
                  currentVector={currentEntry?.vector || [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]} 
                  currentVectorB={isComparisonMode ? (currentEntryB?.vector || [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]) : undefined}
                  history={history} 
                  rules={rules}
                  onAddKeyword={(dim, type, val) => {
                    // We need to set the newKeyword state temporarily to use handleAddKeyword
                    // or just implement the logic here. Let's just implement it to avoid state sync issues.
                    const currentKeywords = rules[dim][type];
                    if (currentKeywords.includes(val.toLowerCase())) return;
                    const updatedKeywords = [...currentKeywords, val.toLowerCase()];
                    const updatedRules = { ...rules, [dim]: { ...rules[dim], [type]: updatedKeywords } };
                    setRules(updatedRules);
                    cekInstance.updateRules(dim, type, updatedKeywords);
                    saveRules(updatedRules);
                  }}
                  onRemoveKeyword={handleRemoveKeyword}
                  onEditKeyword={handleEditKeyword}
                  onVectorChange={(v) => {
                    if (currentEntry) {
                      const status = cekInstance.getStatus(v);
                      const drift = cekInstance.calculateDrift(v);
                      setCurrentEntry({ ...currentEntry, vector: v, status, drift });
                    }
                  }}
                />
              </section>

              {/* Drift Analytics */}
              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#00ff41]" />
                    Drift Analysis History
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#00ff41]" />
                      <span className="text-[10px] font-mono text-zinc-500">SAFE</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#ff3333]" />
                      <span className="text-[10px] font-mono text-zinc-500">DRIFT</span>
                    </div>
                  </div>
                </div>

                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="colorDrift" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00ff41" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#00ff41" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                      <XAxis 
                        dataKey="timestamp" 
                        hide 
                      />
                      <YAxis 
                        domain={[0, 1]} 
                        tick={{ fill: '#444', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #262626', borderRadius: '4px' }}
                        itemStyle={{ color: '#00ff41', fontFamily: 'JetBrains Mono', fontSize: '10px' }}
                        labelStyle={{ display: 'none' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="drift" 
                        stroke="#00ff41" 
                        fillOpacity={1} 
                        fill="url(#colorDrift)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Evaluation Log */}
              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg overflow-hidden flex flex-col h-[460px]">
                <div className="p-6 border-b border-[#262626] flex items-center justify-between shrink-0">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4 text-[#00ff41]" />
                    Evaluation Log
                  </h2>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-zinc-500">{history.length} ENTRIES</span>
                    {history.length > 0 && (
                      <button 
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="text-[10px] font-mono text-[#00ff41] hover:underline flex items-center gap-1 uppercase tracking-widest"
                      >
                        <Maximize2 className="w-3 h-3" />
                        Expand
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto font-mono text-[11px]">
                  {history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4">
                      <Search className="w-8 h-8 opacity-20" />
                      <p className="uppercase tracking-widest">No evaluation data available</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#1a1a1a]">
                      {[...history].reverse().map((entry, idx) => (
                        <div key={idx} className="p-4 hover:bg-white/[0.02] transition-colors group">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-zinc-600">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
                              <span className={cn("font-bold px-1.5 py-0.5 rounded text-[9px]", getStatusBg(entry.status), getStatusColor(entry.status))}>
                                {entry.status}
                              </span>
                            </div>
                            <div className="text-zinc-500 group-hover:text-[#00ff41] transition-colors">
                              DRIFT: {entry.drift.toFixed(4)}
                            </div>
                          </div>
                          <p className="text-zinc-400 line-clamp-2 italic">"{entry.text}"</p>
                          <div className="mt-2 flex gap-4 text-[9px] text-zinc-600 uppercase">
                            <span>S: {entry.vector[0]}</span>
                            <span>T: {entry.vector[1]}</span>
                            <span>Q: {entry.vector[2]}</span>
                            <span>E: {entry.vector[3]}</span>
                            <span>Eng: {entry.vector[4]}</span>
                            <span>Sent: {entry.vector[5] || 0.5}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'policy' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Policy Management */}
              <div className="space-y-6">
                <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#00ff41]" />
                    Global Policy Upload
                  </h2>
                  <form onSubmit={handlePolicyUpload} className="space-y-4">
                    <div className="border-2 border-dashed border-[#262626] rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:border-[#00ff41]/30 transition-colors relative">
                      <input 
                        type="file" 
                        accept=".pdf,.txt"
                        onChange={(e) => setPolicyFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="w-6 h-6 text-zinc-600" />
                      <p className="text-[10px] font-mono text-zinc-500 uppercase">
                        {policyFile ? policyFile.name : "Select PDF or Text Policy"}
                      </p>
                    </div>
                    <button 
                      type="submit"
                      disabled={isPolicyUploading || !policyFile}
                      className="w-full bg-[#00ff41] text-black font-mono font-bold py-3 rounded hover:bg-[#00ff41]/90 transition-all disabled:opacity-50 uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                    >
                      {isPolicyUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      Encrypt & Embed Policy
                    </button>
                  </form>
                </section>

                <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#00ff41]" />
                    Policy Alignment Monitor
                  </h2>
                  <div className="space-y-4">
                    <textarea 
                      placeholder="Enter text to evaluate against global policies..."
                      value={policyEvalText}
                      onChange={(e) => setPolicyEvalText(e.target.value)}
                      className="w-full h-24 bg-black border border-[#262626] rounded p-3 font-mono text-xs focus:outline-none focus:border-[#00ff41]/50 resize-none"
                    />
                    <button 
                      onClick={handlePolicyEvaluate}
                      disabled={isPolicyEvaluating || !policyEvalText.trim()}
                      className="w-full bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] font-mono font-bold py-3 rounded hover:bg-[#00ff41]/20 transition-all disabled:opacity-50 uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                    >
                      {isPolicyEvaluating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                      Check Policy Alignment
                    </button>

                    {policyEvalResult && (
                      <div className="mt-4 p-4 bg-black border border-[#262626] rounded animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Alignment Status</span>
                          <span className={cn(
                            "text-[10px] font-mono font-bold px-2 py-0.5 rounded",
                            policyEvalResult.driftFlag ? "bg-[#ff3333]/10 text-[#ff3333]" : "bg-[#00ff41]/10 text-[#00ff41]"
                          )}>
                            {policyEvalResult.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Similarity Score</span>
                          <span className="text-xs font-mono font-bold text-white">{(policyEvalResult.driftScore * 100).toFixed(2)}%</span>
                        </div>
                        {policyEvalResult.matchedClause && (
                          <div className="space-y-1">
                            <p className="text-[9px] font-mono text-zinc-600 uppercase">Closest Policy Clause:</p>
                            <p className="text-[10px] font-mono text-zinc-400 italic bg-zinc-900/50 p-2 rounded border border-[#1a1a1a]">
                              "{policyEvalResult.matchedClause.slice(0, 200)}..."
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Ethics Layer */}
              <div className="space-y-6">
                <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#00ff41]" />
                    Global Ethics Amendment
                  </h2>
                  <div className="space-y-4">
                    <textarea 
                      placeholder="Amendment Request Description..."
                      value={amendmentRequest}
                      onChange={(e) => setAmendmentRequest(e.target.value)}
                      className="w-full h-20 bg-black border border-[#262626] rounded p-3 font-mono text-xs focus:outline-none focus:border-[#00ff41]/50 resize-none"
                    />
                    <input 
                      type="password" 
                      placeholder="VIP Master Secret Key"
                      value={vipKey}
                      onChange={(e) => setVipKey(e.target.value)}
                      className="w-full bg-black border border-[#262626] rounded p-3 font-mono text-xs focus:outline-none focus:border-[#00ff41]/50"
                    />
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-mono text-zinc-500 uppercase">MP Signatures ({Object.keys(signedCountries).length}/{ethicsCountries.length})</p>
                        <button 
                          onClick={signAllCountries}
                          className="text-[9px] font-mono text-[#00ff41] hover:underline uppercase tracking-widest"
                        >
                          Sign All Countries
                        </button>
                      </div>
                      <div className="h-40 overflow-y-auto border border-[#262626] rounded bg-black p-2 custom-scrollbar">
                        <div className="grid grid-cols-2 gap-2">
                          {ethicsCountries.map(country => (
                            <button
                              key={country}
                              onClick={() => toggleCountrySignature(country)}
                              className={cn(
                                "text-[9px] font-mono px-2 py-1 rounded border transition-all text-left flex items-center justify-between",
                                signedCountries[country] 
                                  ? "bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]" 
                                  : "bg-zinc-900 border-zinc-800 text-zinc-600"
                              )}
                            >
                              {country}
                              {signedCountries[country] && <CheckCircle2 className="w-2.5 h-2.5" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleEthicsAmend}
                      disabled={isAmending || !amendmentRequest.trim() || !vipKey.trim()}
                      className="w-full bg-[#ff3333]/10 border border-[#ff3333]/30 text-[#ff3333] font-mono font-bold py-3 rounded hover:bg-[#ff3333]/20 transition-all disabled:opacity-50 uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                    >
                      {isAmending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                      Execute Ethics Amendment
                    </button>

                    {amendmentResult && (
                      <div className="mt-4 p-4 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded animate-in fade-in slide-in-from-top-2">
                        <p className="text-[10px] font-mono text-[#00ff41] uppercase font-bold mb-1">Amendment Approved</p>
                        <p className="text-[9px] font-mono text-zinc-400">ID: {amendmentResult.amendmentId}</p>
                        <p className="text-[9px] font-mono text-zinc-400">Timestamp: {new Date(amendmentResult.timestamp).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'learning' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#00ff41]" />
                  Document Upload
                </h2>
                <div className="border-2 border-dashed border-[#262626] rounded-lg p-10 flex flex-col items-center justify-center gap-4 hover:border-[#00ff41]/30 transition-colors relative">
                  <input 
                    type="file" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <RefreshCw className="w-8 h-8 text-[#00ff41] animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 text-zinc-600" />
                  )}
                  <p className="text-xs font-mono text-zinc-500 uppercase">Drag & Drop or Click to Upload</p>
                </div>
              </section>

              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#00ff41]" />
                  External Source
                </h2>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Source Name (e.g. Documentation)"
                    value={learningName}
                    onChange={(e) => setLearningName(e.target.value)}
                    className="w-full bg-black border border-[#262626] rounded p-3 font-mono text-xs focus:outline-none focus:border-[#00ff41]/50"
                  />
                  <input 
                    type="url" 
                    placeholder="Source URL"
                    value={learningUrl}
                    onChange={(e) => setLearningUrl(e.target.value)}
                    className="w-full bg-black border border-[#262626] rounded p-3 font-mono text-xs focus:outline-none focus:border-[#00ff41]/50"
                  />
                  <button 
                    onClick={handleAddSource}
                    className="w-full bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] font-mono font-bold py-3 rounded hover:bg-[#00ff41]/20 transition-all uppercase text-xs tracking-widest"
                  >
                    Add Source to Library
                  </button>
                </div>
              </section>

              <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6 col-span-full">
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#00ff41]" />
                  Drift Verification Engine
                </h2>
                <div className="space-y-4">
                  <textarea 
                    placeholder="Enter text to check for alignment drift against learned sources..."
                    value={driftText}
                    onChange={(e) => setDriftText(e.target.value)}
                    className="w-full h-24 bg-black border border-[#262626] rounded p-3 font-mono text-xs focus:outline-none focus:border-[#00ff41]/50 resize-none"
                  />
                  <button 
                    onClick={handleCheckDrift}
                    disabled={isCheckingDrift || !driftText.trim()}
                    className="w-full bg-[#00ff41] text-black font-mono font-bold py-3 rounded hover:bg-[#00ff41]/90 transition-all disabled:opacity-50 uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                  >
                    {isCheckingDrift ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                    Verify Alignment Drift
                  </button>

                  {driftResults && (
                    <div className="mt-4 p-4 bg-black border border-[#262626] rounded animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Verification Results</span>
                        <span className={cn(
                          "text-[10px] font-mono font-bold px-2 py-0.5 rounded",
                          driftResults.riskCount > 0 ? "bg-[#ff3333]/10 text-[#ff3333]" : "bg-[#00ff41]/10 text-[#00ff41]"
                        )}>
                          {driftResults.riskCount} RISKS DETECTED
                        </span>
                      </div>
                      
                      {driftResults.risks.length > 0 ? (
                        <div className="space-y-2">
                          {driftResults.risks.map((risk: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-[10px] font-mono border-b border-[#1a1a1a] pb-2 last:border-0">
                              <span className="text-zinc-400">{risk.source}</span>
                              <span className="text-[#ff3333]">DRIFT: {risk.drift.toFixed(4)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] font-mono text-zinc-600 uppercase text-center py-4">No significant drift detected against library</p>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                <Database className="w-4 h-4 text-[#00ff41]" />
                Reference Library
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sources.map((source) => (
                  <div key={source.id} className="bg-black border border-[#262626] p-4 rounded hover:border-[#00ff41]/30 transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-[#00ff41] uppercase tracking-widest">{source.name}</span>
                      <Database className="w-3 h-3 text-zinc-700 group-hover:text-[#00ff41] transition-colors" />
                    </div>
                    <p className="text-[9px] font-mono text-zinc-500 truncate mb-3">{source.sourceURL}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-zinc-700">{new Date(source.timestamp).toLocaleDateString()}</span>
                      <button className="text-[9px] font-mono text-zinc-500 hover:text-white uppercase tracking-widest">Verify</button>
                    </div>
                  </div>
                ))}
                {sources.length === 0 && (
                  <div className="col-span-full py-20 text-center text-zinc-600 font-mono text-xs uppercase tracking-widest">
                    Library is empty. Add sources to begin learning.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'nodes' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                <Network className="w-4 h-4 text-[#00ff41]" />
                Node Registration
              </h2>
              <div className="flex gap-4">
                <input 
                  type="text" 
                  placeholder="Node Identifier (e.g. ALPHA-NODE)"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  className="flex-1 bg-black border border-[#262626] rounded p-3 font-mono text-xs focus:outline-none focus:border-[#00ff41]/50"
                />
                <button 
                  onClick={handleRegisterNode}
                  className="bg-[#00ff41] text-black font-mono font-bold px-8 rounded hover:bg-[#00ff41]/90 transition-all uppercase text-xs tracking-widest"
                >
                  Register
                </button>
              </div>
            </section>

            <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-6">
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                <Network className="w-4 h-4 text-[#00ff41]" />
                Active Trust Graph
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {nodes.map((node) => (
                  <div key={node.id} className="bg-black border border-[#262626] p-4 rounded relative overflow-hidden group">
                    <div className={cn(
                      "absolute top-0 left-0 w-1 h-full",
                      node.integrity ? "bg-[#00ff41]" : "bg-[#ff3333]"
                    )} />
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest">{node.name}</span>
                      {node.integrity ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff41]" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-[#ff3333]" />
                      )}
                    </div>
                    <p className="text-[9px] font-mono text-zinc-500 mb-4">ID: {node.id}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-zinc-700 uppercase">Integrity: {node.integrity ? 'Nominal' : 'Compromised'}</span>
                      <button className="text-[9px] font-mono text-[#00ff41] hover:underline uppercase tracking-widest">Ping</button>
                    </div>
                  </div>
                ))}
                {nodes.length === 0 && (
                  <div className="col-span-full py-20 text-center text-zinc-600 font-mono text-xs uppercase tracking-widest">
                    No nodes registered in the trust graph.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'logs' && (
          <section className="bg-[#0f0f0f] border border-[#262626] rounded-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-[#262626] flex items-center justify-between bg-[#0a0a0a]">
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#00ff41]" />
                System Event Logs
              </h2>
              <button 
                onClick={fetchLogs}
                className="text-[10px] font-mono text-zinc-500 hover:text-[#00ff41] flex items-center gap-2 uppercase tracking-widest"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
            <div className="h-[600px] overflow-y-auto bg-black p-4 font-mono text-[11px] custom-scrollbar">
              <div className="space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-4 py-1 border-b border-[#1a1a1a] last:border-0 hover:bg-white/[0.02] items-center">
                    <span className="text-zinc-600 shrink-0 text-[9px]">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest shrink-0",
                      log.severity === 'HIGH' ? "bg-[#ff3333]/20 text-[#ff3333]" : 
                      log.severity === 'MEDIUM' ? "bg-yellow-500/20 text-yellow-500" : 
                      "bg-zinc-800 text-zinc-500"
                    )}>
                      {log.severity || 'LOW'}
                    </span>
                    <span className={cn(
                      "uppercase tracking-tight",
                      log.severity === 'HIGH' ? "text-[#ff3333]" : "text-zinc-400"
                    )}>{log.event}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="h-full flex items-center justify-center text-zinc-600 uppercase tracking-widest">
                    Log buffer empty
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
        {activeTab === 'workflow' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <DocumentWorkflow />
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="fixed bottom-0 left-0 w-full bg-black border-t border-[#262626] px-6 py-2 flex items-center justify-between z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Engine Online</span>
          </div>
          <div className="h-4 w-[1px] bg-[#262626]" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00ff41]" />
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Cellular Integrity: Nominal</span>
          </div>
          <div className="h-4 w-[1px] bg-[#262626]" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Latency: 12ms</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">© 2026 SWI OS ALIGNMENT CORE</span>
        </div>
      </footer>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl h-full max-h-[800px] bg-[#0f0f0f] border border-[#262626] rounded-xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-[#262626] flex items-center justify-between bg-[#0a0a0a]">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-[#00ff41]" />
                  <h2 className="text-sm font-mono font-bold uppercase tracking-widest">Full Evaluation History</h2>
                </div>
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  {/* Filters */}
                  <div className="mb-6 flex flex-wrap items-center gap-4 p-4 bg-black/40 border border-[#262626] rounded-lg">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-600 uppercase font-mono">Status</label>
                      <select 
                        value={historyFilterStatus}
                        onChange={(e) => setHistoryFilterStatus(e.target.value)}
                        className="bg-black border border-[#262626] text-xs font-mono text-zinc-300 p-2 rounded focus:border-[#00ff41] outline-none"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="GREEN">Green</option>
                        <option value="YELLOW">Yellow</option>
                        <option value="RED">Red</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-600 uppercase font-mono">From Date</label>
                      <input 
                        type="date"
                        value={historyFilterDateRange.start}
                        onChange={(e) => setHistoryFilterDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="bg-black border border-[#262626] text-xs font-mono text-zinc-300 p-2 rounded focus:border-[#00ff41] outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-600 uppercase font-mono">To Date</label>
                      <input 
                        type="date"
                        value={historyFilterDateRange.end}
                        onChange={(e) => setHistoryFilterDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="bg-black border border-[#262626] text-xs font-mono text-zinc-300 p-2 rounded focus:border-[#00ff41] outline-none"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        setHistoryFilterStatus('ALL');
                        setHistoryFilterDateRange({ start: '', end: '' });
                      }}
                      className="mt-auto px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-[#262626] rounded text-[10px] font-mono uppercase transition-colors"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {[...filteredHistory].reverse().map((entry, idx) => (
                      <div key={idx} className="bg-black/40 border border-[#262626] p-6 rounded-lg hover:border-[#00ff41]/30 transition-colors">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-mono text-zinc-500">[{new Date(entry.timestamp).toLocaleString()}]</span>
                            <span className={cn("font-bold px-2 py-1 rounded text-[10px] uppercase tracking-widest", getStatusBg(entry.status), getStatusColor(entry.status))}>
                              {entry.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-xs font-mono">
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-zinc-600 uppercase">Alignment</span>
                              <span className="text-[#00ff41] font-bold">{(entry.alignment * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-zinc-600 uppercase">Drift</span>
                              <span className="text-[#ff3333] font-bold">{entry.drift.toFixed(4)}</span>
                            </div>
                            {entry.sentiment && (
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-zinc-600 uppercase">Sentiment</span>
                                <span className={cn("font-bold", entry.sentiment.score > 0 ? "text-[#00ff41]" : entry.sentiment.score < 0 ? "text-[#ff3333]" : "text-[#ffcc00]")}>
                                  {entry.sentiment.score > 0 ? "+" : ""}{entry.sentiment.score.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="mb-6">
                          <p className="text-[10px] text-zinc-600 uppercase mb-2">Evaluated Content</p>
                          <div className="bg-black border border-[#1a1a1a] p-4 rounded font-mono text-sm text-zinc-300 leading-relaxed italic">
                            "{entry.text}"
                          </div>
                        </div>

                        {entry.reasoning && (
                          <div className="mb-6">
                            <p className="text-[10px] text-zinc-600 uppercase mb-2">Analysis Reasoning</p>
                            <div className="bg-zinc-900/50 border border-[#262626] p-4 rounded text-xs text-zinc-400 leading-relaxed">
                              {entry.reasoning}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <p className="text-[10px] text-zinc-600 uppercase mb-3">Vector Dimensions</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {[
                                { label: 'Safety', val: entry.vector[0] },
                                { label: 'Truth', val: entry.vector[1] },
                                { label: 'Quality', val: entry.vector[2] },
                                { label: 'Ethics', val: entry.vector[3] },
                                { label: 'Engagement', val: entry.vector[4] },
                                { label: 'Sentiment', val: entry.vector[5] || 0.5 }
                              ].map((dim, dIdx) => (
                                <div key={dIdx} className="bg-black/60 border border-[#1a1a1a] p-3 rounded">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] text-zinc-500 uppercase">{dim.label}</span>
                                    <span className="text-[10px] font-bold text-[#00ff41]">{dim.val.toFixed(3)}</span>
                                  </div>
                                  <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${dim.val * 100}%` }}
                                      className="h-full bg-[#00ff41]"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {entry.influentialKeywords && entry.influentialKeywords.length > 0 && (
                            <div>
                              <p className="text-[10px] text-zinc-600 uppercase mb-3">Influential Keywords</p>
                              <div className="flex flex-wrap gap-2">
                                {entry.influentialKeywords.map((kw, kIdx) => (
                                  <span 
                                    key={kIdx} 
                                    className={cn(
                                      "px-2 py-1 rounded text-[9px] font-mono border",
                                      kw.score > 0 
                                        ? "bg-green-500/10 border-green-500/30 text-[#00ff41]" 
                                        : "bg-red-500/10 border-red-500/30 text-[#ff3333]"
                                    )}
                                  >
                                    {kw.word} ({kw.score > 0 ? "+" : ""}{kw.score.toFixed(1)})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              <div className="p-4 border-t border-[#262626] bg-[#0a0a0a] flex justify-between items-center">
                <span className="text-[10px] font-mono text-zinc-600 uppercase">End of Log — {history.length} Total Records</span>
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="px-6 py-2 bg-zinc-900 hover:bg-zinc-800 border border-[#262626] rounded text-[10px] font-mono uppercase tracking-widest transition-colors"
                >
                  Close Monitor
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
