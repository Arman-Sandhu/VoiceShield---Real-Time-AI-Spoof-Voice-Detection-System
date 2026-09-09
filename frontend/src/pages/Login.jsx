import React, { useState } from 'react';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, googleProvider } from '../services/auth';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user);
        setMsg("Verification email sent! Please check your inbox and verify before logging in.");
        await auth.signOut(); // force them to verify first
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (!cred.user.emailVerified) {
          setError("Please verify your email before accessing the dashboard.");
          await auth.signOut();
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto mt-20 bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-700"
    >
      <div className="flex justify-center mb-6 text-cyan-400">
        <ShieldCheck size={48} />
      </div>
      <h2 className="text-2xl font-bold text-center mb-6">Access VoiceShield</h2>
      
      {error && <div className="bg-red-500/20 text-red-300 p-3 rounded mb-4 text-sm">{error}</div>}
      {msg && <div className="bg-green-500/20 text-green-300 p-3 rounded mb-4 text-sm">{msg}</div>}
      
      <form onSubmit={handleEmailAuth} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white outline-none focus:border-cyan-500 transition-colors"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white outline-none focus:border-cyan-500 transition-colors"
            required
          />
        </div>
        <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 rounded transition-colors">
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-cyan-400 hover:underline"
        >
          {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
        </button>
      </div>

      <div className="my-6 border-b border-slate-700 relative">
        <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 px-2 text-sm text-slate-500">OR</span>
      </div>

      <button 
        onClick={handleGoogleLogin}
        className="w-full bg-white text-slate-900 hover:bg-slate-100 font-medium py-2 rounded flex items-center justify-center gap-2 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>
    </motion.div>
  );
}
