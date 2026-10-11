import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Shield, Video, Zap } from 'lucide-react';
import { GlassPanel } from '../components/GlassPanel.js';
import { AnimatedBackground } from '../components/AnimatedBackground.js';

const features = [
  {
    name: 'VoicePulse',
    description: 'Make voice calls and catch up with your contacts.',
    icon: Phone,
    color: 'text-violet-400',
  },
  {
    name: 'VisualPulse',
    description: 'Connect face to face with video calls.',
    icon: Video,
    color: 'text-cyan-400',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-5">
            <Zap size={28} className="text-violet-400" />
          </div>
          <h1 className="text-3xl font-semibold text-white mb-3">
            About <span className="text-violet-400">PulseChat</span>
          </h1>
          <p className="text-white/50 text-base max-w-xl mx-auto">
            A place to message, call, and stay connected with the people who matter.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassPanel className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Shield size={18} className="text-violet-400" /> Our Mission
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              PulseChat helps people connect quickly, communicate clearly, and manage conversations
              in one place.
            </p>
          </GlassPanel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">Stay Connected</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map(({ name, description, icon: Icon, color }) => (
              <GlassPanel key={name} className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Icon size={20} className={color} />
                  <h3 className="text-sm font-semibold text-white">{name}</h3>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">{description}</p>
              </GlassPanel>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassPanel className="p-5 mt-6 text-center" variant="subtle">
            <p className="text-sm text-white/50">PulseChat · Made for staying in touch</p>
          </GlassPanel>
        </motion.div>
      </div>
    </div>
  );
}
