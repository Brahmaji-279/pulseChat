import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('pulse_jwt_fallback');
    socket = io(window.location.origin, {
      auth: { token },
      withCredentials: true,
      autoConnect: false,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  const token = localStorage.getItem('pulse_jwt_fallback');
  if (s.auth) {
    (s.auth as any).token = token;
  }
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
