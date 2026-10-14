import { create } from 'zustand';
import { WebRTCManager } from '../services/webrtc.js';
import { connectSocket, getSocket } from '../services/socket.js';
import { api } from '../services/api.js';
import { toast } from '../components/ToastNotifications.js';

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
  isScreenSharing: boolean;
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
  pendingSignals: Array<{ callId: string; senderId: string; signal: any }>;
  durationInterval: any;

  // Actions
  initiateCall: (peer: CallPeer, callType: 'voice' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  setupCallSocketListeners: () => void;
}

async function getConnectedSocket() {
  const socket = connectSocket();
  if (socket.connected) return socket;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error('Call signaling is unavailable. Please try again.')), 10000);
    const onConnect = () => finish();
    const onError = () => finish(new Error('Could not connect to the call service.'));
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
      if (error) reject(error);
      else resolve();
    };
    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
  });
  return socket;
}

export const useCallStore = create<CallState>((set, get) => ({
  activeCall: null,
  incomingCall: null,
  localStream: null,
  remoteStream: null,
  connectionState: 'new',
  rtcManager: null,
  pendingSignals: [],
  durationInterval: null,

  initiateCall: async (peer: CallPeer, callType: 'voice' | 'video') => {
    if (get().activeCall || get().incomingCall) {
      toast.error('Finish the current call before starting another one.');
      return;
    }
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const socket = await getConnectedSocket();
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
        remoteStream: null,
        connectionState: 'new',
        pendingSignals: [],
        activeCall: {
          callId,
          callType,
          status: 'outgoing',
          peer,
          isMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
          duration: 0,
        },
      });

      // Notify recipient
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

    const { callId, callType, initiator } = incoming;

    try {
      const socket = await getConnectedSocket();
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
        remoteStream: null,
        connectionState: 'new',
        incomingCall: null,
        activeCall: {
          callId,
          callType,
          status: 'incoming',
          peer: initiator,
          isMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
          duration: 0,
          startedAt: Date.now(),
        },
      });

      socket.emit('call:accept', {
        callId,
        initiatorId: initiator.id,
      });

      const pendingSignals = get().pendingSignals.filter((signal) => signal.callId === callId);
      set({ pendingSignals: [] });
      for (const pendingSignal of pendingSignals) {
        await handleCallSignal(pendingSignal, rtcManager, socket);
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

    set({
      incomingCall: null,
      pendingSignals: get().pendingSignals.filter((signal) => signal.callId !== incoming?.callId),
    });
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
      pendingSignals: [],
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

  toggleScreenShare: async () => {
    const { activeCall, rtcManager } = get();
    if (!activeCall || activeCall.callType !== 'video' || !rtcManager) return;

    try {
      if (activeCall.isScreenSharing) {
        const cameraStream = await rtcManager.stopScreenShare();
        set({
          localStream: cameraStream,
          activeCall: { ...activeCall, isScreenSharing: false },
        });
      } else {
        const screenStream = await rtcManager.startScreenShare();
        set({
          localStream: screenStream,
          activeCall: { ...activeCall, isScreenSharing: true },
        });
        screenStream.getVideoTracks()[0].onended = () => {
          void rtcManager.stopScreenShare().then((cameraStream) => {
            const current = get().activeCall;
            if (current?.callId === activeCall.callId) {
              set({
                localStream: cameraStream,
                activeCall: { ...current, isScreenSharing: false },
              });
            }
          }).catch((err) => {
            console.error('[CallStore] Failed to stop screen sharing:', err);
            toast.error('Could not stop screen sharing cleanly.');
          });
        };
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Screen sharing could not be started.');
    }
  },

  setupCallSocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.off('call:incoming');
    socket.off('call:accepted');
    socket.off('call:rejected');
    socket.off('call:ended');
    socket.off('call:signal');
    socket.off('call:error');

    // Incoming Call
    socket.on('call:incoming', (payload: any) => {
      // If already in a call, reject as busy
      if (get().activeCall || get().incomingCall) {
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
        pendingSignals: get().pendingSignals.filter((signal) => signal.callId === payload.callId),
      });
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
      const { rtcManager, activeCall, incomingCall } = get();
      if (
        (activeCall && activeCall.callId !== payload.callId) ||
        (incomingCall && incomingCall.callId !== payload.callId)
      ) return;
      if (!rtcManager) {
        set((state) => ({ pendingSignals: [...state.pendingSignals, payload] }));
        return;
      }
      await handleCallSignal(payload, rtcManager, socket);
    });

    socket.on('call:error', (payload: { error?: string }) => {
      toast.error(payload.error || 'The call could not be connected.');
      get().endCall();
    });
  },
}));

async function handleCallSignal(
  payload: { callId: string; senderId: string; signal: any },
  rtcManager: WebRTCManager,
  socket: ReturnType<typeof getSocket>
): Promise<void> {
  try {
    if (payload.signal.type === 'offer') {
      const answer = await rtcManager.handleOffer(payload.signal);
      socket.emit('call:signal', {
        recipientId: payload.senderId,
        callId: payload.callId,
        signal: answer,
      });
    } else if (payload.signal.type === 'answer') {
      await rtcManager.handleAnswer(payload.signal);
    } else if (payload.signal.type === 'candidate' && payload.signal.candidate) {
      await rtcManager.addIceCandidate(payload.signal.candidate);
    }
  } catch (err) {
    console.error('[CallStore] Failed to process call signaling:', err);
    toast.error('Call setup failed. Please end the call and try again.');
  }
}
