import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ShieldCheck, Key, AlertCircle, CheckCircle2, X, ArrowRight, RefreshCw } from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../services/auth';
import api from '../../services/api';
import Button from '../ui/Button';

export default function AccountSettingsModal({ isOpen, onClose, user, onEmailUpdated }) {
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [debugOtp, setDebugOtp] = useState(null);

  if (!isOpen) return null;

  const isGoogleUser = user?.providerData?.some((p) => p.providerId === 'google.com');

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanNewEmail = newEmail.trim().toLowerCase();
    if (!cleanNewEmail || !cleanNewEmail.includes('@') || !cleanNewEmail.includes('.')) {
      setErrorMessage('Please enter a valid new email address.');
      return;
    }

    if (cleanNewEmail === (user?.email || '').toLowerCase()) {
      setErrorMessage('New email cannot be the same as your current email.');
      return;
    }

    setLoading(true);
    try {
      if (isGoogleUser) {
        if (auth.currentUser) {
          await reauthenticateWithPopup(auth.currentUser, googleProvider);
        }
      } else {
        if (!currentPassword) {
          setErrorMessage('Please enter your current password to authorize this change.');
          setLoading(false);
          return;
        }
        if (auth.currentUser && user?.email) {
          const credential = EmailAuthProvider.credential(user.email, currentPassword);
          await reauthenticateWithCredential(auth.currentUser, credential);
        }
      }

      const res = await api.post('/user/email/request-otp', { new_email: cleanNewEmail });
      setSuccessMessage(res.data?.message || 'Verification code sent to your new email.');
      if (res.data?.debug_otp) {
        setDebugOtp(res.data.debug_otp);
      }
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to request email change.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/user/email/verify-otp', {
        new_email: newEmail.trim().toLowerCase(),
        otp: cleanOtp
      });

      setSuccessMessage(res.data?.message || 'Email successfully updated!');
      if (onEmailUpdated) {
        onEmailUpdated(newEmail.trim().toLowerCase());
      }

      setTimeout(() => {
        onClose();
        setStep(1);
        setNewEmail('');
        setCurrentPassword('');
        setOtp('');
        setErrorMessage(null);
        setSuccessMessage(null);
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Verification failed. Please check the code and try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-[#0f1117] border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl relative my-8"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono text-[#00d4ff] uppercase tracking-wider flex items-center gap-1.5">
              <Key size={13} /> ACCOUNT SECURITY & SETTINGS
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-display font-bold text-white mb-1">
            Change Account Email
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Update your primary authentication email across VoiceShield. Protected with password re-authentication and 6-digit OTP verification.
          </p>

          <div className="mb-5 p-3.5 rounded-xl bg-[#161b27] border border-white/5 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Current Email:</span>
            <span className="text-emerald-400 font-semibold">{user?.email || 'N/A'}</span>
          </div>

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                  New Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter your new email address"
                    className="w-full bg-[#161b27] border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-slate-500 outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/30 font-sans"
                    required
                  />
                  <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
                </div>
              </div>

              {!isGoogleUser ? (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                    Current Password (Authorization)
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full bg-[#161b27] border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-slate-500 outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/30 font-sans"
                      required
                    />
                    <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-xs text-[#00d4ff] flex items-center gap-2">
                  <ShieldCheck size={16} className="shrink-0" />
                  <span>Google Account detected: You will be prompted to re-authenticate with Google.</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={loading} icon={ArrowRight}>
                  Send Verification OTP
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
                A 6-digit verification code was sent to <strong className="text-white">{newEmail}</strong>. Please enter it below.
                {debugOtp && (
                  <div className="mt-2 pt-2 border-t border-cyan-500/20 text-[11px] font-mono text-amber-300">
                    Dev Test Code: <span className="font-bold underline">{debugOtp}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full bg-[#161b27] border border-white/10 rounded-xl px-4 py-3 text-center text-2xl font-mono text-white tracking-[0.5em] placeholder-slate-600 outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/30"
                  autoFocus
                  required
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setStep(1); setErrorMessage(null); }}
                  className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  disabled={loading}
                >
                  <RefreshCw size={12} /> Change Email
                </button>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={loading} icon={CheckCircle2}>
                    Verify & Update
                  </Button>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

