import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing, Clock, Loader2 } from 'lucide-react';
import { api } from '../services/api.js';
import { UserAvatar } from '../components/UserAvatar.js';
import { GlassPanel } from '../components/GlassPanel.js';
import { AnimatedBackground } from '../components/AnimatedBackground.js';
import type { CallLog } from '../types/index.js';

function formatDuration(secs: number): string {
  if (!secs) return '—';
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function CallsPage() {
  const [callHistory, setCallHistory] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCallHistory()
      .then((res) => setCallHistory(res.calls || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getCallIcon = (call: CallLog) => {
    if (call.status === 'missed') return <PhoneMissed size={14} className="text-red-400" />;
    if (call.isOutgoing) return <PhoneOutgoing size={14} className="text-violet-400" />;
    return <PhoneIncoming size={14} className="text-emerald-400" />;
  };

  const getStatusColor = (call: CallLog) => {
    if (call.status === 'missed') return 'text-red-400';
    if (call.isOutgoing) return 'text-violet-400';
    return 'text-emerald-400';
  };

  const getStatusLabel = (call: CallLog) => {
    if (call.status === 'missed') return 'Missed';
    if (call.isOutgoing) return 'Outgoing';
    return 'Incoming';
  };

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Phone size={22} className="text-violet-400" />
            Calls
          </h1>
          <p className="text-sm text-white/40 mt-1">VoicePulse and VisualPulse history</p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-violet-400 animate-spin" />
          </div>
        ) : callHistory.length === 0 ? (
          <GlassPanel className="p-16 text-center">
            <Phone size={40} className="mx-auto text-white/15 mb-4" />
            <p className="text-white/50 text-sm font-medium">No call history</p>
            <p className="text-white/30 text-xs mt-1">Start a call from any conversation</p>
          </GlassPanel>
        ) : (
          <div className="space-y-2">
            {callHistory.map((call, i) => (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <GlassPanel className="p-3 flex items-center gap-3">
                  <UserAvatar
                    username={call.participant.username}
                    displayName={call.participant.displayName}
                    photoUrl={call.participant.profilePhoto}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white/90 truncate">
                        {call.participant.displayName || call.participant.username}
                      </p>
                      <span className={`text-[10px] font-medium ${getStatusColor(call)}`}>
                        {getStatusLabel(call)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {getCallIcon(call)}
                      <span className="text-xs text-white/40">
                        {call.callType === 'video' ? (
                          <span className="flex items-center gap-1">
                            <Video size={11} /> VisualPulse
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Phone size={11} /> VoicePulse
                          </span>
                        )}
                      </span>
                      {call.duration > 0 && (
                        <>
                          <span className="text-white/20">·</span>
                          <span className="text-xs text-white/40 flex items-center gap-1">
                            <Clock size={10} /> {formatDuration(call.duration)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-white/30 shrink-0">{formatDate(call.createdAt)}</span>
                </GlassPanel>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
