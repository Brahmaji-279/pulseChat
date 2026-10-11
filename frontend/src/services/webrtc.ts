/**
 * VoicePulse (Voice) & VisualPulse (Video) WebRTC Client Layer
 *
 * NOTE ON CRYPTOGRAPHY (Sections 14 & 15 of Protocol Specification):
 * Standard WebRTC media streams are encrypted point-to-point via DTLS-SRTP
 * using classical elliptic curve Diffie-Hellman (e.g. X25519) and AES-128-GCM.
 * PulseChat does not falsely claim standard WebRTC media streams are post-quantum secure.
 * While post-quantum signaling is authenticated via ML-DSA-65, the underlying media transport
 * remains classical WebRTC SRTP.
 */

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onIceCandidateCallback: ((candidate: RTCIceCandidate) => void) | null = null;
  private onConnectionStateCallback: ((state: RTCPeerConnectionState) => void) | null = null;

  constructor(
    onRemoteStream: (stream: MediaStream) => void,
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onConnectionState?: (state: RTCPeerConnectionState) => void
  ) {
    this.onRemoteStreamCallback = onRemoteStream;
    this.onIceCandidateCallback = onIceCandidate;
    this.onConnectionStateCallback = onConnectionState || null;
  }

  public async acquireLocalMedia(isVideo: boolean): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideo
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      return stream;
    } catch (err: any) {
      console.error('[WebRTC Permission Error]', err);
      throw new Error(
        err.name === 'NotAllowedError'
          ? 'Microphone/Camera permission was denied. Please allow access in browser settings.'
          : `Media device access error: ${err.message}`
      );
    }
  }

  public createPeerConnection(): RTCPeerConnection {
    this.close();

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnection = pc;

    // Attach local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(event.streams[0]);
        }
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.onConnectionStateCallback) {
        this.onConnectionStateCallback(pc.connectionState);
      }
    };

    return pc;
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) this.createPeerConnection();
    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);
    return offer;
  }

  public async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) this.createPeerConnection();
    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection!.createAnswer();
    await this.peerConnection!.setLocalDescription(answer);
    return answer;
  }

  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  public async addIceCandidate(candidateInit: RTCIceCandidateInit): Promise<void> {
    if (this.peerConnection) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
      } catch (err) {
        console.warn('[WebRTC ICE Error]', err);
      }
    }
  }

  public toggleMute(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
    }
  }

  public toggleVideo(videoOff: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((t) => {
        t.enabled = !videoOff;
      });
    }
  }

  public close(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
  }
}
