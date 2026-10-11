import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { GlassPanel } from '../components/GlassPanel.js';
import { AnimatedBackground } from '../components/AnimatedBackground.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await login({ username: identifier, password });
    // Navigate only if no error is set after login attempt
    if (!useAuthStore.getState().error) {
      navigate('/chat');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.97 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.07 + 0.2, duration: 0.4, ease: 'easeOut' },
    }),
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#030303] overflow-hidden">
      <AnimatedBackground />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md px-4"
      >
        <GlassPanel className="w-full rounded-2xl bg-[#121212]/75 backdrop-blur-xl border border-white/10 shadow-2xl p-8">
          {/* Logo */}
          <motion.div
            custom={0}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center mb-8"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-4 shadow-lg shadow-violet-500/10">
              <Zap className="w-7 h-7 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Chat<span className="text-violet-400">Flow</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Simple. Fast. Connected.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-3 text-sm text-red-400"
              >
                {error}
              </motion.div>
            )}

            {/* Username / Email */}
            <motion.div
              custom={1}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="space-y-1.5"
            >
              <label htmlFor="identifier" className="text-xs font-medium text-white/50 uppercase tracking-widest">
                Username or Email
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-200"
              />
            </motion.div>

            {/* Password */}
            <motion.div
              custom={2}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="space-y-1.5"
            >
              <label htmlFor="password" className="text-xs font-medium text-white/50 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors duration-150"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>

            {/* Forgot Password */}
            <motion.div
              custom={3}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="flex justify-end"
            >
              <Link
                to="/forgot-password"
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors duration-150"
              >
                Forgot password?
              </Link>
            </motion.div>

            {/* Submit */}
            <motion.div
              custom={4}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 text-sm transition-all duration-200 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </button>
            </motion.div>

            {/* Register Link */}
            <motion.p
              custom={5}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="text-center text-sm text-white/40"
            >
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-violet-400 hover:text-violet-300 font-medium transition-colors duration-150"
              >
                Create one
              </Link>
            </motion.p>
          </form>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
