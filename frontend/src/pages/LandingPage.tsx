import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  Phone,
  Video,
  User,
} from 'lucide-react';
import { AnimatedBackground } from '../components/AnimatedBackground.js';
import { GlassPanel } from '../components/GlassPanel.js';

// ─── Animation Variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut', delay },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (delay = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut', delay },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

// ─── Feature Card Data ─────────────────────────────────────────────────────────

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  accentColor: string;
}

const features: FeatureCard[] = [
  {
    icon: <Lock size={26} />,
    title: 'Private Messaging',
    description: 'Keep up with conversations and share messages with your contacts.',
    badge: 'One-to-one chats',
    accentColor: 'cyan',
  },
  {
    icon: <Phone size={26} />,
    title: 'VoicePulse Calls',
    description: 'Talk to your contacts with voice calls.',
    badge: 'Voice calls',
    accentColor: 'cyan',
  },
  {
    icon: <Video size={26} />,
    title: 'VisualPulse Calls',
    description: 'See your contacts face to face with video calls.',
    badge: 'Video calls',
    accentColor: 'violet',
  },
  {
    icon: <User size={26} />,
    title: 'Personal Profiles',
    description: 'Make your profile your own and find people you know.',
    badge: 'Your account',
    accentColor: 'cyan',
  },
];

// ─── Animated Users Visual ─────────────────────────────────────────────────────

