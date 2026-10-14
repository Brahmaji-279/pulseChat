import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Phone,
  Video,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  Lock,
  Shield,
  ChevronRight,
  Users,
  Ban,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useChatStore } from '../store/chatStore.js';
import { useCallStore } from '../store/callStore.js';
import { UserAvatar } from '../components/UserAvatar.js';
import { OnlineIndicator } from '../components/OnlineIndicator.js';
import { GlassPanel } from '../components/GlassPanel.js';
import { api } from '../services/api.js';
import { encryptAttachment } from '../crypto/attachments.js';
import { DecryptedAttachment } from '../components/DecryptedAttachment.js';
import { toast } from '../components/ToastNotifications.js';

function formatTime(isoOrMs: string | number | Date): string {
  try {
    const d = new Date(isoOrMs);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

function formatConvTime(isoOrMs: string | number | Date | undefined): string {
  if (!isoOrMs) return '';
  try {
    const d = new Date(isoOrMs);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    if (diff < 604_800_000) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return '';
  }
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-2.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/40"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

function DeliveryIcon({ status }: { status?: 'sent' | 'delivered' | 'read' }) {
  if (status === 'read') return <CheckCheck className="w-3.5 h-3.5 text-violet-400" />;
  if (status === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-white/40" />;
  return <Check className="w-3.5 h-3.5 text-white/40" />;
}

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const {
    conversations,
    messages,
    typingUsers,
    onlineUsers,
    activeConversationId,
    loadConversations,
    loadMessages,
    sendMessage,
    selectConversation,
    leaveConversation,
    sendTyping,
  } = useChatStore();

  const { initiateCall } = useCallStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<any>(null);
  const isTypingRef = useRef(false);

  // Setup sockets and load conversations on mount
  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => () => leaveConversation(), [leaveConversation]);

  // Sync route param with active conversation
  useEffect(() => {
    if (conversationId && conversationId !== activeConversationId) {
      selectConversation(conversationId);
    }
  }, [conversationId, activeConversationId, selectConversation]);

  const currentConversation = conversations.find(
    (c) => c.id === (conversationId ?? activeConversationId)
  );

  const currentMessages = conversationId ? messages[conversationId] || [] : [];

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  const peer = currentConversation?.participant
    ? {
        id: currentConversation.participant.id,
        username: currentConversation.participant.username,
        displayName: currentConversation.participant.displayName,
        profilePhoto: currentConversation.participant.profilePhoto,
        isOnline: onlineUsers.has(currentConversation.participant.id),
      }
    : null;

  const isTypingActive = conversationId ? !!typingUsers[conversationId] : false;

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const name = c.participant?.displayName ?? c.participant?.username ?? '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSelectConv = useCallback(
    (id: string) => {
      selectConversation(id);
      navigate(`/chat/${id}`);
    },
    [selectConversation, navigate]
  );

  const handleSend = useCallback(async () => {
    const text = messageText.trim();
    if (!text || !conversationId || isSending) return;
    setIsSending(true);
    setMessageText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      await sendMessage(conversationId, text);
    } catch (err) {
      setMessageText(text);
      toast.error(err instanceof Error ? err.message : 'Message could not be sent. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [messageText, conversationId, isSending, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessageText(e.target.value);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
      if (!isTypingRef.current && conversationId) {
        isTypingRef.current = true;
        sendTyping(conversationId, true);
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        if (conversationId) sendTyping(conversationId, false);
        isTypingRef.current = false;
      }, 2000);
    },
    [conversationId, sendTyping]
  );

  const handleCallVoice = useCallback(() => {
    if (!peer) return;
    void initiateCall(peer, 'voice').catch((err) => {
      toast.error(err instanceof Error ? err.message : 'Could not start the voice call.');
    });
  }, [peer, initiateCall]);

  const handleCallVideo = useCallback(() => {
    if (!peer) return;
    void initiateCall(peer, 'video').catch((err) => {
      toast.error(err instanceof Error ? err.message : 'Could not start the video call.');
    });
  }, [peer, initiateCall]);

  const handleAttachmentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !conversationId) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('Files must be 25 MB or smaller.');
      return;
    }

    setIsUploadingAttachment(true);
    try {
      const encryptedAttachment = await encryptAttachment(file);
      const uploadFile = new File([encryptedAttachment.blob], 'attachment.pulseenc', {
        type: 'application/octet-stream',
      });
      const uploaded = await api.uploadAttachment(conversationId, uploadFile);
      const isImage = file.type.startsWith('image/');
      await sendMessage(conversationId, '', {
        type: isImage ? 'image' : 'file',
        attachmentUrl: uploaded.url,
        fileName: file.name,
        fileSize: file.size,
        attachmentKey: encryptedAttachment.key,
        attachmentIv: encryptedAttachment.iv,
        attachmentMimeType: file.type || 'application/octet-stream',
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The attachment could not be sent.');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleBlockUser = async () => {
    if (!peer) return;
    if (confirm(`Are you sure you want to block @${peer.username}?`)) {
      try {
        await api.blockUser(peer.id);
        navigate('/chat');
        await loadConversations();
      } catch (err: any) {
        alert(err.message || 'Failed to block user');
      }
    }
  };

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[#030303]">
      {/* ── LEFT SIDEBAR ── */}
      <aside
        className={`
          w-80 flex-shrink-0 flex flex-col border-r border-white/[0.07] bg-[#090909]/90 backdrop-blur-xl
          ${conversationId ? 'hidden md:flex' : 'flex'}
        `}
      >
        <div className="p-4 border-b border-white/[0.07]">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-semibold text-white tracking-tight">Messages</h1>
            <button
              onClick={() => navigate('/contacts')}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="New Conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 px-4 text-center">
              <Users className="w-8 h-8 text-white/20 mb-2" />
              <p className="text-xs text-white/40">No conversations yet</p>
              <button
                onClick={() => navigate('/contacts')}
                className="mt-3 text-xs text-violet-400 hover:text-violet-300 font-medium"
              >
                Find contacts
              </button>
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {filteredConversations.map((conv) => {
                const isActive = conv.id === conversationId;
                const convPeer = conv.participant;
                const isOnline = convPeer ? onlineUsers.has(convPeer.id) : false;

                return (
                  <li key={conv.id}>
                    <button
                      onClick={() => handleSelectConv(conv.id)}
                      className={`
                        w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all
                        ${isActive ? 'bg-violet-600/20 border border-violet-500/30' : 'hover:bg-white/5 border border-transparent'}
                      `}
                    >
                      <UserAvatar
                        username={convPeer?.username}
                        displayName={convPeer?.displayName}
                        photoUrl={convPeer?.profilePhoto}
                        size="sm"
                        isOnline={isOnline}
                        showStatus
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-medium text-white truncate">
                            {convPeer?.displayName || convPeer?.username || 'Unknown'}
                          </span>
                          <span className="text-[10px] text-white/30 flex-shrink-0">
                            {formatConvTime(conv.lastMessageAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <p className="text-[11px] text-white/40 truncate">
                            {conv.lastMessage ? '[Message]' : 'Start conversation'}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-violet-600 text-[10px] font-semibold text-white">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ── CENTER PANEL ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent">
        {!conversationId || !currentConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Select a conversation</h2>
            <p className="text-xs text-white/40 max-w-sm leading-relaxed">
              Choose a conversation to start messaging.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-white/[0.07] bg-[#090909]/80 backdrop-blur-md">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => navigate('/chat')}
                  className="md:hidden p-1 text-white/50 hover:text-white"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <UserAvatar
                  username={peer?.username}
                  displayName={peer?.displayName}
                  photoUrl={peer?.profilePhoto}
                  size="sm"
                  isOnline={peer?.isOnline}
                  showStatus
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">
                      {peer?.displayName || peer?.username}
                    </span>
                    <span className="text-xs text-white/40 truncate">@{peer?.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <OnlineIndicator isOnline={!!peer?.isOnline} size="sm" showText />
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Conversation
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleCallVoice}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-violet-400 transition-colors"
                  title="VoicePulse"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCallVideo}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-cyan-400 transition-colors"
                  title="VisualPulse"
                >
                  <Video className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRightPanelOpen(!rightPanelOpen)}
                  className={`p-2 rounded-xl transition-colors ${
                    rightPanelOpen ? 'bg-violet-600/20 text-violet-400' : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                  title="Contact Information"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${rightPanelOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
              {currentMessages.map((msg) => {
                const isMine = user && (msg.senderId === user.id);
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMine && (
                      <UserAvatar
                        username={peer?.username}
                        displayName={peer?.displayName}
                        photoUrl={peer?.profilePhoto}
                        size="xs"
                      />
                    )}
                    <div className={`max-w-[72%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`
                          rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                          ${isMine ? 'bg-violet-600/40 text-white rounded-br-sm border border-violet-500/20' : 'bg-[#181818]/90 text-white/90 rounded-bl-sm border border-white/10'}
                          ${msg.isDecryptionFailed ? 'border-red-500/50 bg-red-950/20 text-red-300' : ''}
                        `}
                      >
                        {msg.isDecryptionFailed ? (
                          <div className="flex items-center gap-2 text-xs">
                            <Shield className="w-3.5 h-3.5 text-red-400" />
                            <span>Unable to display this message</span>
                          </div>
                        ) : (
                          <>
                            {msg.attachmentUrl && msg.type === 'image' && (
                              <DecryptedAttachment
                                url={msg.attachmentUrl}
                                type="image"
                                fileName={msg.fileName}
                                fileSize={msg.fileSize}
                                keyBase64={msg.attachmentKey}
                                ivBase64={msg.attachmentIv}
                                mimeType={msg.attachmentMimeType}
                              />
                            )}
                            {msg.attachmentUrl && msg.type === 'file' && (
                              <DecryptedAttachment
                                url={msg.attachmentUrl}
                                type="file"
                                fileName={msg.fileName}
                                fileSize={msg.fileSize}
                                keyBase64={msg.attachmentKey}
                                ivBase64={msg.attachmentIv}
                                mimeType={msg.attachmentMimeType}
                              />
                            )}
                            {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                          </>
                        )}
                      </div>
                      <div className={`flex items-center gap-1.5 mt-1 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[10px] text-white/30">{formatTime(msg.timestamp || msg.createdAt)}</span>
                        {msg.isVerifiedSignature && (
                          <span title="Verified sender">
                            <Lock className="w-2.5 h-2.5 text-emerald-400/70" />
                          </span>
                        )}
                        {isMine && <DeliveryIcon status={msg.deliveryStatus} />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTypingActive && (
                <div className="flex items-center gap-2">
                  <UserAvatar
                    username={peer?.username}
                    displayName={peer?.displayName}
                    photoUrl={peer?.profilePhoto}
                    size="xs"
                  />
                  <div className="bg-[#181818]/80 rounded-xl px-2 py-1 border border-white/5">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="p-3 border-t border-white/[0.07] bg-[#090909]/80 backdrop-blur-md">
              <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 focus-within:border-violet-500/50 transition-colors">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAttachment}
                  className="p-1.5 text-white/40 hover:text-white disabled:opacity-40 transition-colors"
                  title={isUploadingAttachment ? 'Uploading attachment' : 'Attach image or file'}
                >
                  <Paperclip className={`w-4 h-4 ${isUploadingAttachment ? 'animate-pulse' : ''}`} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleAttachmentChange}
                  disabled={isUploadingAttachment}
                />

                <textarea
                  ref={textareaRef}
                  value={messageText}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/30 resize-none focus:outline-none max-h-32 py-1"
                />

                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || isSending}
                  className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-all shadow-md shadow-violet-600/30"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── RIGHT PANEL (Collapsible) ── */}
      <AnimatePresence>
        {rightPanelOpen && peer && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-l border-white/[0.07] bg-[#090909]/95 backdrop-blur-xl overflow-y-auto"
          >
            <div className="p-5 flex flex-col items-center text-center border-b border-white/[0.07]">
              <UserAvatar
                username={peer.username}
                displayName={peer.displayName}
                photoUrl={peer.profilePhoto}
                size="lg"
                className="mb-3"
              />
              <h3 className="text-base font-semibold text-white">{peer.displayName}</h3>
              <p className="text-xs text-white/40">@{peer.username}</p>
              <div className="mt-2">
                <OnlineIndicator isOnline={peer.isOnline} size="sm" showText />
              </div>
            </div>

            <div className="p-4 space-y-4">
              <button
                onClick={handleBlockUser}
                className="w-full py-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-xs font-medium text-red-400 flex items-center justify-center gap-2 transition-colors"
              >
                <Ban className="w-3.5 h-3.5" /> Block Contact
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
