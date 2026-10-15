import React, { useState } from 'react';
import { Upload, ShieldCheck, FileText, CheckCircle, XCircle, FileSignature } from 'lucide-react';
import { motion } from 'motion/react';

export default function DocumentWorkflow() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowState, setWorkflowState] = useState<any>(null);
  const [isVoting, setIsVoting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setError(null);
    setWorkflowState(null);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await fetch('/api/workflow/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setWorkflowState(data.workflow);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVote = async (vote: 'pass' | 'reject') => {
    if (!workflowState) return;
    
    setIsVoting(true);
    try {
      const response = await fetch('/api/workflow/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: workflowState.id, vote }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Vote failed');
      }

      setWorkflowState(data.workflow);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold uppercase tracking-wider text-[#00ff41] flex items-center gap-2">
          <FileSignature className="w-6 h-6" />
          Document Workflow Gate
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00ff41] to-transparent opacity-50"></div>
          <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-gray-300">
            <Upload className="w-4 h-4 text-[#00ff41]" />
            Upload Document (PDF)
          </h3>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-[#262626] rounded-lg p-8 text-center hover:border-[#00ff41] transition-colors relative group cursor-pointer">
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 text-gray-500 group-hover:text-[#00ff41]" />
                <p className="text-sm text-gray-400 font-mono">
                  {file ? file.name : "Drag & drop or click to upload PDF"}
                </p>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full bg-[#1a1a1a] border border-[#333] hover:border-[#00ff41] hover:text-[#00ff41] text-gray-300 py-3 rounded-lg font-mono text-sm tracking-widest transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#00ff41] border-t-transparent rounded-full animate-spin"></div>
                  PROCESSING...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  SUBMIT TO GATE
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 border border-red-500/50 bg-red-500/10 text-red-500 text-sm font-mono rounded">
                [GATE_ERROR]: {error}
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-6 relative">
          <h3 className="text-sm font-mono font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-gray-300">
            <CheckCircle className="w-4 h-4 text-[#00ff41]" />
            Workflow Status
          </h3>

          {!workflowState ? (
            <div className="h-48 flex items-center justify-center text-gray-500 font-mono text-sm border border-[#1a1a1a] rounded bg-[#050505]">
              AWAITING DOCUMENT
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#111] border border-[#262626] p-4 rounded flex flex-col gap-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">Document</span>
                  <span className="text-sm text-gray-300 truncate" title={workflowState.filename}>{workflowState.filename}</span>
                </div>
                <div className="bg-[#111] border border-[#262626] p-4 rounded flex flex-col gap-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">CEK Score</span>
                  <span className={`text-xl font-bold ${workflowState.score >= 0.5 ? 'text-[#00ff41]' : 'text-red-500'}`}>
                    {workflowState.score.toFixed(3)}
                  </span>
                </div>
              </div>

              <div className="bg-[#111] border border-[#262626] p-4 rounded space-y-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">N-Disagram (Top Bigrams)</span>
                <div className="flex flex-wrap gap-2">
                  {workflowState.ngrams.map((ng: any, idx: number) => (
                    <div key={idx} className="bg-[#1a1a1a] px-2 py-1 rounded text-xs text-gray-400 border border-[#333]">
                      <span className="text-gray-300">{ng.ngram}</span>
                      <span className="ml-2 text-[#00ff41]">{ng.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#111] border border-[#262626] p-4 rounded space-y-2">
                 <span className="text-[10px] text-gray-500 uppercase tracking-widest">Status</span>
                 <div className="flex items-center gap-2">
                    {workflowState.status === 'PENDING_VOTE' && (
                      <span className="text-yellow-500 font-mono text-sm">PENDING VOTE (READY TO SIGN)</span>
                    )}
                    {workflowState.status === 'PASSED' && (
                      <span className="text-[#00ff41] font-mono text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> APPROVED
                      </span>
                    )}
                    {workflowState.status === 'REJECTED' && (
                      <span className="text-red-500 font-mono text-sm flex items-center gap-2">
                        <XCircle className="w-4 h-4" /> REJECTED
                      </span>
                    )}
                 </div>
              </div>

              {workflowState.status === 'PENDING_VOTE' && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <button 
                    onClick={() => handleVote('pass')}
                    disabled={isVoting}
                    className="bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/50 hover:bg-[#00ff41]/20 py-2 rounded font-mono text-xs tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    VOTE TO PASS
                  </button>
                  <button 
                    onClick={() => handleVote('reject')}
                    disabled={isVoting}
                    className="bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20 py-2 rounded font-mono text-xs tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    REJECT
                  </button>
                </div>
              )}

            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
