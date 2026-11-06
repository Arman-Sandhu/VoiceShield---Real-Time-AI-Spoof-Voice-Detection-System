import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { auth } from './services/auth';
import api from './services/api';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import TechLoader from './components/ui/TechLoader';

// Lazy-loaded routes for optimal initial bundle size and mobile performance
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const VoiceAnalysis = lazy(() => import('./pages/VoiceAnalysis'));
const History = lazy(() => import('./pages/History'));

function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (currentUser) => {
    if (!currentUser) {
      setUser(null);
      setUsername('');
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
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      await fetchUserProfile(currentUser);
      setLoading(false);
    });

    // Native Android Back Button navigation handler
    let backListener = null;
    if (Capacitor.isNativePlatform()) {
      backListener = CapApp.addListener('backButton', ({ canGoBack }) => {
        if (window.location.pathname === '/' || !canGoBack) {
          CapApp.exitApp();
        } else {
          window.history.back();
        }
      });
    }

    return () => {
      unsubscribe();
      if (backListener) {
        backListener.then((h) => h.remove()).catch(() => {});
      }
    };
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
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#07080f] text-slate-100 flex flex-col relative selection:bg-[#00d4ff]/30 selection:text-white ambient-gradient">
        {/* Navigation */}
        <Navbar user={user} username={username} onUpdateUsername={handleUpdateUsername} />

        {/* Main Content Area (With responsive bottom spacing for mobile bottom bar) */}
        <main className="flex-1 w-full flex flex-col pb-16 md:pb-0">
          <Suspense fallback={<TechLoader text="Loading VoiceShield..." />}>
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
          </Suspense>
        </main>

        {/* Global Footer */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;
