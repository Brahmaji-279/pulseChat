import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, CheckCircle, Zap } from 'lucide-react';
import { AnimatedBackground } from '../components/AnimatedBackground.js';
import { GlassPanel } from '../components/GlassPanel.js';
import { api } from '../services/api.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      // Call the forgot-password endpoint (anti-enumeration: always show success)
      await api.forgotPassword({ email: email.trim().toLowerCase() });
    } catch {
      // Silently ignore network errors — show same success message
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <AnimatedBackground />
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-4">
            <Zap size={22} className="text-violet-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">
            Pulse<span className="text-violet-400">Chat</span>
          </h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassPanel className="p-6">
            {!submitted ? (
              <>
                <h2 className="text-lg font-semibold text-white mb-1">Reset your password</h2>
                <p className="text-sm text-white/40 mb-6">
                  Enter your email address and we'll send you instructions.
                </p>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-white/50 mb-1.5 block">Email address</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <><Loader2 size={15} className="animate-spin" /> Sending...</>
                    ) : (
                      'Send Reset Instructions'
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <CheckCircle size={40} className="mx-auto text-emerald-400 mb-4" />
                <h2 className="text-lg font-semibold text-white mb-2">Check your inbox</h2>
                <p className="text-sm text-white/50">
                  If an account associated with that email exists, we've sent password reset instructions.
                </p>
                <p className="text-xs text-white/30 mt-3">
                  For security, we cannot confirm whether the email is registered.
                </p>
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-white/[0.07] text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                <ArrowLeft size={13} /> Back to login
              </Link>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </div>
  );
}
