import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('pulse_jwt_fallback');
    const socketUrl = import.meta.env.VITE_SOCKET_URL
      || import.meta.env.VITE_API_URL
      || (import.meta.env.PROD ? 'https://pulsechat-api-r7v2.onrender.com' : window.location.origin);
    socket = io(socketUrl, {
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
