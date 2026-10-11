"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversations = getConversations;
exports.createOrGetDirectConversation = createOrGetDirectConversation;
exports.getConversationById = getConversationById;
const mongoose_1 = require("mongoose");
const Conversation_js_1 = require("../../models/Conversation.js");
const Message_js_1 = require("../../models/Message.js");
const User_js_1 = require("../../models/User.js");
const BlockedUser_js_1 = require("../../models/BlockedUser.js");
const PublicKey_js_1 = require("../../models/PublicKey.js");
async function getConversations(req, res) {
    const userId = req.user?._id;
    const conversations = await Conversation_js_1.Conversation.find({
        participantIds: userId,
    })
        .sort({ lastMessageAt: -1 })
        .populate('participantIds', 'username displayName profilePhoto lastActiveAt');
    // Gather latest message for each conversation
    const convIds = conversations.map((c) => c._id);
    const latestMessages = await Message_js_1.Message.aggregate([
        { $match: { conversationId: { $in: convIds } } },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: '$conversationId',
                lastMessageId: { $first: '$messageId' },
                senderId: { $first: '$senderId' },
                createdAt: { $first: '$createdAt' },
                deliveryStatus: { $first: '$deliveryStatus' },
                protocolVersion: { $first: '$protocolVersion' },
            },
        },
    ]);
    // Count unread messages for current user
    const unreadCounts = await Message_js_1.Message.aggregate([
        {
            $match: {
                conversationId: { $in: convIds },
                recipientId: userId,
                deliveryStatus: { $ne: 'read' },
            },
        },
        { $group: { _id: '$conversationId', count: { $sum: 1 } } },
    ]);
    const latestMap = new Map(latestMessages.map((m) => [m._id.toString(), m]));
    const unreadMap = new Map(unreadCounts.map((u) => [u._id.toString(), u.count]));
    const result = conversations.map((c) => {
        const otherParticipant = c.participantIds.find((p) => p._id.toString() !== userId?.toString());
        return {
            id: c._id,
            conversationType: c.conversationType,
            participant: otherParticipant
                ? {
                    id: otherParticipant._id,
                    username: otherParticipant.username,
                    displayName: otherParticipant.displayName,
                    profilePhoto: otherParticipant.profilePhoto,
                    lastActiveAt: otherParticipant.lastActiveAt,
                }
                : null,
            lastMessage: latestMap.get(c._id.toString()) || null,
            unreadCount: unreadMap.get(c._id.toString()) || 0,
            updatedAt: c.updatedAt,
            lastMessageAt: c.lastMessageAt,
        };
    });
    res.json({ success: true, conversations: result });
}
async function createOrGetDirectConversation(req, res) {
    const currentUserId = req.user?._id;
    const { recipientUsername, recipientId } = req.body;
    let targetUserId = recipientId;
    if (!targetUserId && recipientUsername) {
        const recipient = await User_js_1.User.findOne({
            normalizedUsername: recipientUsername.toLowerCase().trim(),
        });
        if (!recipient) {
            res.status(404).json({ success: false, error: 'Recipient not found' });
            return;
        }
        targetUserId = recipient._id;
    }
    if (!targetUserId) {
        res.status(400).json({ success: false, error: 'Recipient is required' });
        return;
    }
    if (targetUserId.toString() === currentUserId?.toString()) {
        res.status(400).json({ success: false, error: 'Cannot start conversation with yourself' });
        return;
    }
    // Check if either user is blocked
    const isBlocked = await BlockedUser_js_1.BlockedUser.findOne({
        $or: [
            { blockerId: currentUserId, blockedUserId: targetUserId },
            { blockerId: targetUserId, blockedUserId: currentUserId },
        ],
    });
    if (isBlocked) {
        res.status(403).json({ success: false, error: 'Cannot create conversation with blocked user' });
        return;
    }
    // Check if conversation already exists between these 2 users
    let conversation = await Conversation_js_1.Conversation.findOne({
        conversationType: 'direct',
        participantIds: { $all: [currentUserId, targetUserId], $size: 2 },
    }).populate('participantIds', 'username displayName profilePhoto lastActiveAt');
    if (!conversation) {
        conversation = await Conversation_js_1.Conversation.create({
            participantIds: [currentUserId, new mongoose_1.Types.ObjectId(targetUserId)],
            conversationType: 'direct',
            lastMessageAt: new Date(),
        });
        conversation = await conversation.populate('participantIds', 'username displayName profilePhoto lastActiveAt');
    }
    const otherParticipant = conversation.participantIds.find((p) => p._id.toString() !== currentUserId?.toString());
    res.json({
        success: true,
        conversation: {
            id: conversation._id,
            conversationType: conversation.conversationType,
            participant: otherParticipant
                ? {
                    id: otherParticipant._id,
                    username: otherParticipant.username,
                    displayName: otherParticipant.displayName,
                    profilePhoto: otherParticipant.profilePhoto,
                    lastActiveAt: otherParticipant.lastActiveAt,
                }
                : null,
            lastMessageAt: conversation.lastMessageAt,
        },
    });
}
async function getConversationById(req, res) {
    const userId = req.user?._id;
    const conversationId = req.params.id;
    const conversation = await Conversation_js_1.Conversation.findOne({
        _id: conversationId,
        participantIds: userId,
    }).populate('participantIds', 'username displayName profilePhoto lastActiveAt');
    if (!conversation) {
        res.status(404).json({ success: false, error: 'Conversation not found or access denied' });
        return;
    }
    const otherParticipant = conversation.participantIds.find((p) => p._id.toString() !== userId?.toString());
    // Fetch cryptographic identity info for recipient
    let recipientKeys = null;
    if (otherParticipant) {
        const keys = await PublicKey_js_1.PublicKey.find({
            userId: otherParticipant._id,
            isCurrent: true,
        }).select('keyId algorithm fingerprint keyVersion createdAt');
        recipientKeys = keys;
    }
    res.json({
        success: true,
        conversation: {
            id: conversation._id,
            conversationType: conversation.conversationType,
            participant: otherParticipant
                ? {
                    id: otherParticipant._id,
                    username: otherParticipant.username,
                    displayName: otherParticipant.displayName,
                    profilePhoto: otherParticipant.profilePhoto,
                    lastActiveAt: otherParticipant.lastActiveAt,
                    keys: recipientKeys,
                }
                : null,
            lastMessageAt: conversation.lastMessageAt,
            createdAt: conversation.createdAt,
        },
    });
}
