import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
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
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading...</div>;
  }

  // Check for email verification if email/password login is used
  const isVerified = user && (user.emailVerified || user.providerData.some(p => p.providerId === 'google.com'));

  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-white font-sans">
        {/* Simple Header for Branding */}
        <header className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">VoiceShield</h1>
            <p className="text-sm text-slate-400">Virtual Identity Spoof Test & Analysis</p>
          </div>
          {user && isVerified && (
            <button 
              onClick={() => auth.signOut()}
              className="text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          )}
        </header>

        <main className="p-6">
          <Routes>
            <Route path="/login" element={(!user || !isVerified) ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={(user && isVerified) ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/history" element={(user && isVerified) ? <History /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
