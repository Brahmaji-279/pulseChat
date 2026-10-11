import { create } from 'zustand';
import { Conversation, DecryptedMessage, User } from '../types/index.js';
import { api } from '../services/api.js';
import { getSocket } from '../services/socket.js';
import { useAuthStore } from './authStore.js';
import { useCryptoStore } from './cryptoStore.js';
import {
  createEncryptedEnvelope,
  openEncryptedEnvelope,
  EncryptedMessageEnvelope,
  fromBase64,
  getKemSecretKey,
} from '../crypto/index.js';

// Local storage key for sent message plaintexts
const LOCAL_PLAINTEXT_STORE = 'pulse_local_plaintext_cache_v1';

function getLocalPlaintextCache(): Record<string, any> {
  try {
    const raw = localStorage.getItem(LOCAL_PLAINTEXT_STORE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalPlaintext(messageId: string, payload: any) {
  try {
    const cache = getLocalPlaintextCache();
    cache[messageId] = payload;
    // Keep max 500 items in local cache
    const keys = Object.keys(cache);
    if (keys.length > 500) {
      delete cache[keys[0]];
    }
    localStorage.setItem(LOCAL_PLAINTEXT_STORE, JSON.stringify(cache));
  } catch (err) {
    console.warn('[Cache] Could not save plaintext locally:', err);
  }
}

function removeLocalPlaintext(messageId: string) {
  try {
    const cache = getLocalPlaintextCache();
    delete cache[messageId];
    localStorage.setItem(LOCAL_PLAINTEXT_STORE, JSON.stringify(cache));
  } catch (err) {
    console.warn('[Cache] Could not remove failed message from local cache:', err);
  }
}

function asStringId(value: any): string {
  if (typeof value === 'string') return value;
  if (value && typeof value.toString === 'function') return value.toString();
  return '';
}

export function normalizeEncryptedEnvelope(raw: any): EncryptedMessageEnvelope {
  const envelope = raw.encryptedEnvelope || {};
  const normalized: EncryptedMessageEnvelope = {
    ...envelope,
    protocolVersion: envelope.protocolVersion || raw.protocolVersion || '',
    conversationId: asStringId(envelope.conversationId ?? raw.conversationId),
    messageId: envelope.messageId || raw.messageId || '',
    senderId: asStringId(envelope.senderId ?? raw.senderId),
    recipientId: asStringId(envelope.recipientId ?? raw.recipientId),
  };

  if (
    !normalized.protocolVersion ||
    !normalized.conversationId ||
    !normalized.messageId ||
    !normalized.senderId ||
    !normalized.recipientId
  ) {
    throw new Error('Message envelope is missing required metadata');
  }

  return normalized;
}

async function getSenderSigningKey(username: string, keyId: string): Promise<Uint8Array> {
  const contactKey = await useCryptoStore.getState().getContactKey(username);
  if (contactKey.dsaKeyId === keyId) return contactKey.dsaPublicKey;

  const response = await api.getUserPublicKey(username, keyId);
  if (response.key.keyId !== keyId || response.key.algorithm !== 'ML-DSA-65') {
    throw new Error('Message signing identity could not be verified');
  }
  return fromBase64(response.key.publicKey);
}

async function getRecipientKemSecretKey(
  userId: string,
  keyId: string,
  currentKeys: NonNullable<ReturnType<typeof useCryptoStore.getState>['keys']>
): Promise<Uint8Array> {
  if (currentKeys.kemKey.keyId === keyId) return currentKeys.kemKey.secretKey;

  const previousKey = await getKemSecretKey(userId, keyId);
  if (!previousKey) throw new Error('The key needed for this message is not available on this device');
  return previousKey;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  messages: Record<string, DecryptedMessage[]>;
  onlineUsers: Set<string>;
  typingUsers: Record<string, string>; // conversationId -> typing username
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  startConversationWithUser: (user: User) => Promise<string>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (
    conversationId: string,
    text: string,
    options?: { type?: 'text' | 'image' | 'file'; attachmentUrl?: string; fileName?: string; fileSize?: number }
  ) => Promise<void>;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
  markMessagesRead: (conversationId: string) => void;
  setupSocketListeners: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  activeConversation: null,
  messages: {},
  onlineUsers: new Set(),
  typingUsers: {},
  isLoadingConversations: false,
  isLoadingMessages: false,
  error: null,

  loadConversations: async () => {
    set({ isLoadingConversations: true, error: null });
    try {
      const res = await api.getConversations();
      if (res && res.conversations) {
        set({ conversations: res.conversations, isLoadingConversations: false });
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to load conversations', isLoadingConversations: false });
    }
  },

  selectConversation: async (conversationId: string) => {
    const { conversations, activeConversationId } = get();
    if (activeConversationId === conversationId) return;

    const conv = conversations.find((c) => c.id === conversationId) || null;
    set({ activeConversationId: conversationId, activeConversation: conv });

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('conversation:join', { conversationId });
    }

    await get().loadMessages(conversationId);
    get().markMessagesRead(conversationId);
  },

  startConversationWithUser: async (user: User) => {
    try {
      const res = await api.createOrGetConversation({
        recipientId: user.id,
        recipientUsername: user.username,
      });

      const conv = res.conversation;
      set((state) => {
        const exists = state.conversations.some((c) => c.id === conv.id);
        const updated = exists ? state.conversations : [conv, ...state.conversations];
        return {
          conversations: updated,
          activeConversationId: conv.id,
          activeConversation: conv,
        };
      });

      await get().loadMessages(conv.id);
      return conv.id;
    } catch (err: any) {
      console.error('[ChatStore] Start conversation failed:', err);
      throw err;
    }
  },

  loadMessages: async (conversationId: string) => {
    set({ isLoadingMessages: true });
    const currentUser = useAuthStore.getState().user;
    const cryptoKeys = useCryptoStore.getState().keys;
    const cache = getLocalPlaintextCache();

    try {
      const res = await api.getMessages(conversationId);
      const rawMessages = res.messages || [];

      // Decrypt incoming messages
      const decryptedList: DecryptedMessage[] = [];

      for (const raw of rawMessages) {
        const isFromMe = currentUser && (raw.senderId === currentUser.id || raw.senderId?._id === currentUser.id);
        const msgId = raw.messageId;

        if (isFromMe) {
          // If sent from this user, check local cache
          const cached = cache[msgId];
          decryptedList.push({
            id: raw._id || msgId,
            messageId: msgId,
            conversationId,
            senderId: currentUser.id,
            recipientId: raw.recipientId?._id || raw.recipientId,
            text: cached?.text || '[Encrypted outgoing message]',
            type: cached?.type || 'text',
            attachmentUrl: cached?.attachmentUrl,
            fileName: cached?.fileName,
            fileSize: cached?.fileSize,
            deliveryStatus: raw.deliveryStatus || 'sent',
            timestamp: new Date(raw.createdAt).getTime(),
            createdAt: raw.createdAt,
            protocolVersion: raw.protocolVersion || 'v1',
            isVerifiedSignature: true,
          });
        } else {
          // Incoming message: Decrypt via Post-Quantum ML-KEM + ML-DSA + AES-256-GCM
          try {
            if (!cryptoKeys) throw new Error('Local crypto keys not loaded');

            const conv = get().conversations.find((c) => c.id === conversationId);
            const senderUsername = conv?.participant?.username || raw.senderId?.username;

            if (!senderUsername) throw new Error('Unknown sender identity');

            const envelope = normalizeEncryptedEnvelope(raw);
            const senderDsaPublicKey = await getSenderSigningKey(senderUsername, envelope.senderKeyId);
            const recipientKemSecretKey = await getRecipientKemSecretKey(
              currentUser?.id || '',
              envelope.recipientKeyId,
              cryptoKeys
            );

            const opened = openEncryptedEnvelope({
              envelope,
              recipientKemSecretKey,
              senderDsaPublicKey,
            });

            decryptedList.push({
              id: raw._id || msgId,
              messageId: msgId,
              conversationId,
              senderId: raw.senderId?._id || raw.senderId,
              recipientId: currentUser?.id || '',
              text: opened.text,
              type: opened.type || 'text',
              attachmentUrl: opened.attachmentUrl,
              fileName: opened.fileName,
              fileSize: opened.fileSize,
              deliveryStatus: raw.deliveryStatus || 'delivered',
              timestamp: new Date(raw.createdAt).getTime(),
              createdAt: raw.createdAt,
              protocolVersion: raw.protocolVersion,
              isVerifiedSignature: true,
            });
          } catch (decErr) {
            console.warn(`[Crypto] Failed to decrypt message ${msgId}:`, decErr);
            decryptedList.push({
              id: raw._id || msgId,
              messageId: msgId,
              conversationId,
              senderId: raw.senderId?._id || raw.senderId,
              recipientId: currentUser?.id || '',
              text: 'Unable to display this message',
              type: 'text',
              deliveryStatus: raw.deliveryStatus || 'delivered',
              timestamp: new Date(raw.createdAt).getTime(),
              createdAt: raw.createdAt,
              protocolVersion: raw.protocolVersion || 'v1',
              isVerifiedSignature: false,
              isDecryptionFailed: true,
            });
          }
        }
      }

      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: decryptedList,
        },
        isLoadingMessages: false,
      }));
    } catch (err: any) {
      console.error('[ChatStore] Load messages error:', err);
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (conversationId, text, options) => {
    const currentUser = useAuthStore.getState().user;
    const cryptoKeys = useCryptoStore.getState().keys;

    if (!currentUser || !cryptoKeys) {
      throw new Error('User or cryptographic identity not ready');
    }

    const { conversation: canonicalConversation } = await api.getConversationById(conversationId);
    if (!canonicalConversation?.participant) {
      throw new Error('This conversation does not have a valid recipient');
    }

    const activeConv = {
      ...canonicalConversation,
      id: asStringId(canonicalConversation.id),
    };
    const recipient = {
      ...canonicalConversation.participant,
      id: asStringId(canonicalConversation.participant.id),
    };
    if (recipient.id === currentUser.id) {
      throw new Error('The conversation recipient is invalid');
    }

    set((state) => ({
      conversations: [
        activeConv,
        ...state.conversations.filter((conversation) => conversation.id !== activeConv.id),
      ],
      activeConversation: activeConv,
      activeConversationId: activeConv.id,
    }));


    // 1. Fetch recipient verified public keys
    const recipientKey = await useCryptoStore.getState().getContactKey(recipient.username, true);

    // 2. Prepare payload
    const payload = {
      text,
      type: options?.type || 'text',
      attachmentUrl: options?.attachmentUrl,
      fileName: options?.fileName,
      fileSize: options?.fileSize,
    };

    // 3. Encrypt and sign with ML-KEM-768 + ML-DSA-65 + AES-256-GCM
    const envelope = createEncryptedEnvelope({
      content: payload,
      conversationId,
      senderId: currentUser.id,
      recipientId: recipient.id,
      senderDsaKey: cryptoKeys.dsaKey,
      senderKemKey: cryptoKeys.kemKey,
      recipientKemPublicKey: recipientKey.kemPublicKey,
      recipientKemKeyId: recipientKey.kemKeyId,
    });

    // 4. Save plaintext locally in cache for sender's view
    saveLocalPlaintext(envelope.messageId, payload);

    // 5. Create optimistic decrypted message for sender UI
    const optimisticMsg: DecryptedMessage = {
      id: envelope.messageId,
      messageId: envelope.messageId,
      conversationId,
      senderId: currentUser.id,
      recipientId: recipient.id,
      text: payload.text,
      type: payload.type,
      attachmentUrl: payload.attachmentUrl,
      fileName: payload.fileName,
      fileSize: payload.fileSize,
      deliveryStatus: 'sent',
      timestamp: envelope.timestamp,
      createdAt: new Date(envelope.timestamp).toISOString(),
      protocolVersion: envelope.protocolVersion,
      isVerifiedSignature: true,
    };

    set((state) => {
      const currentList = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...currentList, optimisticMsg],
        },
      };
    });

    // 6. Transmit via WebSocket, retrying through REST if the socket acknowledgement times out.
    const socket = getSocket();
    const messageData = {
      conversationId,
      recipientId: recipient.id,
      messageId: envelope.messageId,
      protocolVersion: envelope.protocolVersion,
      encryptedEnvelope: envelope,
    };

    try {
      if (socket.connected) {
        const result = await new Promise<{
          ack?: { success?: boolean; message?: { deliveryStatus?: DecryptedMessage['deliveryStatus'] }; error?: string };
          timedOut: boolean;
        }>((resolve) => {
          const timeout = setTimeout(() => resolve({ timedOut: true }), 5000);
          socket.emit('message:send', messageData, (ack: any) => {
            clearTimeout(timeout);
            resolve({ ack, timedOut: false });
          });
        });

        if (result.timedOut) {
          const response = await api.sendEncryptedMessage(conversationId, messageData);
          const deliveryStatus = response.message?.deliveryStatus;
          if (deliveryStatus) {
            set((state) => ({
              messages: {
                ...state.messages,
                [conversationId]: (state.messages[conversationId] || []).map((message) =>
                  message.messageId === envelope.messageId ? { ...message, deliveryStatus } : message
                ),
              },
            }));
          }
          if (socket.connected) {
            socket.emit('message:send', messageData, () => {});
          }
        } else if (!result.ack?.success) {
          throw new Error(result.ack?.error || 'Message could not be sent');
        } else if (result.ack.message?.deliveryStatus) {
          set((state) => ({
            messages: {
              ...state.messages,
              [conversationId]: (state.messages[conversationId] || []).map((message) =>
                message.messageId === envelope.messageId
                  ? { ...message, deliveryStatus: result.ack!.message!.deliveryStatus! }
                  : message
              ),
            },
          }));
        }
      } else {
        await api.sendEncryptedMessage(conversationId, messageData);
      }
    } catch (err) {
      removeLocalPlaintext(envelope.messageId);
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).filter(
            (message) => message.messageId !== envelope.messageId
          ),
        },
      }));
      throw err;
    }
  },

  sendTyping: (conversationId: string, isTyping: boolean) => {
    const activeConv = get().activeConversation;
    if (!activeConv || !activeConv.participant) return;

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit(isTyping ? 'typing:start' : 'typing:stop', {
        conversationId,
        recipientId: activeConv.participant.id,
      });
    }
  },

  markMessagesRead: (conversationId: string) => {
    const messages = get().messages[conversationId] || [];
    const currentUser = useAuthStore.getState().user;
    const socket = getSocket();

    messages.forEach((m) => {
      if (m.recipientId === currentUser?.id && m.deliveryStatus !== 'read') {
        m.deliveryStatus = 'read';
        if (socket && socket.connected) {
          socket.emit('message:read', { messageId: m.messageId, conversationId });
        }
      }
    });

    // Also update conversation unreadCount
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    }));
  },

  setupSocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    // Remove old listeners to prevent duplicates
    socket.off('presence:sync');
    socket.off('presence:update');
    socket.off('typing:start');
    socket.off('typing:stop');
    socket.off('message:received');
    socket.off('message:delivered');
    socket.off('message:read');

    // Online Presence
    socket.on('presence:sync', ({ activeUserIds }: { activeUserIds: string[] }) => {
      set({ onlineUsers: new Set(activeUserIds) });
    });

    socket.on('presence:update', ({ userId, status }: { userId: string; status: 'online' | 'offline' }) => {
      set((state) => {
        const next = new Set(state.onlineUsers);
        if (status === 'online') next.add(userId);
        else next.delete(userId);
        return { onlineUsers: next };
      });
    });

    // Typing Indicators
    socket.on('typing:start', ({ conversationId, username }: { conversationId: string; username: string }) => {
      set((state) => ({
        typingUsers: { ...state.typingUsers, [conversationId]: username },
      }));
    });

    socket.on('typing:stop', ({ conversationId }: { conversationId: string }) => {
      set((state) => {
        const next = { ...state.typingUsers };
        delete next[conversationId];
        return { typingUsers: next };
      });
    });

    // Real-Time Encrypted Message Received
    socket.on('message:received', async (raw: any) => {
      const currentUser = useAuthStore.getState().user;
      const cryptoKeys = useCryptoStore.getState().keys;
      const convId = raw.conversationId?.toString();
      const activeId = get().activeConversationId;

      if (!convId) return;

      let decrypted: DecryptedMessage;
      try {
        if (!cryptoKeys) throw new Error('Crypto keys not initialized');

        // Look up sender username
        let senderUsername = raw.senderUsername;
        if (!senderUsername) {
          const conv = get().conversations.find((c) => c.id === convId);
          senderUsername = conv?.participant?.username;
        }

        if (!senderUsername) {
          // Fetch user details if needed
          const userRes = await api.getUserByUsername(raw.senderId);
          senderUsername = userRes.user.username;
        }

        const envelope = normalizeEncryptedEnvelope(raw);
        const senderDsaPublicKey = await getSenderSigningKey(senderUsername, envelope.senderKeyId);
        const recipientKemSecretKey = await getRecipientKemSecretKey(
          currentUser?.id || '',
          envelope.recipientKeyId,
          cryptoKeys
        );

        const opened = openEncryptedEnvelope({
          envelope,
          recipientKemSecretKey,
          senderDsaPublicKey,
        });

        decrypted = {
          id: raw._id || raw.messageId,
          messageId: raw.messageId,
          conversationId: convId,
          senderId: raw.senderId,
          recipientId: currentUser?.id || '',
          text: opened.text,
          type: opened.type || 'text',
          attachmentUrl: opened.attachmentUrl,
          fileName: opened.fileName,
          fileSize: opened.fileSize,
          deliveryStatus: activeId === convId ? 'read' : 'delivered',
          timestamp: new Date(raw.createdAt).getTime(),
          createdAt: raw.createdAt,
          protocolVersion: raw.protocolVersion,
          isVerifiedSignature: true,
        };
      } catch (err) {
        console.warn('[Crypto] Incoming decryption error:', err);
        decrypted = {
          id: raw._id || raw.messageId,
          messageId: raw.messageId,
          conversationId: convId,
          senderId: raw.senderId,
          recipientId: currentUser?.id || '',
          text: 'Unable to display this message',
          deliveryStatus: activeId === convId ? 'read' : 'delivered',
          timestamp: new Date(raw.createdAt).getTime(),
          createdAt: raw.createdAt,
          protocolVersion: raw.protocolVersion || 'v1',
          isVerifiedSignature: false,
          isDecryptionFailed: true,
        };
      }

      // Add to messages list
      set((state) => {
        const existing = state.messages[convId] || [];
        if (existing.some((message) => message.messageId === decrypted.messageId)) return state;
        return {
          messages: {
            ...state.messages,
            [convId]: [...existing, decrypted],
          },
        };
      });

      // Send delivery / read receipts
      if (activeId === convId) {
        socket.emit('message:read', { messageId: raw.messageId, conversationId: convId });
      } else {
        socket.emit('message:delivered', { messageId: raw.messageId });
        // Increment unread count for conversation
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === convId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
          ),
        }));
      }
    });

    // Receipts
    socket.on('message:delivered', ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      set((state) => {
        const list = state.messages[conversationId] || [];
        return {
          messages: {
            ...state.messages,
            [conversationId]: list.map((m) =>
              m.messageId === messageId ? { ...m, deliveryStatus: 'delivered' } : m
            ),
          },
        };
      });
    });

    socket.on('message:read', ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      set((state) => {
        const list = state.messages[conversationId] || [];
        return {
          messages: {
            ...state.messages,
            [conversationId]: list.map((m) =>
              m.messageId === messageId ? { ...m, deliveryStatus: 'read' } : m
            ),
          },
        };
      });
    });
  },
}));
