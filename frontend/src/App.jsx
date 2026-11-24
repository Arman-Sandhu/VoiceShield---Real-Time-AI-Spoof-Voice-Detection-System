import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
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

function RoutePersistence() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname && location.pathname !== '/login' && location.pathname !== '/') {
      localStorage.setItem('voiceshield_last_route', location.pathname);
    }
  }, [location.pathname]);

  return null;
}

function LandingOrRedirect({ user }) {
  if (user) {
    const savedRoute = localStorage.getItem('voiceshield_last_route');
    const targetRoute = savedRoute && ['/analyze', '/dashboard', '/history'].includes(savedRoute)
      ? savedRoute
      : '/dashboard';
    return <Navigate to={targetRoute} replace />;
  }
  return <Landing user={user} />;
}

function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (currentUser) => {
    if (!currentUser) {
      if (localStorage.getItem('voiceshield_guest_auth') === 'true') {
        setUser({ uid: 'guest_local_tester', email: 'guest@voiceshield.local', displayName: 'Local Tester' });
        setUsername('Local Tester');
        setLoading(false);
        return;
      }
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

    let backListener = null;
    let stateListener = null;

    if (Capacitor.isNativePlatform()) {
      backListener = CapApp.addListener('backButton', ({ canGoBack }) => {
        if (window.location.pathname === '/' || window.location.pathname === '/dashboard' || !canGoBack) {
          CapApp.exitApp();
        } else {
          window.history.back();
        }
      });

      stateListener = CapApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          const currentPath = window.location.pathname;
          if (currentPath && currentPath !== '/login') {
            localStorage.setItem('voiceshield_last_route', currentPath);
          }
        }
      });
    }

    return () => {
      unsubscribe();
      if (backListener) {
        backListener.then((h) => h.remove()).catch(() => {});
      }
      if (stateListener) {
        stateListener.then((h) => h.remove()).catch(() => {});
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
      <RoutePersistence />
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#07080f] text-slate-100 flex flex-col relative selection:bg-[#00d4ff]/30 selection:text-white ambient-gradient">
        <Navbar user={user} username={username} onUpdateUsername={handleUpdateUsername} />

        <main className="flex-1 w-full flex flex-col pb-16 md:pb-0">
          <Routes>
            <Route path="/" element={<LandingOrRedirect user={user} />} />

            <Route
              path="/login"
              element={!user ? <Login onLoginSuccess={(name, guestUser) => { if (guestUser) setUser(guestUser); if (name) setUsername(name); }} /> : <Navigate to="/dashboard" replace />}
            />

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

            <Route
              path="*"
              element={<Navigate to={user ? "/dashboard" : "/"} replace />}
            />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
