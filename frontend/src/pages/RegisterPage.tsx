import { useState, useMemo, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { GlassPanel } from '../components/GlassPanel.js';
import { AnimatedBackground } from '../components/AnimatedBackground.js';

// ─── Password strength helpers ────────────────────────────────────────────────

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One number', test: (pw) => /[0-9]/.test(pw) },
  { label: 'One special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function calcStrength(password: string): number {
  return PASSWORD_RULES.filter((r) => r.test(password)).length;
}

const STRENGTH_META = [
  { label: '', color: 'bg-white/10' },
  { label: 'Weak', color: 'bg-red-500' },
  { label: 'Fair', color: 'bg-orange-400' },
  { label: 'Good', color: 'bg-yellow-400' },
  { label: 'Strong', color: 'bg-emerald-500' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuthStore();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const strength = useMemo(() => calcStrength(password), [password]);
  const allRulesPassed = strength === PASSWORD_RULES.length;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setClientError(null);

    // Client-side validation
    if (!username.trim()) {
      setClientError('Username is required.');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      setClientError('Username must be 3-20 characters and contain only letters, numbers, or underscores.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setClientError('A valid email address is required.');
      return;
    }
    if (!allRulesPassed) {
      setClientError('Password does not meet the required strength criteria.');
      return;
    }
    if (password !== confirmPassword) {
      setClientError('Passwords do not match.');
      return;
    }

    await register({ username: username.trim(), email: email.trim(), password, displayName: displayName.trim() || undefined });
    if (!useAuthStore.getState().error) {
      navigate('/chat');
    }
  };

  // Animation variants
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
    hidden: { opacity: 0, y: 14 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.06 + 0.15, duration: 0.4, ease: 'easeOut' },
    }),
  };

  const displayError = clientError || error;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#030303] overflow-hidden py-8">
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
            className="flex flex-col items-center mb-7"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-4 shadow-lg shadow-violet-500/10">
              <Zap className="w-7 h-7 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Chat<span className="text-violet-400">Flow</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">Create your account</p>
          </motion.div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Error Banner */}
            {displayError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-3 text-sm text-red-400"
              >
                {displayError}
              </motion.div>
            )}

            {/* Username */}
            <motion.div custom={1} variants={itemVariants} initial="hidden" animate="visible" className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-medium text-white/50 uppercase tracking-widest">
                Username <span className="text-violet-400">*</span>
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_handle"
                className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-200"
              />
            </motion.div>

            {/* Display Name (optional) */}
            <motion.div custom={2} variants={itemVariants} initial="hidden" animate="visible" className="space-y-1.5">
              <label htmlFor="displayName" className="text-xs font-medium text-white/50 uppercase tracking-widest">
                Display Name <span className="text-white/25">(optional)</span>
              </label>
              <input
                id="displayName"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you appear to others"
                className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-200"
              />
            </motion.div>

            {/* Email */}
            <motion.div custom={3} variants={itemVariants} initial="hidden" animate="visible" className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-white/50 uppercase tracking-widest">
                Email <span className="text-violet-400">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-200"
              />
            </motion.div>

            {/* Password */}
            <motion.div custom={4} variants={itemVariants} initial="hidden" animate="visible" className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-white/50 uppercase tracking-widest">
                Password <span className="text-violet-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
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

              {/* Strength bar */}
              {password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-1.5 pt-1"
                >
                  <div className="flex gap-1 h-1.5">
                    {[1, 2, 3, 4].map((seg) => (
                      <div
                        key={seg}
                        className={`flex-1 rounded-full transition-all duration-300 ${
                          strength >= seg ? STRENGTH_META[strength].color : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${strength >= 4 ? 'text-emerald-400' : strength >= 3 ? 'text-yellow-400' : strength >= 2 ? 'text-orange-400' : 'text-red-400'}`}>
                    {strength > 0 ? STRENGTH_META[strength].label : ''}
                  </p>
                </motion.div>
              )}

              {/* Rules checklist */}
              {password.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1 pt-1"
                >
                  {PASSWORD_RULES.map((rule) => {
                    const passed = rule.test(password);
                    return (
                      <li key={rule.label} className="flex items-center gap-2 text-xs">
                        {passed ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-white/25 shrink-0" />
                        )}
                        <span className={passed ? 'text-emerald-400' : 'text-white/35'}>
                          {rule.label}
                        </span>
                      </li>
                    );
                  })}
                </motion.ul>
              )}
            </motion.div>

            {/* Confirm Password */}
            <motion.div custom={5} variants={itemVariants} initial="hidden" animate="visible" className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-medium text-white/50 uppercase tracking-widest">
                Confirm Password <span className="text-violet-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full bg-white/5 border rounded-xl text-white placeholder-white/30 px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-violet-500/50 transition-all duration-200 ${
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? 'border-emerald-500/50 focus:border-emerald-500/50'
                        : 'border-red-500/40 focus:border-red-500/40'
                      : 'border-white/10 focus:border-violet-500/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors duration-150"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p className={`text-xs ${passwordsMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                  {passwordsMatch ? 'Passwords match ✓' : 'Passwords do not match'}
                </p>
              )}
            </motion.div>

            {/* Submit */}
            <motion.div custom={7} variants={itemVariants} initial="hidden" animate="visible">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 text-sm transition-all duration-200 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Create Account
                  </>
                )}
              </button>
            </motion.div>

            {/* Login Link */}
            <motion.p
              custom={8}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="text-center text-sm text-white/40"
            >
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-violet-400 hover:text-violet-300 font-medium transition-colors duration-150"
              >
                Sign in
              </Link>
            </motion.p>
          </form>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
