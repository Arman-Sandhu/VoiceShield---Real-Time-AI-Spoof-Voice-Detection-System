import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { auth } from './services/auth';
import api from './services/api';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Lazy-loaded routes for optimal initial bundle size and mobile performance
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const VoiceAnalysis = lazy(() => import('./pages/VoiceAnalysis'));
const History = lazy(() => import('./pages/History'));

function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem('voiceshield_username') || '';
    } catch {
      return '';
    }
  });
  const [authReady, setAuthReady] = useState(false);

  const fetchUserProfile = (currentUser) => {
    if (!currentUser) {
      setUser(null);
      setUsername('');
      try {
        localStorage.removeItem('voiceshield_username');
      } catch {}
      return;
    }
    setUser(currentUser);
    const initialName = currentUser.displayName || '';
    if (initialName) {
      setUsername(initialName);
      try {
        localStorage.setItem('voiceshield_username', initialName);
      } catch {}
    }

    // Synchronize custom username from backend in the background without blocking render or reload
    api.get('/user/profile')
      .then((res) => {
        if (res.data?.username && res.data.username.trim()) {
          const customName = res.data.username.trim();
          setUsername(customName);
          try {
            localStorage.setItem('voiceshield_username', customName);
          } catch {}
        }
      })
      .catch((err) => {
        console.warn('Could not fetch user profile from backend:', err);
      });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      fetchUserProfile(currentUser);
      setAuthReady(true);
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
      try {
        localStorage.setItem('voiceshield_username', clean);
      } catch {}
      return clean;
    } catch (err) {
      console.error('Failed to update username:', err);
      throw err;
    }
  };

  return (
    <Router>
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#07080f] text-slate-100 flex flex-col relative selection:bg-[#00d4ff]/30 selection:text-white ambient-gradient">
        {/* Navigation */}
        <Navbar user={user} username={username} onUpdateUsername={handleUpdateUsername} />

        {/* Main Content Area (With responsive bottom spacing for mobile bottom bar) */}
        <main className="flex-1 w-full flex flex-col pb-16 md:pb-0">
          <Suspense
            fallback={
              <div className="flex-1 min-h-[50vh] flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[#00f5d4]/40 border-t-[#00f5d4] rounded-full animate-spin" />
              </div>
            }
          >
            <Routes>
              {/* Public Landing Page - Renders instantly */}
              <Route path="/" element={<Landing user={user} />} />

              {/* Authentication */}
              <Route
                path="/login"
                element={
                  !authReady ? (
                    <div className="flex-1 min-h-[50vh]" />
                  ) : !user ? (
                    <Login onLoginSuccess={(name) => { if (name) setUsername(name); }} />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />

              {/* Protected Workspace Pages */}
              <Route
                path="/dashboard"
                element={
                  !authReady ? (
                    <div className="flex-1 min-h-[50vh]" />
                  ) : user ? (
                    <Dashboard user={user} username={username} />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              <Route
                path="/analyze"
                element={
                  !authReady ? (
                    <div className="flex-1 min-h-[50vh]" />
                  ) : user ? (
                    <VoiceAnalysis user={user} username={username} />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              <Route
                path="/history"
                element={
                  !authReady ? (
                    <div className="flex-1 min-h-[50vh]" />
                  ) : user ? (
                    <History user={user} username={username} />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              {/* Fallback */}
              <Route
                path="*"
                element={
                  !authReady ? (
                    <div className="flex-1 min-h-[50vh]" />
                  ) : (
                    <Navigate to={user ? "/dashboard" : "/"} replace />
                  )
                }
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
