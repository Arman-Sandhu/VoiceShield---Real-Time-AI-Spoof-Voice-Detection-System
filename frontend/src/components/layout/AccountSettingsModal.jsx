import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  ShieldCheck,
  Key,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../services/auth';
import api from '../../services/api';
import Button from '../ui/Button';

export default function AccountSettingsModal({ isOpen, onClose, user, onEmailUpdated }) {
  const [activeTab, setActiveTab] = useState('password'); // 'password' | 'email'

  // Password / Set Password State
  const [pwStep, setPwStep] = useState(1);
  const [pwOtp, setPwOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(null);

  // Email Change State
  const [emailStep, setEmailStep] = useState(1);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [emailSuccess, setEmailSuccess] = useState(null);

  if (!isOpen) return null;

  const isGoogleUser = Boolean(user?.providerData?.some((p) => p.providerId === 'google.com'));
  const hasPassword = Boolean(user?.providerData?.some((p) => p.providerId === 'password'));

  // --- Password Handlers ---
  const handleRequestPasswordOtp = async (e) => {
    if (e) e.preventDefault();
    setPwError(null);
    setPwSuccess(null);
    setPwLoading(true);

    try {
      const res = await api.post('/user/password/request-otp');
      setPwSuccess(res.data?.message || 'Verification code sent to your registered email.');
      setPwStep(2);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to request verification code.';
      setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  };

  const handleVerifyPasswordAndUpdate = async (e) => {
    if (e) e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    const cleanOtp = pwOtp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setPwError('Please enter the full 6-digit verification code.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPwError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match. Please verify both fields.');
      return;
    }

    setPwLoading(true);
    try {
      const res = await api.post('/user/password/verify-and-update', {
        otp: cleanOtp,
        new_password: newPassword
      });

      setPwSuccess(res.data?.message || 'Password successfully updated!');
      setTimeout(() => {
        onClose();
        setPwStep(1);
        setPwOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setPwError(null);
        setPwSuccess(null);
      }, 1800);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to set password. Please check the code and try again.';
      setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  };

  // --- Email Handlers ---
  const handleRequestEmailOtp = async (e) => {
    if (e) e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    const cleanNewEmail = newEmail.trim().toLowerCase();
    if (!cleanNewEmail || !cleanNewEmail.includes('@') || !cleanNewEmail.includes('.')) {
      setEmailError('Please enter a valid new email address.');
      return;
    }

    if (cleanNewEmail === (user?.email || '').toLowerCase()) {
      setEmailError('New email cannot be the same as your current email.');
      return;
    }

    setEmailLoading(true);
    try {
      if (isGoogleUser) {
        if (auth.currentUser) {
          await reauthenticateWithPopup(auth.currentUser, googleProvider);
        }
      } else {
        if (!currentPassword) {
          setEmailError('Please enter your current password to authorize this change.');
          setEmailLoading(false);
          return;
        }
        if (auth.currentUser && user?.email) {
          const credential = EmailAuthProvider.credential(user.email, currentPassword);
          await reauthenticateWithCredential(auth.currentUser, credential);
        }
      }

      const res = await api.post('/user/email/request-otp', { new_email: cleanNewEmail });
      setEmailSuccess(res.data?.message || 'Verification code sent to your new email.');
      setEmailStep(2);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to request email change.';
      setEmailError(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e) => {
    if (e) e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    const cleanOtp = emailOtp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setEmailError('Please enter the complete 6-digit verification code.');
      return;
    }

    setEmailLoading(true);
    try {
      const res = await api.post('/user/email/verify-otp', {
        new_email: newEmail.trim().toLowerCase(),
        otp: cleanOtp
      });

      setEmailSuccess(res.data?.message || 'Email successfully updated!');
      if (onEmailUpdated) {
        onEmailUpdated(newEmail.trim().toLowerCase());
      }

      setTimeout(() => {
        onClose();
        setEmailStep(1);
        setNewEmail('');
        setCurrentPassword('');
        setEmailOtp('');
        setEmailError(null);
        setEmailSuccess(null);
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Verification failed. Please check the code and try again.';
      setEmailError(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-[#0f1117] border border-white/15 rounded-2xl p-4 sm:p-5 shadow-2xl relative my-auto max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Header & Close Button */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
            <span className="text-[11px] font-mono text-[#00d4ff] uppercase tracking-wider flex items-center gap-1.5">
              <Key size={13} /> ACCOUNT SECURITY & CREDENTIALS
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 my-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setPwError(null);
                setPwSuccess(null);
              }}
              className={`flex items-center gap-1.5 pb-2 px-3 text-[11px] sm:text-xs font-mono tracking-wider transition-colors border-b-2 cursor-pointer ${
                activeTab === 'password'
                  ? 'border-[#00d4ff] text-[#00d4ff] font-bold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Lock size={13} />
              {hasPassword ? 'CHANGE PASSWORD' : 'SET PASSWORD'}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('email');
                setEmailError(null);
                setEmailSuccess(null);
              }}
              className={`flex items-center gap-1.5 pb-2 px-3 text-[11px] sm:text-xs font-mono tracking-wider transition-colors border-b-2 cursor-pointer ${
                activeTab === 'email'
                  ? 'border-[#00d4ff] text-[#00d4ff] font-bold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Mail size={13} />
              UPDATE EMAIL
            </button>
          </div>

          {/* Scrollable Body Content */}
          <div className="overflow-y-auto pr-0.5 space-y-3.5 flex-1">
            {/* TAB 1: PASSWORD (SET OR CHANGE) */}
            {activeTab === 'password' && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg sm:text-xl font-display font-bold text-white">
                      {hasPassword ? 'Change Password' : 'Set Account Password'}
                    </h3>
                    {!hasPassword && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Sparkles size={10} /> Google Sign-In
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {hasPassword
                      ? 'Update your password using 6-digit OTP verification sent to your email.'
                      : 'Create a password to enable direct email & password sign-in while preserving your Google Sign-In.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#161b27] border border-white/5 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Account Email:</span>
                  <span className="text-emerald-400 font-semibold truncate max-w-[200px]" title={user?.email}>
                    {user?.email || 'N/A'}
                  </span>
                </div>

                {pwStep === 1 ? (
                  <div className="space-y-3.5 pt-1">
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-start gap-2.5">
                      <ShieldCheck size={17} className="shrink-0 mt-0.5 text-[#00d4ff]" />
                      <div className="space-y-0.5">
                        <div className="font-semibold text-white">Identity Verification</div>
                        <div className="text-slate-300 text-[11px] leading-relaxed">
                          A 6-digit one-time password (OTP) will be dispatched to{' '}
                          <strong className="text-white">{user?.email}</strong> to verify this account before setting a password.
                        </div>
                      </div>
                    </div>

                    {pwError && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{pwError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pwLoading}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        isLoading={pwLoading}
                        icon={ArrowRight}
                        onClick={handleRequestPasswordOtp}
                      >
                        Send Verification OTP
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleVerifyPasswordAndUpdate} className="space-y-3 pt-1">
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 leading-relaxed">
                      A 6-digit verification OTP was sent to <strong className="text-white">{user?.email}</strong>. Please enter the code below to authorize your new password.
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1 uppercase tracking-wider">
                        6-Digit Verification OTP
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={pwOtp}
                        onChange={(e) => setPwOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full bg-[#161b27] border border-white/10 rounded-xl px-4 py-2 text-center text-xl font-mono text-white tracking-[0.4em] placeholder-slate-600 outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/30"
                        autoFocus
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1 uppercase tracking-wider">
                        New Password (Min. 6 characters)
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPw ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full bg-[#161b27] border border-white/10 rounded-xl px-3.5 py-2 pl-9 pr-9 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/30 font-sans"
                          required
                          minLength={6}
                        />
                        <Lock size={15} className="absolute left-3 top-2.5 text-slate-500" />
                        <button
                          type="button"
                          onClick={() => setShowNewPw((prev) => !prev)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1 uppercase tracking-wider">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPw ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full bg-[#161b27] border border-white/10 rounded-xl px-3.5 py-2 pl-9 pr-9 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/30 font-sans"
                          required
                          minLength={6}
                        />
                        <Lock size={15} className="absolute left-3 top-2.5 text-slate-500" />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPw((prev) => !prev)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {pwError && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{pwError}</span>
                      </div>
                    )}

                    {pwSuccess && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 size={14} className="shrink-0" />
                        <span>{pwSuccess}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPwStep(1);
                          setPwError(null);
                        }}
                        className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                        disabled={pwLoading}
                      >
                        <RefreshCw size={11} /> Resend OTP
                      </button>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pwLoading}>
                          Cancel
                        </Button>
                        <Button type="submit" variant="primary" size="sm" isLoading={pwLoading} icon={CheckCircle2}>
                          {hasPassword ? 'Update Password' : 'Set Password'}
                        </Button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: CHANGE EMAIL */}
            {activeTab === 'email' && (
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-display font-bold text-white mb-0.5">
                    Update Account Email
                  </h3>
                  <p className="text-xs text-slate-400">
                    Change your primary email address. Requires authorization and 6-digit OTP verification.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#161b27] border border-white/5 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Current Email:</span>
                  <span className="text-emerald-400 font-semibold truncate max-w-[200px]" title={user?.email}>
                    {user?.email || 'N/A'}
                  </span>
                </div>

                {emailStep === 1 ? (
                  <form onSubmit={handleRequestEmailOtp} className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1 uppercase tracking-wider">
                        New Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="Enter your new email address"
                          className="w-full bg-[#161b27] border border-white/10 rounded-xl px-3.5 py-2 pl-9 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/30 font-sans"
                          required
                        />
                        <Mail size={15} className="absolute left-3 top-2.5 text-slate-500" />
                      </div>
                    </div>

                    {!isGoogleUser ? (
                      <div>
                        <label className="block text-[11px] font-mono text-slate-400 mb-1 uppercase tracking-wider">
                          Current Password (Authorization)
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            className="w-full bg-[#161b27] border border-white/10 rounded-xl px-3.5 py-2 pl-9 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/30 font-sans"
                            required
                          />
                          <Lock size={15} className="absolute left-3 top-2.5 text-slate-500" />
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[11px] text-[#00d4ff] flex items-center gap-2">
                        <ShieldCheck size={15} className="shrink-0" />
                        <span>Google Account: You will be prompted to verify via Google popup.</span>
                      </div>
                    )}

                    {emailError && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{emailError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={emailLoading}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" size="sm" isLoading={emailLoading} icon={ArrowRight}>
                        Send Verification OTP
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyEmailOtp} className="space-y-3 pt-1">
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 leading-relaxed">
                      A 6-digit verification code was sent to <strong className="text-white">{newEmail}</strong>. Please enter it below.
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1 uppercase tracking-wider">
                        6-Digit Verification Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full bg-[#161b27] border border-white/10 rounded-xl px-4 py-2.5 text-center text-xl font-mono text-white tracking-[0.4em] placeholder-slate-600 outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/30"
                        autoFocus
                        required
                      />
                    </div>

                    {emailError && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{emailError}</span>
                      </div>
                    )}

                    {emailSuccess && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 size={14} className="shrink-0" />
                        <span>{emailSuccess}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailStep(1);
                          setEmailError(null);
                        }}
                        className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                        disabled={emailLoading}
                      >
                        <RefreshCw size={11} /> Change Email
                      </button>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={emailLoading}>
                          Cancel
                        </Button>
                        <Button type="submit" variant="primary" size="sm" isLoading={emailLoading} icon={CheckCircle2}>
                          Verify & Update
                        </Button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
