import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Mic,
  ShieldAlert,
  Clock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  FileAudio
} from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import RiskBadge from '../components/analysis/RiskBadge';
import ShieldMicLogo from '../components/ui/ShieldMicLogo';

export default function Dashboard({ user, username }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/analysis-history');
      setHistory(res.data || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  // Compute metrics from genuine database data
  const totalAnalyses = history.length;
  const syntheticCount = history.filter(
    (h) => h.prediction === 'AI_GENERATED' || (h.fake_score && h.fake_score >= 0.5)
  ).length;
  const highRiskCount = history.filter(
    (h) => h.final_risk === 'HIGH' || h.final_risk === 'CRITICAL'
  ).length;
  const authenticCount = history.filter(
    (h) => h.prediction === 'HUMAN_SPEECH'
  ).length;

  const displayName = username || user?.displayName || user?.email?.split('@')[0] || 'Investigator';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-10">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#00d4ff] uppercase tracking-wider">
              OPERATIONAL OVERVIEW
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
            Security Intelligence Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Welcome back, <span className="text-white font-medium">{displayName}</span>. Review voice verification logs and threat telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handleRefresh}
            isLoading={refreshing}
            icon={RefreshCw}
            className="h-11 px-4 text-sm font-semibold flex items-center justify-center gap-2"
          >
            Refresh
          </Button>

          <Link to="/analyze">
            <Button
              variant="primary"
              size="md"
              icon={Mic}
              className="h-11 px-5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              Start New Analysis
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase">Total Analyses</span>
            <div className="w-8 h-8 rounded-lg bg-[#00d4ff]/10 text-[#00d4ff] flex items-center justify-center">
              <Activity size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-display font-extrabold text-white">
              {loading ? '...' : totalAnalyses}
            </span>
            <span className="text-xs text-slate-400 block mt-1">Verified audio events</span>
          </div>
        </Card>

        <Card variant="glow-purple">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#a855f7] uppercase">Synthetic Detected</span>
            <div className="w-8 h-8 rounded-lg bg-[#a855f7]/15 text-[#a855f7] flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-display font-extrabold text-white">
              {loading ? '...' : syntheticCount}
            </span>
            <span className="text-xs text-slate-400 block mt-1">AI voice clones identified</span>
          </div>
        </Card>

        <Card variant="default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-rose-400 uppercase">High/Critical Risk</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-display font-extrabold text-white">
              {loading ? '...' : highRiskCount}
            </span>
            <span className="text-xs text-slate-400 block mt-1">High situational pressure alerts</span>
          </div>
        </Card>

        <Card variant="default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-400 uppercase">Authentic Voices</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldMicLogo size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-display font-extrabold text-white">
              {loading ? '...' : authenticCount}
            </span>
            <span className="text-xs text-slate-400 block mt-1">Verified human speech samples</span>
          </div>
        </Card>
      </div>

      {/* Quick Analysis Callout */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-[#00d4ff]/15 via-[#0f1117] to-[#a855f7]/15 border border-white/[0.1] flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <Badge variant="cyan" size="sm" className="mb-2">Near-Real-Time Verification</Badge>
          <h3 className="text-2xl font-display font-bold text-white">
            Analyze Speech Authenticity & Caller Tactics
          </h3>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Record a suspicious incoming call audio segment or upload an existing recording to detect neural voice cloning artifacts and situational extortion markers.
          </p>
        </div>

        <Link to="/analyze">
          <Button variant="primary" size="lg" icon={Mic} className="shrink-0">
            Open Analysis Studio
          </Button>
        </Link>
      </div>

      {/* Recent Analyses Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Clock size={20} className="text-[#00d4ff]" />
            Recent Verification Logs
          </h3>
          <Link to="/history" className="text-xs font-mono text-[#00d4ff] hover:underline flex items-center gap-1">
            <span>View Full History</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm bg-[#0f1117] rounded-2xl border border-white/[0.06]">
            Loading audit history records...
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center bg-[#0f1117] rounded-2xl border border-white/[0.06] flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 mb-3">
              <FileAudio size={24} />
            </div>
            <h4 className="text-base font-semibold text-white">No Analysis Records Yet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mb-5">
              You haven't conducted any voice authenticity checks yet. Click below to analyze your first audio sample.
            </p>
            <Link to="/analyze">
              <Button variant="primary" size="sm" icon={Mic}>
                Analyze First Audio
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0f1117]">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-xs font-mono text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Event ID</th>
                  <th className="py-4 px-6">Audio File</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Classification</th>
                  <th className="py-4 px-6">Spoof Score</th>
                  <th className="py-4 px-6">Risk Level</th>
                  <th className="py-4 px-6">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {history.slice(0, 5).map((item) => (
                  <tr key={item.event_id || item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-mono text-[#00d4ff] font-medium">
                      {item.event_id}
                    </td>
                    <td className="py-4 px-6 text-slate-300 font-mono text-xs truncate max-w-[150px]" title={item.file_name}>
                      {item.file_name || `${item.event_id}.wav`}
                    </td>
                    <td className="py-4 px-6 text-slate-300 capitalize text-xs">
                      {item.mode || 'Upload'}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                          item.prediction === 'AI_GENERATED'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : item.prediction === 'HUMAN_SPEECH'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                        }`}
                      >
                        {item.prediction || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-white">
                      {item.fake_score !== undefined
                        ? `${(item.fake_score * 100).toFixed(1)}%`
                        : item.voice_score !== undefined
                        ? `${(item.voice_score * 100).toFixed(1)}%`
                        : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <RiskBadge riskLevel={item.final_risk || 'LOW'} size="sm" />
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-400 font-mono">
                      {new Date(item.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
