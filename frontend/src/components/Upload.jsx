import React, { useState } from 'react';
import api from '../services/api';
import { UploadCloud, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Upload({ onResult }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_caller_unknown', 'false');
    formData.append('is_sensitive_request', 'false');
    formData.append('urgency_flag', 'false');

    try {
      const res = await api.post('/analyze-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onResult(res.data);
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-800 rounded-xl border border-slate-700">
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-600 rounded-lg p-8 hover:bg-slate-800/50 transition-colors">
        <UploadCloud size={48} className="text-slate-400 mb-4" />
        <p className="text-slate-300 font-medium mb-2">Upload Audio File</p>
        <p className="text-slate-500 text-sm mb-4">WAV, MP3, M4A up to 10MB</p>
        
        <input 
          type="file" 
          accept="audio/*" 
          onChange={handleFileChange} 
          className="hidden" 
          id="file-upload" 
        />
        <label 
          htmlFor="file-upload"
          className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-medium transition-colors"
        >
          Browse Files
        </label>
      </div>

      {file && (
        <div className="mt-4 flex items-center justify-between bg-slate-900 p-3 rounded">
          <span className="text-sm text-slate-300 truncate">{file.name}</span>
          <button 
            onClick={handleUpload} 
            disabled={loading}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Analyze"}
          </button>
        </div>
      )}

      {error && <div className="mt-4 text-red-400 text-sm">{error}</div>}
    </div>
  );
}
