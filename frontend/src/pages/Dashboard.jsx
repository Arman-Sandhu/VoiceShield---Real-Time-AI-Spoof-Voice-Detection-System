import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Recorder from '../components/Recorder';
import Upload from '../components/Upload';
import RiskBadge from '../components/RiskBadge';
import { Activity } from 'lucide-react';

export default function Dashboard() {
  const [mode, setMode] = useState('realtime'); // 'realtime' or 'upload'
  const [result, setResult] = useState(null);

  const getProgressBarColor = (score) => {
    if (score < 30) return 'bg-green-500';
    if (score < 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Analysis Dashboard</h2>
        <Link to="/history" className="text-cyan-400 hover:underline">View History Logs</Link>
      </div>

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => { setMode('realtime'); setResult(null); }}
          className={`flex-1 py-3 font-medium rounded-lg transition-colors border ${
            mode === 'realtime' 
              ? 'bg-cyan-600 border-cyan-500 text-white' 
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Real-Time Mode
        </button>
        <button
          onClick={() => { setMode('upload'); setResult(null); }}
          className={`flex-1 py-3 font-medium rounded-lg transition-colors border ${
            mode === 'upload' 
              ? 'bg-cyan-600 border-cyan-500 text-white' 
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
          }`}
        >
          File Upload Mode
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Input */}
        <div>
          {mode === 'realtime' ? (
            <Recorder onResult={setResult} />
          ) : (
            <Upload onResult={setResult} />
          )}
        </div>

        {/* Right Column: Results */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Activity className="text-cyan-400" />
            Detection Results
          </h3>

          {result ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex-1 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <RiskBadge riskLevel={result.final_risk || 'LOW'} />
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Spoof Probability</span>
                    <span className="font-bold">{result.spoof_score || result.voice_authenticity_score || 0}%</span>
                  </div>
                  <div className="h-4 bg-slate-900 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${result.spoof_score || result.voice_authenticity_score || 0}%` }}
                      className={`h-full ${getProgressBarColor(result.spoof_score || result.voice_authenticity_score || 0)}`}
                    />
                  </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-lg">
                  <p className="text-sm text-slate-400 mb-1">Detected Language</p>
                  <p className="font-medium text-lg uppercase tracking-wide">
                    {result.detected_language || 'Unknown'}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <p>Waiting for audio input...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