const AnimatedUsersVisual: React.FC = () => (
  <div className="relative flex items-center justify-center gap-8 my-10 select-none">
    {/* User A */}
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut', delay: 0.3 }}
    >
      <div className="w-16 h-16 rounded-full bg-violet-600/20 border border-violet-500/40 flex items-center justify-center shadow-lg shadow-violet-900/30">
        <User size={30} className="text-violet-400" />
      </div>
      <span className="text-xs text-[#F5F5F5]/50 font-mono tracking-widest uppercase">Alice</span>
    </motion.div>

    {/* Encrypted line */}
    <div className="relative flex-1 flex items-center" style={{ minWidth: 120, maxWidth: 220 }}>
      {/* Static line */}
      <div className="absolute inset-0 flex items-center">
        <div className="w-full h-px bg-gradient-to-r from-violet-500/30 via-cyan-400/40 to-violet-500/30" />
      </div>

      {/* Animated packet A→B */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_3px_rgba(34,211,238,0.5)]"
        animate={{ x: ['0%', '100%', '0%'] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatType: 'loop' }}
        style={{ left: 0 }}
      />

      {/* Lock icon in center */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#030303] border border-cyan-500/30 rounded-full p-1.5"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Lock size={14} className="text-cyan-400" />
      </motion.div>
    </div>

    {/* User B */}
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut', delay: 0.3 }}
    >
      <div className="w-16 h-16 rounded-full bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-900/30">
        <User size={30} className="text-cyan-400" />
      </div>
      <span className="text-xs text-[#F5F5F5]/50 font-mono tracking-widest uppercase">Bob</span>
    </motion.div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const featuresRef = useRef<HTMLDivElement>(null);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="relative min-h-screen bg-[#030303] text-[#F5F5F5] overflow-x-hidden font-sans">
      {/* Animated background canvas */}
      <AnimatedBackground />

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4
                   border-b border-white/[0.06] backdrop-blur-md bg-[#030303]/70"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2">
          <Shield size={22} className="text-violet-400" />
          <span className="text-lg font-bold tracking-tight text-[#F5F5F5]">
            Pulse<span className="text-violet-400">Chat</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-[#F5F5F5]/70 hover:text-[#F5F5F5] transition-colors px-3 py-1.5"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-1.5 rounded-lg
                       transition-all duration-200 shadow-md shadow-violet-900/40"
          >
            Get Started
          </button>
        </div>
      </motion.nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center text-center pt-36 pb-24 px-6">
        {/* Status badge */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          custom={0.1}
          className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                     border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-mono tracking-widest"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          PULSECHAT MESSAGING
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.2}
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight max-w-3xl
                     bg-gradient-to-br from-[#F5F5F5] via-violet-200 to-cyan-300 bg-clip-text text-transparent"
        >
          Your Conversations.<br />Your Future.<br />Your Privacy.
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.35}
          className="mt-6 max-w-xl text-base sm:text-lg text-[#F5F5F5]/60 leading-relaxed"
        >
          PulseChat brings messaging and calls together so you can stay in touch with your contacts.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.45}
          className="mt-10 flex flex-col sm:flex-row gap-4 items-center"
        >
          <button
            onClick={() => navigate('/register')}
            className="relative group px-8 py-3.5 rounded-xl text-sm font-semibold text-white
                       bg-gradient-to-r from-violet-600 to-violet-500
                       hover:from-violet-500 hover:to-violet-400
                       shadow-xl shadow-violet-900/40 transition-all duration-300 w-full sm:w-auto"
          >
            <span className="relative z-10">Start Secure Chat</span>
            <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100
                             bg-gradient-to-r from-violet-400/20 to-cyan-400/10 transition-opacity duration-300" />
          </button>

          <button
            onClick={scrollToFeatures}
            className="px-8 py-3.5 rounded-xl text-sm font-semibold text-[#F5F5F5]/80
                       border border-white/10 hover:border-cyan-400/40 hover:text-cyan-300
                       bg-white/5 hover:bg-cyan-400/5 transition-all duration-300 w-full sm:w-auto"
          >
            Explore Features
          </button>
        </motion.div>

        {/* Animated users visual */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          custom={0.6}
          className="mt-12 w-full max-w-sm"
        >
          <AnimatedUsersVisual />
          <p className="text-xs text-[#F5F5F5]/30 font-mono tracking-widest uppercase mt-2">
            Messages and calls with your contacts
          </p>
        </motion.div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section ref={featuresRef} className="relative z-10 px-6 pb-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          custom={0}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]">
            Built for{' '}
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Real Connection
            </span>
          </h2>
          <p className="mt-3 text-sm text-[#F5F5F5]/50 max-w-lg mx-auto">
            Everything you need to stay in touch with the people who matter.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-w-7xl mx-auto"
        >
          {features.map((feat, idx) => (
            <motion.div key={idx} variants={cardVariant}>
              <GlassPanel className="h-full flex flex-col gap-3 p-5 hover:border-violet-500/30 transition-colors duration-300 group">
                {/* Icon */}
                <div
                  className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0
                    ${feat.accentColor === 'violet'
                      ? 'bg-violet-500/15 text-violet-400 group-hover:bg-violet-500/25'
                      : 'bg-cyan-500/15 text-cyan-400 group-hover:bg-cyan-500/25'}
                    transition-colors duration-300`}
                >
                  {feat.icon}
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-[#F5F5F5] leading-snug">{feat.title}</h3>

                {/* Badge */}
                {feat.badge && (
                  <span
                    className={`self-start text-[10px] font-mono px-2 py-0.5 rounded-full border tracking-wide
                      ${feat.accentColor === 'violet'
                        ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
                        : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'}`}
                  >
                    {feat.badge}
                  </span>
                )}

                {/* Description */}
                <p className="text-xs text-[#F5F5F5]/55 leading-relaxed flex-1">{feat.description}</p>
              </GlassPanel>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-28">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0}
        >
          <GlassPanel className="max-w-3xl mx-auto p-10 text-center border-violet-500/20
                                  bg-gradient-to-br from-violet-600/10 to-cyan-600/10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] mb-3">
              Ready to take control of your privacy?
            </h2>
            <p className="text-sm text-[#F5F5F5]/55 mb-8 max-w-md mx-auto">
              Create a free account and start chatting with your contacts in under a minute.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-white
                         bg-gradient-to-r from-violet-600 to-cyan-600
                         hover:from-violet-500 hover:to-cyan-500
                         shadow-xl shadow-violet-900/40 transition-all duration-300"
            >
              <Shield size={16} />
              Start Secure Chat — It's Free
            </button>
          </GlassPanel>
        </motion.div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-violet-400" />
            <span className="text-sm text-[#F5F5F5]/60 font-medium">
              PulseChat
            </span>
          </div>
          <div className="flex items-center gap-5 text-xs text-[#F5F5F5]/35 font-mono">
            <span>Messages · Voice · Video</span>
          </div>
          <p className="text-xs text-[#F5F5F5]/25">
            © {new Date().getFullYear()} PulseChat. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
