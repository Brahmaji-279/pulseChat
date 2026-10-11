import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, RefreshCw, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useCryptoStore } from '../store/cryptoStore.js';
import { GlassPanel } from '../components/GlassPanel.js';
import { AnimatedBackground } from '../components/AnimatedBackground.js';
import { toast } from '../components/ToastNotifications.js';

export default function SecurityPage() {
  const { user } = useAuthStore();
  const { keys, rotateKeys, keyAlerts, dismissKeyAlert } = useCryptoStore();
  const [rotating, setRotating] = useState(false);

  const handleRotateKeys = async () => {
    if (!user) return;
    setRotating(true);
    try {
      await rotateKeys(user.id, user.username);
      toast.success('Account security settings refreshed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not refresh account security settings.');
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#030303] text-white overflow-auto">
      <AnimatedBackground />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Shield className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Security</h1>
            <p className="text-white/50 text-sm mt-0.5">Account security and sign-in settings</p>
          </div>
        </motion.div>

        <div className="space-y-5">
          <GlassPanel className="p-6">
            <div className="flex items-center gap-3">
              {keys ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
              <div>
                <h2 className="text-sm font-semibold text-white">Account protection</h2>
                <p className="text-xs text-white/45 mt-1">
                  {keys ? 'This device is ready to send messages.' : 'Account protection is being prepared on this device.'}
                </p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Refresh account protection</h2>
            <p className="text-xs text-white/45 leading-relaxed">
              Refreshing account protection may require your contacts to reconnect with you.
            </p>
            <button
              onClick={handleRotateKeys}
              disabled={rotating || !user}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${rotating ? 'animate-spin' : ''}`} />
              {rotating ? 'Refreshing…' : 'Refresh'}
            </button>
          </GlassPanel>

          {keyAlerts.length > 0 && (
            <GlassPanel className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-semibold text-white">Account alerts</h2>
              </div>
              <div className="space-y-3">
                {keyAlerts.map((alert) => (
                  <div
                    key={`${alert.username}-${alert.timestamp}`}
                    className="flex items-start justify-between gap-4 p-4 rounded-lg bg-amber-500/8 border border-amber-500/20"
                  >
                    <div>
                      <p className="text-sm font-semibold text-amber-200">@{alert.username}</p>
                      <p className="text-xs text-white/50 mt-1">
                        Account security settings changed. Confirm this change with the contact if you did not expect it.
                      </p>
                      <p className="text-[10px] text-white/30 mt-2">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => dismissKeyAlert(alert.username)}
                      className="text-xs text-white/40 hover:text-white/70 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}

        </div>
      </div>
    </div>
  );
}
