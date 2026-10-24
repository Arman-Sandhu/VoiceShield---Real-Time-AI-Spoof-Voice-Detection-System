import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Activity, History, Mic, LogOut, User, Pencil, X, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../../services/auth';
import Button from '../ui/Button';

export default function Navbar({ user, username, onUpdateUsername }) {
  const location = useLocation();
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleOpenEditModal = () => {
    setEditNameInput(username || user?.displayName || '');
    setSaveError(null);
    setSaveSuccess(false);
    setIsEditingModalOpen(true);
  };

  const handleSaveUsername = async (e) => {
    if (e) e.preventDefault();
    const clean = editNameInput.trim();
    if (!clean) {
      setSaveError('Username cannot be empty.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      if (onUpdateUsername) {
        await onUpdateUsername(clean);
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setIsEditingModalOpen(false);
        setSaveSuccess(false);
      }, 700);
    } catch (err) {
      console.error('Failed to update username:', err);
      setSaveError(err.response?.data?.detail || 'Failed to update username. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: Activity },
    { label: 'Analyze Voice', path: '/analyze', icon: Mic },
    { label: 'History', path: '/history', icon: History }
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#07080f]/80 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00d4ff]/20 to-[#a855f7]/20 border border-[#00d4ff]/40 flex items-center justify-center text-[#00d4ff] group-hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all">
            <ShieldCheck size={22} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-xl tracking-tight text-white group-hover:text-[#00d4ff] transition-colors">
                VOICE<span className="text-[#00d4ff]">SHIELD</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-wider">AI Powered Cyber Defense System</p>
          </div>
        </Link>

        {/* Center Nav Links (when authenticated) */}
        {user && (
          <nav className="hidden md:flex items-center gap-1 bg-[#0f1117]/90 p-1.5 rounded-xl border border-white/[0.06]">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#00d4ff]/15 text-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right Action */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* User Email Badge (Always kept in top bar) */}
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161b27] border border-white/10 text-xs text-slate-300 font-mono"
                title={`Signed in as ${user.email || 'Authenticated User'}`}
              >
                <User size={14} className="text-[#00d4ff]" />
                <span className="truncate max-w-[140px]">{user.email || 'Authenticated User'}</span>
              </div>

              {/* Small Edit Button between Email and Sign Out */}
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="p-1.5 rounded-lg bg-[#161b27] border border-white/10 text-slate-400 hover:text-[#00d4ff] hover:border-[#00d4ff]/40 hover:bg-[#00d4ff]/10 transition-all flex items-center justify-center cursor-pointer shadow-sm group"
                title="Edit your display name / username"
              >
                <Pencil size={13} className="group-hover:scale-110 transition-transform" />
              </button>

              {/* Sign Out Button */}
              <Button
                variant="secondary"
                size="sm"
                icon={LogOut}
                onClick={() => auth.signOut()}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="primary" size="sm">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Edit Username Modal */}
      <AnimatePresence>
        {isEditingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#0f1117] border border-white/10 rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-[#00d4ff] uppercase tracking-wider">
                  USER PROFILE
                </span>
              </div>

              <h3 className="text-xl font-display font-bold text-white mb-1.5">
                Edit User Name / User ID
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Update your display username. This will be synchronized into the user profile and all your analysis audit records in Supabase.
              </p>

              <form onSubmit={handleSaveUsername} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                    Username / Investigator Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editNameInput}
                      onChange={(e) => setEditNameInput(e.target.value)}
                      placeholder="e.g. alex_investigator"
                      className="w-full bg-[#161b27] border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-slate-500 outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/30 transition-all font-sans"
                      autoFocus
                      required
                    />
                    <User size={16} className="absolute left-3.5 top-3 text-slate-500" />
                  </div>
                </div>

                {saveError && (
                  <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
                    {saveError}
                  </div>
                )}

                {saveSuccess && (
                  <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 flex items-center gap-1.5">
                    <Check size={14} />
                    <span>Username updated in user table & analysis history!</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingModalOpen(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSaving}
                    icon={Check}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
