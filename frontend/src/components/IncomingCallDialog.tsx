import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCallStore } from '../store/callStore.js';
import { UserAvatar } from './UserAvatar.js';

export const IncomingCallDialog: React.FC = () => {
  const { incomingCall, acceptCall, rejectCall } = useCallStore();

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          key="incoming-call"
          initial={{ opacity: 0, x: 80, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 80, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-20 right-5 z-[200] w-72"
        >
          <div className="bg-[#111]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
            {/* Gradient top bar */}
            <div className="h-0.5 bg-gradient-to-r from-violet-500 via-cyan-400 to-violet-500" />

            <div className="p-5">
              {/* Header */}
              <div className="flex items-center gap-2 mb-4">
                {/* Pulsing indicator */}
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-8 h-8 rounded-full bg-violet-500/20 animate-ping" />
                  {incomingCall.callType === 'voice' ? (
                    <Phone size={16} className="text-violet-400 relative z-10" />
                  ) : (
                    <Video size={16} className="text-violet-400 relative z-10" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-violet-300 uppercase tracking-wide">
                    {incomingCall.callType === 'voice' ? 'VoicePulse' : 'VisualPulse'}
                  </p>
                  <p className="text-[10px] text-white/30">Live call</p>
                </div>
              </div>

              {/* Caller info */}
              <div className="flex items-center gap-3 mb-5">
                <div className="relative">
                  <UserAvatar
                    username={incomingCall.initiator.username}
                    displayName={incomingCall.initiator.displayName}
                    photoUrl={incomingCall.initiator.profilePhoto}
                    size="lg"
                  />
                  {/* Outer pulse ring */}
                  <span className="absolute inset-0 rounded-full border-2 border-violet-500/50 animate-ping" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">{incomingCall.initiator.displayName || incomingCall.initiator.username}</p>
                  <p className="text-sm text-white/40">@{incomingCall.initiator.username}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                {/* Reject */}
                <button
                  onClick={() => rejectCall('declined')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-sm font-medium transition-all active:scale-95"
                >
                  <PhoneOff size={15} />
                  Decline
                </button>

                {/* Accept */}
                <button
                  onClick={() => acceptCall()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-sm font-medium transition-all active:scale-95"
                >
                  {incomingCall.callType === 'voice' ? <Phone size={15} /> : <Video size={15} />}
                  Accept
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
