import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Users,
  Phone,
  Shield,
  Home,
  Search,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Info,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useChatStore } from '../store/chatStore.js';
import { useCallStore } from '../store/callStore.js';
import { UserAvatar } from './UserAvatar.js';

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/chat', label: 'Messages', icon: MessageSquare },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/calls', label: 'Calls', icon: Phone },
  { to: '/security', label: 'Security', icon: Shield },
  { to: '/about', label: 'About', icon: Info },
];

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const unreadMessages = useChatStore((state) =>
    state.conversations.reduce((total, conversation) => total + conversation.unreadCount, 0)
  );
  const hasIncomingCall = useCallStore((state) => Boolean(state.incomingCall));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  const openNotifications = () => {
    navigate(hasIncomingCall ? '/calls' : '/chat');
  };

  const renderNavBadge = (to: string) => {
    if (to === '/chat' && unreadMessages > 0) {
      return (
        <span className="ml-1.5 min-w-4 h-4 px-1 rounded-full bg-violet-500 text-[9px] leading-4 text-white text-center">
          {unreadMessages > 99 ? '99+' : unreadMessages}
        </span>
      );
    }
    if (to === '/calls' && hasIncomingCall) {
      return <span className="ml-1.5 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" aria-label="Incoming call" />;
    }
    return null;
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-black/80' : 'bg-black/50'
        } backdrop-blur-xl border-b border-white/[0.08]`}
      >
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* LEFT: Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <motion.div
              className="relative w-8 h-8 flex items-center justify-center"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <div className="absolute inset-0 rounded-full border border-violet-500/40 animate-ping opacity-20" />
              <Zap size={18} className="text-violet-400 group-hover:text-violet-300 transition-colors" />
            </motion.div>
            <span className="font-semibold text-base tracking-tight text-white/90 group-hover:text-white transition-colors">
              Pulse<span className="text-violet-400">Chat</span>
            </span>
          </Link>

          {/* CENTER: Navigation links (desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-150 ${
                  isActive(to)
                    ? 'text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                } ${to === '/chat' && unreadMessages > 0 ? 'text-violet-200' : ''} ${to === '/calls' && hasIncomingCall ? 'text-cyan-200' : ''}`}
              >
                <Icon size={14} className={to === '/chat' && unreadMessages > 0 ? 'text-violet-300' : to === '/calls' && hasIncomingCall ? 'text-cyan-300' : ''} />
                {label}
                {renderNavBadge(to)}
                {isActive(to) && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 bg-white/10 rounded-lg border border-white/10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate('/chat')}
                  className="p-2 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
                  title="Search"
                >
                  <Search size={17} />
                </button>
                <button
                  onClick={openNotifications}
                  className={`relative p-2 rounded-lg transition-all ${
                    unreadMessages > 0 || hasIncomingCall
                      ? 'text-violet-300 hover:text-white bg-violet-500/10'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                  title={hasIncomingCall ? 'Open incoming call' : unreadMessages > 0 ? 'Open unread messages' : 'Open messages'}
                  aria-label={hasIncomingCall ? 'Open incoming call' : `Notifications${unreadMessages ? `, ${unreadMessages} unread messages` : ''}`}
                >
                  <Bell size={17} />
                  {(unreadMessages > 0 || hasIncomingCall) && (
                    <span className="absolute top-1 right-1 min-w-2 h-2 rounded-full bg-violet-400 ring-2 ring-black" />
                  )}
                </button>

                {/* Profile Dropdown */}
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg hover:bg-white/5 transition-all"
                  >
                    <UserAvatar
                      username={user?.username}
                      displayName={user?.displayName}
                      photoUrl={user?.profilePhoto}
                      size="xs"
                    />
                    <ChevronDown size={13} className={`text-white/40 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-[#111]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-white/[0.07]">
                          <p className="text-[13px] font-medium text-white/90">{user?.displayName || user?.username}</p>
                          <p className="text-[11px] text-white/40 mt-0.5">@{user?.username}</p>
                        </div>
                        <div className="py-1">
                          {[
                            { label: 'Profile', to: '/profile' },
                            { label: 'Settings', to: '/settings' },
                            { label: 'Security', to: '/security' },
                          ].map(({ label, to }) => (
                            <button
                              key={to}
                              onClick={() => { navigate(to); setDropdownOpen(false); }}
                              className="w-full text-left px-4 py-2 text-[13px] text-white/60 hover:text-white hover:bg-white/5 transition-all"
                            >
                              {label}
                            </button>
                          ))}
                          <div className="border-t border-white/[0.07] my-1" />
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-[13px] text-red-400/80 hover:text-red-400 hover:bg-red-500/5 transition-all flex items-center gap-2"
                          >
                            <LogOut size={13} />
                            Sign out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-3 py-1.5 text-[13px] text-white/60 hover:text-white transition-colors">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 text-[13px] bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors font-medium"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all ml-1"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-white/[0.07] overflow-hidden"
            >
              <nav className="px-4 py-3 flex flex-col gap-1">
                {navLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      isActive(to)
                        ? 'bg-white/10 text-white'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                    {renderNavBadge(to)}
                  </Link>
                ))}
                {isAuthenticated && (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-all mt-1"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      {/* Spacer for fixed navbar */}
      <div className="h-14" />
    </>
  );
};
