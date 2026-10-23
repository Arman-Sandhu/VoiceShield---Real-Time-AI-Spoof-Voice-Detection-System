import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/auth';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VoiceAnalysis from './pages/VoiceAnalysis';
import History from './pages/History';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#07080f] text-white">
        <div className="w-12 h-12 rounded-2xl border-2 border-transparent border-t-[#00d4ff] border-r-[#a855f7] animate-spin mb-4" />
        <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
          Initializing VoiceShield Core...
        </span>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#07080f] text-slate-100 flex flex-col relative selection:bg-[#00d4ff]/30 selection:text-white ambient-gradient">
        {/* Navigation */}
        <Navbar user={user} />

        {/* Main Content Area */}
        <main className="flex-1 w-full flex flex-col">
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<Landing user={user} />} />

            {/* Authentication */}
            <Route
              path="/login"
              element={!user ? <Login /> : <Navigate to="/dashboard" replace />}
            />

            {/* Protected Workspace Pages */}
            <Route
              path="/dashboard"
              element={user ? <Dashboard user={user} /> : <Navigate to="/login" replace />}
            />

            <Route
              path="/analyze"
              element={user ? <VoiceAnalysis user={user} /> : <Navigate to="/login" replace />}
            />

            <Route
              path="/history"
              element={user ? <History user={user} /> : <Navigate to="/login" replace />}
            />

            {/* Fallback */}
            <Route
              path="*"
              element={<Navigate to={user ? "/dashboard" : "/"} replace />}
            />
          </Routes>
        </main>

        {/* Global Footer */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;
