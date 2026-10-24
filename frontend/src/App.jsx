import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { auth } from './services/auth';
import api from './services/api';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VoiceAnalysis from './pages/VoiceAnalysis';
import History from './pages/History';
import TechLoader from './components/ui/TechLoader';

function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (currentUser) => {
    if (!currentUser) {
      setUser(null);
      setUsername('');
      setLoading(false);
      return;
    }
    setUser(currentUser);
    let resolvedName = currentUser.displayName || '';
    try {
      const res = await api.get('/user/profile');
      if (res.data?.username && res.data.username.trim()) {
        resolvedName = res.data.username.trim();
      }
    } catch (err) {
      console.warn('Could not fetch user profile from backend:', err);
    }
    setUsername(resolvedName);
    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      fetchUserProfile(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateUsername = async (newUsername) => {
    const clean = (newUsername || '').trim();
    if (!clean) return;
    try {
      await api.post('/user/username', { username: clean });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: clean });
      }
      setUsername(clean);
      return clean;
    } catch (err) {
      console.error('Failed to update username:', err);
      throw err;
    }
  };

  if (loading) {
    return <TechLoader text="Initializing VoiceShield Core..." />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#07080f] text-slate-100 flex flex-col relative selection:bg-[#00d4ff]/30 selection:text-white ambient-gradient">
        {/* Navigation */}
        <Navbar user={user} username={username} onUpdateUsername={handleUpdateUsername} />

        {/* Main Content Area */}
        <main className="flex-1 w-full flex flex-col">
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<Landing user={user} />} />

            {/* Authentication */}
            <Route
              path="/login"
              element={!user ? <Login onLoginSuccess={(name) => { if (name) setUsername(name); }} /> : <Navigate to="/dashboard" replace />}
            />

            {/* Protected Workspace Pages */}
            <Route
              path="/dashboard"
              element={user ? <Dashboard user={user} username={username} /> : <Navigate to="/login" replace />}
            />

            <Route
              path="/analyze"
              element={user ? <VoiceAnalysis user={user} username={username} /> : <Navigate to="/login" replace />}
            />

            <Route
              path="/history"
              element={user ? <History user={user} username={username} /> : <Navigate to="/login" replace />}
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
