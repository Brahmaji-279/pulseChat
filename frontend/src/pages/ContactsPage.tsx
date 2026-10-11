import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, UserPlus, Users, Check, X, Ban, MessageSquare, Phone,
  UserCheck, Loader2, Clock
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useChatStore } from '../store/chatStore.js';
import { api } from '../services/api.js';
import { UserAvatar } from '../components/UserAvatar.js';
import { OnlineIndicator } from '../components/OnlineIndicator.js';
import { GlassPanel } from '../components/GlassPanel.js';
import { AnimatedBackground } from '../components/AnimatedBackground.js';
import type { User, ContactItem } from '../types/index.js';

type Tab = 'contacts' | 'requests' | 'blocked';

export default function ContactsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { onlineUsers, startConversationWithUser } = useChatStore();

  const [activeTab, setActiveTab] = useState<Tab>('contacts');
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load contacts and requests
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [contactsRes, requestsRes] = await Promise.all([
        api.getContacts(),
        api.getContactRequests(),
      ]);
      setContacts(contactsRes.contacts || []);
      setIncoming(requestsRes.incoming || []);
      setOutgoing(requestsRes.outgoing || []);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.searchUsers(searchQuery.trim());
        setSearchResults(res.users || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSendRequest = async (recipientId: string) => {
    setActionLoading(recipientId);
    try {
      await api.sendContactRequest({ recipientId });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to send request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRespond = async (id: string, action: 'accept' | 'reject') => {
    setActionLoading(id);
    try {
      await api.respondContactRequest(id, action);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to respond');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMessage = async (contactUser: User) => {
    const convId = await startConversationWithUser(contactUser);
    navigate(`/chat/${convId}`);
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'contacts', label: 'Contacts', count: contacts.length },
    { key: 'requests', label: 'Requests', count: incoming.length },
    { key: 'blocked', label: 'Blocked' },
  ];

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Users size={22} className="text-violet-400" />
            Contacts
          </h1>
          <p className="text-sm text-white/40 mt-1">Manage your contacts and connection requests</p>
        </motion.div>

        {/* Search */}
        <GlassPanel className="p-4 mb-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by username..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
            />
            {isSearching && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 animate-spin" />
            )}
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-white/40 font-medium px-1">Search results</p>
              {searchResults.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/[0.07]">
                  <div className="flex items-center gap-3">
                    <UserAvatar username={u.username} displayName={u.displayName} photoUrl={u.profilePhoto} size="sm" isOnline={onlineUsers.has(u.id)} showStatus />
                    <div>
                      <p className="text-sm font-medium text-white/90">{u.displayName || u.username}</p>
                      <p className="text-xs text-white/40">@{u.username}</p>
                    </div>
                  </div>
                  {u.id !== user?.id && (
                    <button
                      onClick={() => handleSendRequest(u.id)}
                      disabled={actionLoading === u.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 text-xs font-medium transition-all border border-violet-500/20"
                    >
                      {actionLoading === u.id ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                      Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassPanel>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.07] mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-violet-600/30 text-violet-300 border border-violet-500/30'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-violet-500/40 text-violet-200' : 'bg-white/10 text-white/50'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-violet-400 animate-spin" />
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            {activeTab === 'contacts' && (
              <>
                {contacts.length === 0 ? (
                  <GlassPanel className="p-12 text-center">
                    <Users size={36} className="mx-auto text-white/20 mb-3" />
                    <p className="text-white/50 text-sm">No contacts yet</p>
                    <p className="text-white/30 text-xs mt-1">Search for users above to add them</p>
                  </GlassPanel>
                ) : (
                  contacts.map((c) => (
                    <GlassPanel key={c.contactId} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          username={c.user.username}
                          displayName={c.user.displayName}
                          photoUrl={c.user.profilePhoto}
                          size="md"
                          isOnline={onlineUsers.has(c.user.id)}
                          showStatus
                        />
                        <div>
                          <p className="text-sm font-medium text-white/90">{c.user.displayName || c.user.username}</p>
                          <p className="text-xs text-white/40">@{c.user.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMessage(c.user)}
                          className="p-2 rounded-lg text-white/50 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                          title="Send message"
                        >
                          <MessageSquare size={15} />
                        </button>
                      </div>
                    </GlassPanel>
                  ))
                )}
              </>
            )}

            {activeTab === 'requests' && (
              <>
                {incoming.length === 0 && outgoing.length === 0 ? (
                  <GlassPanel className="p-12 text-center">
                    <UserCheck size={36} className="mx-auto text-white/20 mb-3" />
                    <p className="text-white/50 text-sm">No pending requests</p>
                  </GlassPanel>
                ) : (
                  <>
                    {incoming.length > 0 && (
                      <div>
                        <p className="text-xs text-white/40 font-medium mb-2 px-1">Incoming</p>
                        {incoming.map((r) => {
                          const reqId = r._id || r.id;
                          const requester = r.requester || r.user;
                          return (
                            <GlassPanel key={reqId} className="p-3 flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <UserAvatar username={requester?.username} displayName={requester?.displayName} size="sm" />
                                <div>
                                  <p className="text-sm font-medium text-white/90">{requester?.displayName || requester?.username}</p>
                                  <p className="text-xs text-white/40">@{requester?.username}</p>
                                </div>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleRespond(reqId, 'accept')}
                                  disabled={actionLoading === reqId}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-medium border border-emerald-500/20 transition-all"
                                >
                                  {actionLoading === reqId ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Accept
                                </button>
                                <button
                                  onClick={() => handleRespond(reqId, 'reject')}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 text-xs font-medium border border-red-500/15 transition-all"
                                >
                                  <X size={11} /> Decline
                                </button>
                              </div>
                            </GlassPanel>
                          );
                        })}
                      </div>
                    )}
                    {outgoing.length > 0 && (
                      <div>
                        <p className="text-xs text-white/40 font-medium mb-2 px-1 mt-4">Outgoing</p>
                        {outgoing.map((r) => {
                          const reqId = r._id || r.id;
                          const recipient = r.recipient || r.user;
                          return (
                            <GlassPanel key={reqId} className="p-3 flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <UserAvatar username={recipient?.username} displayName={recipient?.displayName} size="sm" />
                                <div>
                                  <p className="text-sm font-medium text-white/90">{recipient?.displayName || recipient?.username}</p>
                                  <p className="text-xs text-white/40">@{recipient?.username}</p>
                                </div>
                              </div>
                              <span className="text-xs text-amber-400/70 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg flex items-center gap-1">
                                <Clock size={10} /> Pending
                              </span>
                            </GlassPanel>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {activeTab === 'blocked' && (
              <GlassPanel className="p-12 text-center">
                <Ban size={36} className="mx-auto text-white/20 mb-3" />
                <p className="text-white/50 text-sm">No blocked users</p>
                <p className="text-white/30 text-xs mt-1">Blocked users cannot contact you or see your status</p>
              </GlassPanel>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
