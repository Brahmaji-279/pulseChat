import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2,
  Signal, AlertTriangle, Phone, Monitor
} from 'lucide-react';
import { useCallStore } from '../store/callStore.js';
import { UserAvatar } from './UserAvatar.js';

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export const CallScreen: React.FC = () => {
  const {
    activeCall,
    localStream,
    remoteStream,
    connectionState,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  } = useCallStore();

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      void remoteAudioRef.current.play().catch((err) => {
        console.warn('[CallScreen] Remote audio playback was blocked:', err);
      });
    }
  }, [remoteStream]);

  // Attach local stream to local preview
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const isConnected = connectionState === 'connected';
  const isVideo = activeCall?.callType === 'video';

  const statusLabel = () => {
    switch (connectionState) {
      case 'connecting': return 'Connecting...';
      case 'connected': return isVideo ? 'VisualPulse Connected' : 'VoicePulse Connected';
      case 'disconnected': return 'Connection lost...';
      case 'failed': return 'Connection failed';
      case 'closed': return 'Call ended';
      default: return 'Calling...';
    }
  };

  return (
    <AnimatePresence>
      {activeCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-[#030303]"
        >
          {!isVideo && <audio ref={remoteAudioRef} autoPlay />}
          {isVideo ? (
            /* ============ VIDEO CALL LAYOUT ============ */
            <div className="relative w-full h-full bg-black">
              {/* Remote video */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Connecting overlay */}
              {!isConnected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030303]">
                  <UserAvatar
                    username={activeCall.peer.username}
                    displayName={activeCall.peer.displayName}
                    photoUrl={activeCall.peer.profilePhoto}
                    size="xl"
                    className="mb-5"
                  />
                  <p className="text-xl font-semibold text-white">{activeCall.peer.displayName}</p>
                  <p className="text-sm text-violet-400 mt-2 animate-pulse">{statusLabel()}</p>
                </div>
              )}

              {/* Local video preview (PiP) */}
              <div className="absolute top-4 right-4 w-32 h-24 rounded-xl overflow-hidden border border-white/20 shadow-xl">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${activeCall.isScreenSharing ? '' : 'scale-x-[-1]'}`}
                />
                {activeCall.isVideoOff && (
                  <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
                    <VideoOff size={18} className="text-white/40" />
                  </div>
                )}
              </div>

              {/* Duration */}
              {isConnected && (
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur text-xs text-white/80 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {formatDuration(activeCall.duration)}
                </div>
              )}

              {/* Controls bar */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-4 px-8 py-4 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10">
                  <button
                    onClick={toggleMute}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      activeCall.isMuted ? 'bg-red-500/30 border border-red-500/40' : 'bg-white/10 hover:bg-white/20'
                    }`}
                    title={activeCall.isMuted ? 'Unmute' : 'Mute'}
                  >
                    {activeCall.isMuted ? <MicOff size={18} className="text-red-400" /> : <Mic size={18} className="text-white" />}
                  </button>

                  <button
                    onClick={endCall}
                    className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-red-600/40"
                    title="End call"
                  >
                    <PhoneOff size={22} className="text-white" />
                  </button>

                  <button
                    onClick={toggleVideo}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      activeCall.isVideoOff ? 'bg-red-500/30 border border-red-500/40' : 'bg-white/10 hover:bg-white/20'
                    }`}
                    title={activeCall.isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                  >
                    {activeCall.isVideoOff ? <VideoOff size={18} className="text-red-400" /> : <Video size={18} className="text-white" />}
                  </button>
                  <button
                    onClick={() => void toggleScreenShare()}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      activeCall.isScreenSharing ? 'bg-violet-500/30 border border-violet-400/50 text-violet-200' : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                    title={activeCall.isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
                    aria-label={activeCall.isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
                  >
                    <Monitor size={18} />
                  </button>
                </div>
              </div>

              {/* Crypto disclaimer */}
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <p className="text-[10px] text-white/20">
                  High-quality call connected via real-time voice/video channels
                </p>
              </div>
            </div>
          ) : (
            /* ============ VOICE CALL LAYOUT ============ */
            <div className="flex flex-col items-center justify-center h-full bg-[#030303]">
              {/* Background ambient glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.08)_0%,_transparent_60%)]" />

              {/* Caller info */}
              <div className="relative z-10 flex flex-col items-center">
                {/* Ripple rings */}
                {isConnected && (
                  <>
                    <div className="absolute w-48 h-48 rounded-full border border-violet-500/10 animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute w-40 h-40 rounded-full border border-violet-500/15 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                  </>
                )}

                <UserAvatar
                  username={activeCall.peer.username}
                  displayName={activeCall.peer.displayName}
                  photoUrl={activeCall.peer.profilePhoto}
                  size="xl"
                  className="mb-5 relative"
                />

                <h2 className="text-2xl font-semibold text-white mb-1">{activeCall.peer.displayName}</h2>
                <p className="text-sm text-white/50">@{activeCall.peer.username}</p>

                <div className="mt-4 flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <Signal size={14} className="text-emerald-400" />
                      <span className="text-sm text-emerald-400">{statusLabel()}</span>
                      <span className="text-sm text-white/40 ml-1">{formatDuration(activeCall.duration)}</span>
                    </>
                  ) : (
                    <span className="text-sm text-violet-400 animate-pulse">{statusLabel()}</span>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="relative z-10 mt-16 flex items-center gap-6">
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    activeCall.isMuted
                      ? 'bg-red-500/20 border border-red-500/40'
                      : 'bg-white/10 hover:bg-white/15 border border-white/10'
                  }`}
                >
                  {activeCall.isMuted ? <MicOff size={20} className="text-red-400" /> : <Mic size={20} className="text-white" />}
                </button>

                <button
                  onClick={endCall}
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-red-600/40"
                >
                  <PhoneOff size={24} className="text-white" />
                </button>

                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Phone size={20} className="text-white/30" />
                </div>
              </div>

              {/* Crypto disclaimer */}
              <p className="relative z-10 mt-10 text-[11px] text-white/20 flex items-center gap-1.5">
                <AlertTriangle size={11} className="text-amber-400/40" />
                Audio and video are connected in real time
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
