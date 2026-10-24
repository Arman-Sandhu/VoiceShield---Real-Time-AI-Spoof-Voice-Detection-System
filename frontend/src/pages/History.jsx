import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Trash2,
  ArrowLeft,
  X,
  FileAudio,
  Flag,
  Pencil,
  Check
} from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import RiskBadge from '../components/analysis/RiskBadge';

export default function History({ user, username }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [renamingId, setRenamingId] = useState(null);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/analysis-history');
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRename = (item, e) => {
    if (e) e.stopPropagation();
    setEditingEventId(item.event_id);
    setEditingName(item.file_name || `${item.event_id}.wav`);
  };

  const handleSaveRename = async (eventId, e) => {
    if (e) e.stopPropagation();
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingEventId(null);
      return;
    }

    setRenamingId(eventId);
    // Optimistic state update
    setLogs((prev) =>
      prev.map((item) =>
        item.event_id === eventId ? { ...item, file_name: trimmed } : item
      )
    );
    if (selectedRecord?.event_id === eventId) {
      setSelectedRecord((prev) => (prev ? { ...prev, file_name: trimmed } : null));
    }
    setEditingEventId(null);

    try {
      await api.patch(`/analysis/${eventId}/rename`, { file_name: trimmed });
    } catch (err) {
      console.error('Failed to rename audio record:', err);
      // Revert from server if error
      fetchLogs();
    } finally {
      setRenamingId(null);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleToggleFlag = async (eventId, e) => {
    if (e) e.stopPropagation();

    // Optimistic state update
    setLogs((prev) =>
      prev.map((item) =>
        item.event_id === eventId
          ? { ...item, is_flagged: !item.is_flagged }
          : item
      )
    );

    if (selectedRecord?.event_id === eventId) {
      setSelectedRecord((prev) => ({
        ...prev,
        is_flagged: !prev.is_flagged
      }));
    }

    try {
      await api.patch(`/analysis/${eventId}/flag`);
    } catch (err) {
      console.error('Failed to toggle flag:', err);
      // Revert on failure
      setLogs((prev) =>
        prev.map((item) =>
          item.event_id === eventId
            ? { ...item, is_flagged: !item.is_flagged }
            : item
        )
      );
      if (selectedRecord?.event_id === eventId) {
        setSelectedRecord((prev) => ({
          ...prev,
          is_flagged: !prev.is_flagged
        }));
      }
    }
  };

  const handleDelete = async (eventId, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete analysis record ${eventId}?`)) return;

    setDeletingId(eventId);
    try {
      await api.delete(`/analysis/${eventId}`);
      setLogs((prev) => prev.filter((item) => item.event_id !== eventId));
      if (selectedRecord?.event_id === eventId) {
        setSelectedRecord(null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete record. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const flaggedCount = logs.filter((item) => Boolean(item.is_flagged)).length;

  const filteredLogs = logs.filter((item) => {
    const matchesSearch =
      (item.event_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.file_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.user_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.prediction || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.model_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      riskFilter === 'ALL'
        ? true
        : riskFilter === 'FLAGGED'
        ? Boolean(item.is_flagged)
        : item.final_risk === riskFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <span className="text-xs font-mono text-[#00d4ff] uppercase tracking-wider">
              TELEMETRY ARCHIVE
            </span>
            <h1 className="text-3xl font-display font-bold text-white">
              Analysis History Vault
            </h1>
          </div>
        </div>

        <Link to="/analyze">
          <Button variant="primary" size="md">
            New Voice Analysis
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by file, Event ID or label..."
            className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-xs text-white placeholder-slate-500 outline-none focus:border-[#00d4ff] transition-all font-mono"
          />
          <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', 'FLAGGED', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => {
            const isFlaggedFilter = lvl === 'FLAGGED';
            const isActive = riskFilter === lvl;

            return (
              <button
                key={lvl}
                onClick={() => setRiskFilter(lvl)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                  isActive
                    ? isFlaggedFilter
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                      : 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                    : 'bg-white/5 text-slate-400 border border-white/5 hover:text-white hover:bg-white/10'
                }`}
              >
                {isFlaggedFilter && (
                  <Flag size={12} className={flaggedCount > 0 ? 'text-rose-400 fill-rose-400' : ''} />
                )}
                <span>
                  {isFlaggedFilter ? `FLAGGED (${flaggedCount})` : lvl}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table / Empty State */}
      <Card variant="default" className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-500 font-mono text-sm">
            Retrieving verification logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 mb-3">
              <FileAudio size={24} />
            </div>
            <h4 className="text-base font-semibold text-white">No Matching Records</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mb-4">
              {logs.length === 0
                ? "You haven't conducted any analyses yet."
                : riskFilter === 'FLAGGED'
                ? "No records have been flagged as inaccurate yet. You can click the flag symbol next to any analysis to dispute it."
                : 'No historical records match your search query or filter criteria.'}
            </p>
            {logs.length === 0 && (
              <Link to="/analyze">
                <Button variant="primary" size="sm">
                  Start Analysis
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-xs font-mono text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-5">Event ID</th>
                  <th className="py-4 px-5">Audio File</th>
                  <th className="py-4 px-5">User Email</th>
                  <th className="py-4 px-5">Type</th>
                  <th className="py-4 px-5">Duration</th>
                  <th className="py-4 px-5">Classification</th>
                  <th className="py-4 px-5">Spoof Score</th>
                  <th className="py-4 px-5">Risk Level</th>
                  <th className="py-4 px-5 text-center">Dispute Flag</th>
                  <th className="py-4 px-5">Timestamp</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredLogs.map((item) => {
                  const isFlagged = Boolean(item.is_flagged);

                  return (
                    <tr
                      key={item.event_id || item.id}
                      onClick={() => setSelectedRecord(item)}
                      className={`hover:bg-white/[0.03] transition-colors cursor-pointer group ${
                        isFlagged ? 'bg-rose-500/[0.03]' : ''
                      }`}
                    >
                      <td className="py-4 px-5 font-mono text-[#00d4ff] font-semibold whitespace-nowrap">
                        {item.event_id}
                      </td>

                      <td className="py-4 px-5">
                        {editingEventId === item.event_id ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(item.event_id, e);
                                if (e.key === 'Escape') setEditingEventId(null);
                              }}
                              className="bg-[#161b27] border border-[#00d4ff]/60 rounded-md px-2 py-0.5 text-xs text-white font-mono outline-none focus:ring-1 focus:ring-[#00d4ff] w-36"
                              autoFocus
                              disabled={renamingId === item.event_id}
                            />
                            <button
                              type="button"
                              onClick={(e) => handleSaveRename(item.event_id, e)}
                              disabled={renamingId === item.event_id}
                              className="p-1 rounded bg-[#00d4ff]/20 text-[#00d4ff] hover:bg-[#00d4ff]/30 transition-colors"
                              title="Save file name"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEventId(null);
                              }}
                              disabled={renamingId === item.event_id}
                              className="p-1 rounded bg-white/5 text-slate-400 hover:text-white transition-colors"
                              title="Cancel"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-1.5 text-xs font-mono text-slate-200 group/item min-w-0"
                            title={item.file_name || 'Audio Clip'}
                          >
                            <FileAudio size={14} className="text-[#00f5d4] shrink-0" />
                            <span className="truncate max-w-[130px]">{item.file_name || `${item.event_id}.wav`}</span>
                            <button
                              type="button"
                              onClick={(e) => handleStartRename(item, e)}
                              className="p-1 rounded text-slate-400 hover:text-[#00d4ff] hover:bg-white/10 transition-colors opacity-70 group-hover:opacity-100 shrink-0"
                              title="Rename audio file"
                            >
                              <Pencil size={12} />
                            </button>
                          </div>
                        )}
                      </td>

                      <td
                        className="py-4 px-5 text-slate-300 text-xs font-mono whitespace-nowrap"
                        title={item.user_email || user?.email || 'N/A'}
                      >
                        <span className="truncate max-w-[140px] block">
                          {item.user_email || user?.email || 'N/A'}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-slate-300 capitalize text-xs font-mono whitespace-nowrap">
                        {item.mode || 'Upload'}
                      </td>

                      <td className="py-4 px-5 text-slate-400 text-xs font-mono whitespace-nowrap">
                        {item.duration ? `${item.duration}s` : 'N/A'}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <span
                          className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                            item.prediction === 'AI_GENERATED'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : item.prediction === 'HUMAN_SPEECH'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                          }`}
                        >
                          {item.prediction || 'INCONCLUSIVE'}
                        </span>
                      </td>

                      <td className="py-4 px-5 font-mono font-semibold text-white whitespace-nowrap">
                        {item.fake_score !== undefined
                          ? `${(item.fake_score * 100).toFixed(1)}%`
                          : item.voice_score !== undefined
                          ? `${(item.voice_score * 100).toFixed(1)}%`
                          : '0%'}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <RiskBadge riskLevel={item.final_risk || 'LOW'} size="sm" />
                      </td>

                      {/* Interactive Dispute Flag Button */}
                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => handleToggleFlag(item.event_id, e)}
                          className={`p-1.5 rounded-lg transition-all ${
                            isFlagged
                              ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                              : 'text-slate-600 hover:text-rose-400 hover:bg-white/5 opacity-60 hover:opacity-100'
                          }`}
                          title={
                            isFlagged
                              ? 'Flagged: User marked this analysis as inaccurate'
                              : 'Click to flag if you believe this analysis is incorrect'
                          }
                        >
                          <Flag
                            size={16}
                            className={`transition-transform hover:scale-110 ${
                              isFlagged ? 'fill-rose-500 text-rose-500' : ''
                            }`}
                          />
                        </button>
                      </td>

                      <td className="py-4 px-5 text-xs text-slate-400 font-mono whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => handleDelete(item.event_id, e)}
                          disabled={deletingId === item.event_id}
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-80 group-hover:opacity-100"
                          title="Delete audit record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl bg-[#0f1117] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedRecord(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-[#00d4ff] uppercase">
                  RECORD DETAILS
                </span>
                <span className="text-xs text-slate-500">&bull;</span>
                <span className="text-xs font-mono text-slate-400">{selectedRecord.event_id}</span>
              </div>

              <h3 className="text-2xl font-display font-bold text-white mb-6">
                Verification Telemetry
              </h3>

              <div className="space-y-6">
                <RiskBadge riskLevel={selectedRecord.final_risk || 'LOW'} showDescription={false} />

                {/* Score and Classification */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-[#161b27] border border-white/[0.06]">
                    <span className="text-xs font-mono text-slate-400 block mb-1">PREDICTION</span>
                    <span className="text-lg font-display font-bold text-white">
                      {selectedRecord.prediction || 'UNKNOWN'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#161b27] border border-white/[0.06]">
                    <span className="text-xs font-mono text-slate-400 block mb-1">SYNTHETIC SCORE</span>
                    <span className="text-lg font-display font-bold text-[#00d4ff]">
                      {selectedRecord.fake_score !== undefined
                        ? `${(selectedRecord.fake_score * 100).toFixed(1)}%`
                        : selectedRecord.voice_score !== undefined
                        ? `${(selectedRecord.voice_score * 100).toFixed(1)}%`
                        : '0%'}
                    </span>
                  </div>
                </div>

                {/* Dispute / Flag Status Box in Modal */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#161b27] border border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${
                      selectedRecord.is_flagged
                        ? 'bg-rose-500/20 text-rose-500 border-rose-500/40'
                        : 'bg-white/5 text-slate-400 border-white/10'
                    }`}>
                      <Flag size={18} className={selectedRecord.is_flagged ? 'fill-rose-500' : ''} />
                    </div>
                    <div>
                      <h5 className="text-xs font-mono uppercase tracking-wider text-white">
                        User Dispute Status
                      </h5>
                      <p className="text-xs text-slate-400 font-sans">
                        {selectedRecord.is_flagged
                          ? 'Flagged: User was not satisfied with this AI assessment.'
                          : 'Not flagged. You can dispute this result if you believe it is wrong.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleToggleFlag(selectedRecord.event_id, e)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all ${
                      selectedRecord.is_flagged
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 hover:bg-rose-500/30'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:text-rose-400 hover:border-rose-500/30'
                    }`}
                  >
                    {selectedRecord.is_flagged ? 'Unflag Record' : 'Flag Inaccurate'}
                  </button>
                </div>

                {/* Risk Explanation */}
                {selectedRecord.risk_explanation && (
                  <div className="p-4 rounded-xl bg-[#07080f] border border-white/[0.06] text-xs text-slate-300 leading-relaxed font-sans">
                    <span className="text-slate-400 font-mono uppercase block mb-1">Risk Summary:</span>
                    {selectedRecord.risk_explanation}
                  </div>
                )}

                {/* Technical Meta */}
                <div className="p-4 rounded-2xl bg-[#161b27] border border-white/[0.06] text-xs font-mono text-slate-400 space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Original File Name:</span>
                    {editingEventId === selectedRecord.event_id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(selectedRecord.event_id);
                            if (e.key === 'Escape') setEditingEventId(null);
                          }}
                          className="bg-[#0f1117] border border-[#00d4ff]/60 rounded px-2 py-0.5 text-xs text-white font-mono outline-none focus:ring-1 focus:ring-[#00d4ff] w-48"
                          autoFocus
                          disabled={renamingId === selectedRecord.event_id}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(selectedRecord.event_id)}
                          disabled={renamingId === selectedRecord.event_id}
                          className="p-1 rounded bg-[#00d4ff]/20 text-[#00d4ff] hover:bg-[#00d4ff]/30 transition-colors"
                          title="Save file name"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingEventId(null)}
                          disabled={renamingId === selectedRecord.event_id}
                          className="p-1 rounded bg-white/5 text-slate-400 hover:text-white transition-colors"
                          title="Cancel"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-200 font-semibold truncate max-w-[200px]" title={selectedRecord.file_name}>
                          {selectedRecord.file_name || `${selectedRecord.event_id}.wav`}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(selectedRecord, e)}
                          className="p-1 rounded text-slate-400 hover:text-[#00d4ff] hover:bg-white/10 transition-colors"
                          title="Rename file in history"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span>User Email:</span>
                    <span className="text-slate-200">{selectedRecord.user_email || user?.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Investigator Name:</span>
                    <span className="text-slate-200">{selectedRecord.username || username || user?.displayName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Model Identifier:</span>
                    <span className="text-slate-200">{selectedRecord.model_name || 'Deepfake-V2'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Audio Duration:</span>
                    <span className="text-slate-200">{selectedRecord.duration ? `${selectedRecord.duration}s` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recorded Timestamp:</span>
                    <span className="text-slate-200">
                      {new Date(selectedRecord.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setSelectedRecord(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
