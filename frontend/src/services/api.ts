import { User, Conversation, DecryptedMessage, CallLog, ContactItem } from '../types/index.js';

const API_ORIGIN = (import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://pulsechat-api-r7v2.onrender.com' : '')).replace(/\/$/, '');
const API_BASE = `${API_ORIGIN}/api`;

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('pulse_jwt_fallback');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Secure HTTP-Only Cookies
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

export const api = {
  // Authentication
  forgotPassword: (body: { email: string }) => request<{ success: boolean }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  register: (body: any) => request<{ success: boolean; user: User; token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  login: (body: any) => request<{ success: boolean; user: User; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  logoutAllSessions: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request<{ success: boolean; user: User }>('/auth/me'),
  changePassword: (body: any) => request<{ success: boolean; message: string }>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  deleteAccount: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  // Users & Profiles
  searchUsers: (query: string) => request<{ success: boolean; users: User[] }>(`/users/search?q=${encodeURIComponent(query)}`),
  getUserByUsername: (username: string) => request<{ success: boolean; user: User }>(`/users/${encodeURIComponent(username)}`),
  updateProfile: (body: any) => request<{ success: boolean; user: User }>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  uploadProfilePhoto: async (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    const tokenHeader = getAuthHeader();
    const res = await fetch(`${API_BASE}/users/me/photo`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: { ...tokenHeader },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Photo upload failed');
    return data;
  },

  // Contacts & Blocking
  getContacts: () => request<{ success: boolean; contacts: ContactItem[] }>('/contacts'),
  sendContactRequest: (body: { recipientId?: string; recipientUsername?: string }) =>
    request<{ success: boolean; message: string }>('/contacts/requests', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getContactRequests: () =>
    request<{ success: boolean; incoming: any[]; outgoing: any[] }>('/contacts/requests'),
  respondContactRequest: (id: string, action: 'accept' | 'reject') =>
    request<{ success: boolean; message: string }>(`/contacts/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    }),
  deleteContact: (id: string) =>
    request<{ success: boolean; message: string }>(`/contacts/${id}`, { method: 'DELETE' }),
  blockUser: (id: string) =>
    request<{ success: boolean; message: string }>(`/contacts/block/${id}`, { method: 'POST' }),
  unblockUser: (id: string) =>
    request<{ success: boolean; message: string }>(`/contacts/block/${id}`, { method: 'DELETE' }),

  // Cryptographic Public Key Directory
  registerKey: (body: any) => request<{ success: boolean; key: any }>('/crypto/keys', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  getUserPublicKeys: (username: string) =>
    request<{ success: boolean; username: string; userId: string; keys: any[] }>(`/crypto/keys/${encodeURIComponent(username)}`),
  getUserPublicKey: (username: string, keyId: string) =>
    request<{ success: boolean; key: { keyId: string; algorithm: string; publicKey: string } }>(
      `/crypto/keys/${encodeURIComponent(username)}/${encodeURIComponent(keyId)}`
    ),
  getUserFingerprint: (username: string) =>
    request<{ success: boolean; username: string; displayName: string; dsaFingerprint: string; kemFingerprint: string }>(
      `/crypto/fingerprint/${encodeURIComponent(username)}`
    ),
  revokeKey: (keyId: string) =>
    request<{ success: boolean; message: string }>(`/crypto/keys/${keyId}/revoke`, { method: 'POST' }),

  // Conversations
  getConversations: () => request<{ success: boolean; conversations: Conversation[] }>('/conversations'),
  createOrGetConversation: (body: { recipientId?: string; recipientUsername?: string }) =>
    request<{ success: boolean; conversation: Conversation }>('/conversations', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getConversationById: (id: string) =>
    request<{ success: boolean; conversation: Conversation }>(`/conversations/${id}`),

  // Messages
  getMessages: (conversationId: string) =>
    request<{ success: boolean; messages: any[] }>(`/conversations/${conversationId}/messages`),
  sendEncryptedMessage: (conversationId: string, body: any) =>
    request<{ success: boolean; message: any }>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateMessageStatus: (messageId: string, status: 'delivered' | 'read') =>
    request<{ success: boolean; message: any }>(`/messages/${messageId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Calls
  logCall: (body: any) => request<{ success: boolean; call: any }>('/calls', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  getCallHistory: () => request<{ success: boolean; calls: CallLog[] }>('/calls/history'),
};
