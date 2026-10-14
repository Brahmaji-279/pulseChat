export interface User {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  profilePhoto?: string;
  biography?: string;
  accountStatus?: 'active' | 'suspended' | 'deleted';
  privacySettings?: {
    presenceVisibility: 'everyone' | 'contacts' | 'nobody';
    lastActiveVisibility: 'everyone' | 'contacts' | 'nobody';
    callPermissions: 'everyone' | 'contacts' | 'nobody';
  };
  lastActiveAt?: string;
  fingerprint?: string | null;
  createdAt?: string;
}

export interface ConversationParticipant {
  id: string;
  username: string;
  displayName: string;
  profilePhoto?: string;
  lastActiveAt?: string;
  keys?: {
    keyId: string;
    algorithm: string;
    fingerprint: string;
    createdAt: string;
  }[];
}

export interface Conversation {
  id: string;
  conversationType: 'direct' | 'group';
  participant: ConversationParticipant | null;
  lastMessage?: {
    lastMessageId: string;
    senderId: string;
    createdAt: string;
    deliveryStatus: 'sent' | 'delivered' | 'read';
    protocolVersion: string;
  } | null;
  unreadCount: number;
  lastMessageAt: string;
  updatedAt?: string;
}

export interface DecryptedMessage {
  id: string;
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  type?: 'text' | 'image' | 'file';
  attachmentUrl?: string;
  fileName?: string;
  fileSize?: number;
  attachmentKey?: string;
  attachmentIv?: string;
  attachmentMimeType?: string;
  deliveryStatus: 'sent' | 'delivered' | 'read';
  timestamp: number;
  createdAt: string;
  protocolVersion: string;
  isVerifiedSignature: boolean;
  isDecryptionFailed?: boolean;
}

export interface CallLog {
  id: string;
  callType: 'voice' | 'video';
  status: 'initiated' | 'ringing' | 'accepted' | 'declined' | 'missed' | 'ended';
  duration: number;
  isOutgoing: boolean;
  participant: {
    _id: string;
    username: string;
    displayName: string;
    profilePhoto?: string;
  };
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface ContactItem {
  contactId: string;
  user: User;
  createdAt: string;
}
