import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { Activity, History, Mic, LogOut, User, Pencil, X, Check, Mail, Key, Shield, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../../services/auth';
import Button from '../ui/Button';
import ShieldMicLogo from '../ui/ShieldMicLogo';
import AccountSettingsModal from './AccountSettingsModal';

export default function Navbar({ user, username, onUpdateUsername }) {
  const location = useLocation();
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenEditModal = () => {
    setEditNameInput(username || user?.displayName || '');
    setSaveError(null);
    setSaveSuccess(false);
    setIsProfileMenuOpen(false);
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

  const displayName = username || user?.displayName || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full bg-[#07080f]/90 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#00d4ff]/20 to-[#a855f7]/20 border border-[#00d4ff]/40 flex items-center justify-center text-[#00d4ff] group-hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all">
            <ShieldMicLogo size={20} className="group-hover:scale-110 transition-transform sm:w-[22px] sm:h-[22px]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-white group-hover:text-[#00d4ff] transition-colors">
                VOICE<span className="text-[#00d4ff]">SHIELD</span>
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-slate-400 font-mono tracking-wider">AI Powered Cyber Defense System</p>
          </div>
        </Link>

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

        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="relative flex items-center justify-center rounded-full p-0.5 border-2 border-[#00d4ff]/50 hover:border-[#00d4ff] focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/40 shadow-[0_0_15px_rgba(0,212,255,0.2)] transition-all cursor-pointer group"
                title={`Account: ${displayName}`}
                aria-label="User Account Menu"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={displayName}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#00d4ff]/30 to-[#a855f7]/40 flex items-center justify-center text-white font-display font-bold text-sm">
                    {initial}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#07080f] rounded-full" />
              </button>
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

      <AccountSettingsModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        user={user}
        onEmailUpdated={(newMail) => {
          if (auth.currentUser) {
            auth.currentUser.reload().catch(() => {});
          }
        }}
      />

      {typeof document !== 'undefined' &&
        user &&
        createPortal(
          <AnimatePresence>
            {isProfileMenuOpen && (
              <div
                className="fixed inset-0 z-[9990] flex items-start justify-end p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsProfileMenuOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-14 sm:mt-16 w-full max-w-sm rounded-2xl bg-[#0f1117] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-5 overflow-hidden"
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#00d4ff] flex items-center gap-1.5">
                      <Shield size={12} /> Account Profile
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                      aria-label="Close Profile Menu"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex items-start gap-3.5 pb-4 border-b border-white/[0.08]">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={displayName}
                        className="w-14 h-14 rounded-full object-cover border-2 border-[#00d4ff]/50 shrink-0 shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#00d4ff]/40 to-[#a855f7]/50 flex items-center justify-center text-white font-display font-bold text-xl border-2 border-[#00d4ff]/50 shrink-0 shadow-[0_0_15px_rgba(0,212,255,0.3)]">
                        {initial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-base font-display font-bold text-white truncate" title={displayName}>
                          {displayName}
                        </h4>
                        <button
                          type="button"
                          onClick={handleOpenEditModal}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#00d4ff] hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                          title="Edit Display Name"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                      <p className="text-xs font-mono text-slate-300 truncate mt-0.5" title={user.email}>
                        {user.email || 'No email attached'}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <Shield size={11} /> Verified Account
                      </span>
                    </div>
                  </div>

                  <div className="py-3 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsAccountModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono text-slate-200 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer group border border-transparent hover:border-white/10"
                    >
                      <Key size={15} className="text-[#00d4ff] group-hover:scale-110 transition-transform" />
                      <span>Account Settings & Change Email</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenEditModal}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono text-slate-200 hover:text-white hover:bg-white/5 transition-all text-left cursor-pointer group border border-transparent hover:border-white/10"
                    >
                      <User size={15} className="text-[#a855f7] group-hover:scale-110 transition-transform" />
                      <span>Edit Display Name</span>
                    </button>
                  </div>

                  <div className="pt-3 border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        localStorage.removeItem('voiceshield_guest_auth');
                        auth.signOut();
                        window.location.reload();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-mono text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer border border-rose-500/20"
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isEditingModalOpen && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-md bg-[#0f1117] border border-white/10 rounded-2xl p-6 shadow-2xl relative"
                >
                  <button
                    type="button"
                    onClick={() => setIsEditingModalOpen(false)}
                    className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>

                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-[#00d4ff] uppercase tracking-wider">
                      USER PROFILE
                    </span>
                  </div>

                  <h3 className="text-xl font-display font-bold text-white mb-1.5">
                    Edit User Name
                  </h3>
                  <p className="text-xs text-slate-400 mb-5">
                    Update your display username. Synchronized across your telemetry audit records.
                  </p>

                  <form onSubmit={handleSaveUsername} className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                        Username
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
                        <span>Username updated successfully!</span>
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
          </AnimatePresence>,
          document.body
        )}

      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#07080f]/95 backdrop-blur-xl border-t border-white/10 px-3 py-2 flex items-center justify-around shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                  isActive
                    ? 'text-[#00d4ff] font-bold scale-105'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#00d4ff]/20 text-[#00d4ff] shadow-[0_0_12px_rgba(0,212,255,0.4)]'
                      : 'bg-white/5'
                  }`}
                >
                  <Icon size={18} />
                </div>
                <span className="text-[10px] font-mono tracking-wider">{link.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              isProfileMenuOpen ? 'text-[#00d4ff] scale-105' : 'text-slate-400 hover:text-white'
            }`}
            title={`Account: ${displayName}`}
            aria-label="User Profile and Account Menu"
          >
            <div
              className={`relative p-0.5 rounded-full border-2 transition-all ${
                isProfileMenuOpen
                  ? 'border-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.5)]'
                  : 'border-[#00d4ff]/50 bg-white/5'
              }`}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={displayName}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#00d4ff]/40 to-[#a855f7]/40 flex items-center justify-center text-white font-display font-bold text-[10px]">
                  {initial}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-[#07080f] rounded-full" />
            </div>
            <span className="text-[10px] font-mono tracking-wider truncate max-w-[64px]">
              Account
            </span>
          </button>
        </nav>
      )}
    </header>
  );
}
