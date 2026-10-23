import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';
import { auth, googleProvider } from '../services/auth';
import { ShieldCheck, Mail, Lock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        try {
          await sendEmailVerification(userCred.user);
          setSuccessMsg('Account created successfully! Verification email sent.');
        } catch (mailErr) {
          console.warn('Email verification send notice:', mailErr);
          setSuccessMsg('Account created! You may now sign in.');
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error('Firebase Auth error:', err);
      let userFriendlyMsg = err.message;
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        userFriendlyMsg = 'Invalid email or password credentials. Please verify and try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        userFriendlyMsg = 'An account with this email address already exists. Please sign in instead.';
      } else if (err.code === 'auth/network-request-failed') {
        userFriendlyMsg = 'Network connection issue. Please check your internet connection.';
      }
      setError(userFriendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Auth error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-16 flex flex-col items-center">
      {/* Brand Icon Header */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center mb-8 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00d4ff]/20 to-[#a855f7]/20 border border-[#00d4ff]/40 flex items-center justify-center text-[#00d4ff] shadow-[0_0_30px_rgba(0,212,255,0.3)] mb-4">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
          {isSignUp ? 'Create VoiceShield Account' : 'Welcome to VoiceShield'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          {isSignUp
            ? 'Sign up to analyze caller speech and access secure history records.'
            : 'Authenticate to access the speech authenticity workspace.'}
        </p>
      </motion.div>

      {/* Main Glassmorphic Auth Card */}
      <Card variant="elevated" className="w-full p-8 relative">
        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-[#0f1117] p-1 border border-white/[0.08] mb-6">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              !isSignUp
                ? 'bg-[#00d4ff]/15 text-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              isSignUp
                ? 'bg-[#00d4ff]/15 text-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Alerts */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs mb-5"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs mb-5"
            >
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-slate-500 outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/30 transition-all font-sans"
              />
              <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-slate-500 outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/30 transition-all font-sans"
              />
              <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
            </div>
          </div>

          {isSignUp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-slate-500 outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/30 transition-all font-sans"
                />
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
              </div>
            </motion.div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={loading}
            className="w-full mt-2"
          >
            {isSignUp ? 'Create Free Account' : 'Sign In to Workspace'}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.08]" />
          </div>
          <span className="relative bg-[#161b27] px-3 text-[11px] font-mono text-slate-500 uppercase">
            OR CONTINUE WITH
          </span>
        </div>

        {/* Google OAuth Button */}
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full bg-white text-[#07080f] hover:bg-slate-100 hover:text-black font-semibold border-transparent"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign In with Google
        </Button>
      </Card>
    </div>
  );
}
