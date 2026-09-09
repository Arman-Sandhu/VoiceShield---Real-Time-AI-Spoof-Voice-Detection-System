import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function History() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/history');
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-3xl font-bold">Analysis History</h2>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading history...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-400 border-b border-slate-700 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Audio ID</th>
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Duration</th>
                  <th className="p-4 font-medium">AI Score</th>
                  <th className="p-4 font-medium">Result</th>
                  <th className="p-4 font-medium">Analyzed</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500">No events logged yet.</td>
                  </tr>
                ) : (
                  logs.map((log, i) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={log.id} 
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="p-4 text-sm text-slate-300 font-mono">
                        {log.event_id}
                      </td>
                      <td className="p-4 text-sm text-slate-400 truncate max-w-[120px]" title={log.user_id}>
                        {log.user_id}
                      </td>
                      <td className="p-4 capitalize text-sm">{log.mode}</td>
                      <td className="p-4 text-sm text-slate-400">{log.duration ? `${log.duration} sec` : 'N/A'}</td>
                      <td className="p-4 font-mono text-cyan-400">
                        {(log.voice_score * 100).toFixed(1)}%
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          log.final_risk === 'LOW' ? 'bg-green-500/20 text-green-400' :
                          log.final_risk === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                          log.final_risk === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {log.final_risk}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-400">
                        {new Date(log.created_at).toLocaleString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute:'2-digit'
                        })}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
