import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Activity, History, Mic, LogOut, User } from 'lucide-react';
import { auth } from '../../services/auth';
import Button from '../ui/Button';

export default function Navbar({ user }) {
  const location = useLocation();

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: Activity },
    { label: 'Analyze Voice', path: '/analyze', icon: Mic },
    { label: 'History', path: '/history', icon: History }
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#07080f]/80 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00d4ff]/20 to-[#a855f7]/20 border border-[#00d4ff]/40 flex items-center justify-center text-[#00d4ff] group-hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all">
            <ShieldCheck size={22} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-xl tracking-tight text-white group-hover:text-[#00d4ff] transition-colors">
                VOICE<span className="text-[#00d4ff]">SHIELD</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-wider">AI Spoof Voice Detection System</p>
          </div>
        </Link>

        {/* Center Nav Links (when authenticated) */}
        {user && (
          <nav className="hidden md:flex items-center gap-1 bg-[#0f1117]/90 p-1.5 rounded-xl border border-white/[0.06]">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#00d4ff]/15 text-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right Action */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161b27] border border-white/10 text-xs text-slate-300 font-mono">
                <User size={14} className="text-[#00d4ff]" />
                <span className="truncate max-w-[140px]">{user.email || 'Authenticated User'}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={LogOut}
                onClick={() => auth.signOut()}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="primary" size="sm">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
