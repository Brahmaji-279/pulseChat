import { create } from 'zustand';
import { WebRTCManager } from '../services/webrtc.js';
import { getSocket } from '../services/socket.js';
import { api } from '../services/api.js';

export interface CallPeer {
  id: string;
  username: string;
  displayName: string;
  profilePhoto?: string;
}

export interface ActiveCall {
  callId: string;
  callType: 'voice' | 'video';
  status: 'outgoing' | 'incoming' | 'connected' | 'ended';
  peer: CallPeer;
  isMuted: boolean;
  isVideoOff: boolean;
  duration: number;
  startedAt?: number;
}

export interface IncomingCallNotification {
  callId: string;
  callType: 'voice' | 'video';
  initiator: CallPeer;
  timestamp: number;
}

interface CallState {
  activeCall: ActiveCall | null;
  incomingCall: IncomingCallNotification | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
  rtcManager: WebRTCManager | null;
  durationInterval: any;

  // Actions
  initiateCall: (peer: CallPeer, callType: 'voice' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  setupCallSocketListeners: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  activeCall: null,
  incomingCall: null,
  localStream: null,
  remoteStream: null,
  connectionState: 'new',
  rtcManager: null,
  durationInterval: null,

  initiateCall: async (peer: CallPeer, callType: 'voice' | 'video') => {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const socket = getSocket();

    try {
      const rtcManager = new WebRTCManager(
        (remoteStream) => {
          set({ remoteStream });
        },
        (candidate) => {
          if (socket && socket.connected) {
            socket.emit('call:signal', {
              recipientId: peer.id,
              callId,
              signal: { type: 'candidate', candidate },
            });
          }
        },
        (connectionState) => {
          set({ connectionState });
          if (connectionState === 'connected') {
            const current = get().activeCall;
            if (current && current.status !== 'connected') {
              const startedAt = Date.now();
              const interval = setInterval(() => {
                const ac = get().activeCall;
                if (ac && ac.status === 'connected') {
                  set({ activeCall: { ...ac, duration: Math.floor((Date.now() - startedAt) / 1000) } });
                }
              }, 1000);

              set({
                activeCall: { ...current, status: 'connected', startedAt },
                durationInterval: interval,
              });
            }
          }
        }
      );

      const localStream = await rtcManager.acquireLocalMedia(callType === 'video');

      set({
        rtcManager,
        localStream,
        activeCall: {
          callId,
          callType,
          status: 'outgoing',
          peer,
          isMuted: false,
          isVideoOff: false,
          duration: 0,
        },
      });

      // Notify recipient
      if (socket && socket.connected) {
        socket.emit('call:initiate', {
          recipientId: peer.id,
          callType,
          callId,
        });

        const offer = await rtcManager.createOffer();
        socket.emit('call:signal', {
          recipientId: peer.id,
          callId,
          signal: offer,
        });
      }

      // Log call initiation to backend
      api.logCall({
        recipientId: peer.id,
        callType,
        status: 'initiated',
      }).catch(console.warn);
    } catch (err: any) {
      console.error('[CallStore] Failed to initiate call:', err);
      get().endCall();
      throw err;
    }
  },

  acceptCall: async () => {
    const incoming = get().incomingCall;
    if (!incoming) return;

    const socket = getSocket();
    const { callId, callType, initiator } = incoming;

    try {
      const rtcManager = new WebRTCManager(
        (remoteStream) => {
          set({ remoteStream });
        },
        (candidate) => {
          if (socket && socket.connected) {
            socket.emit('call:signal', {
              recipientId: initiator.id,
              callId,
              signal: { type: 'candidate', candidate },
            });
          }
        },
        (connectionState) => {
          set({ connectionState });
          if (connectionState === 'connected') {
            const startedAt = Date.now();
            const interval = setInterval(() => {
              const ac = get().activeCall;
              if (ac && ac.status === 'connected') {
                set({ activeCall: { ...ac, duration: Math.floor((Date.now() - startedAt) / 1000) } });
              }
            }, 1000);

            const cur = get().activeCall;
            if (cur) {
              set({
                activeCall: { ...cur, status: 'connected', startedAt },
                durationInterval: interval,
              });
            }
          }
        }
      );

      const localStream = await rtcManager.acquireLocalMedia(callType === 'video');

      set({
        rtcManager,
        localStream,
        incomingCall: null,
        activeCall: {
          callId,
          callType,
          status: 'connected',
          peer: initiator,
          isMuted: false,
          isVideoOff: false,
          duration: 0,
          startedAt: Date.now(),
        },
      });

      if (socket && socket.connected) {
        socket.emit('call:accept', {
          callId,
          initiatorId: initiator.id,
        });
      }
    } catch (err: any) {
      console.error('[CallStore] Failed to accept call:', err);
      get().rejectCall('error');
    }
  },

  rejectCall: (reason = 'declined') => {
    const incoming = get().incomingCall;
    const socket = getSocket();

    if (incoming && socket && socket.connected) {
      socket.emit('call:reject', {
        callId: incoming.callId,
        initiatorId: incoming.initiator.id,
        reason,
      });
    }

    set({ incomingCall: null });
  },

  endCall: () => {
    const { activeCall, rtcManager, durationInterval } = get();
    const socket = getSocket();

    if (durationInterval) {
      clearInterval(durationInterval);
    }

    if (activeCall && socket && socket.connected) {
      socket.emit('call:end', {
        callId: activeCall.callId,
        otherUserId: activeCall.peer.id,
        duration: activeCall.duration,
      });

      api.logCall({
        recipientId: activeCall.peer.id,
        callType: activeCall.callType,
        status: activeCall.duration > 0 ? 'ended' : 'missed',
        duration: activeCall.duration,
      }).catch(console.warn);
    }

    if (rtcManager) {
      rtcManager.close();
    }

    set({
      activeCall: null,
      incomingCall: null,
      localStream: null,
      remoteStream: null,
      rtcManager: null,
      durationInterval: null,
      connectionState: 'closed',
    });
  },

  toggleMute: () => {
    const { activeCall, rtcManager } = get();
    if (!activeCall || !rtcManager) return;

    const nextMuted = !activeCall.isMuted;
    rtcManager.toggleMute(nextMuted);
    set({ activeCall: { ...activeCall, isMuted: nextMuted } });
  },

  toggleVideo: () => {
    const { activeCall, rtcManager } = get();
    if (!activeCall || !rtcManager) return;

    const nextVideoOff = !activeCall.isVideoOff;
    rtcManager.toggleVideo(nextVideoOff);
    set({ activeCall: { ...activeCall, isVideoOff: nextVideoOff } });
  },

  setupCallSocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.off('call:incoming');
    socket.off('call:accepted');
    socket.off('call:rejected');
    socket.off('call:ended');
    socket.off('call:signal');

    // Incoming Call
    socket.on('call:incoming', (payload: any) => {
      // If already in a call, reject as busy
      if (get().activeCall) {
        socket.emit('call:reject', {
          callId: payload.callId,
          initiatorId: payload.initiator.id,
          reason: 'busy',
        });
        return;
      }

      set({
        incomingCall: {
          callId: payload.callId,
          callType: payload.callType,
          initiator: payload.initiator,
          timestamp: payload.timestamp || Date.now(),
        },
      });
    });

    // Call Accepted by peer
    socket.on('call:accepted', () => {
      const cur = get().activeCall;
      if (cur) {
        set({ activeCall: { ...cur, status: 'connected' } });
      }
    });

    // Call Rejected by peer
    socket.on('call:rejected', () => {
      get().endCall();
    });

    // Call Ended by peer
    socket.on('call:ended', () => {
      get().endCall();
    });

    // WebRTC Signaling (SDP Offer/Answer & ICE Candidates)
    socket.on('call:signal', async (payload: { callId: string; senderId: string; signal: any }) => {
      const { rtcManager } = get();
      if (!rtcManager) return;

      const { signal } = payload;
      if (signal.type === 'offer') {
        const answer = await rtcManager.handleOffer(signal);
        socket.emit('call:signal', {
          recipientId: payload.senderId,
          callId: payload.callId,
          signal: answer,
        });
      } else if (signal.type === 'answer') {
        await rtcManager.handleAnswer(signal);
      } else if (signal.type === 'candidate' && signal.candidate) {
        await rtcManager.addIceCandidate(signal.candidate);
      }
    });
  },
}));
