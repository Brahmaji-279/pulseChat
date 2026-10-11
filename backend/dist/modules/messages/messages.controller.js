"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEncryptedMessageSchema = void 0;
exports.getConversationMessages = getConversationMessages;
exports.sendEncryptedMessage = sendEncryptedMessage;
exports.updateMessageStatus = updateMessageStatus;
exports.deleteMessage = deleteMessage;
const zod_1 = require("zod");
const mongoose_1 = require("mongoose");
const Message_js_1 = require("../../models/Message.js");
const Conversation_js_1 = require("../../models/Conversation.js");
const BlockedUser_js_1 = require("../../models/BlockedUser.js");
exports.sendEncryptedMessageSchema = zod_1.z.object({
    messageId: zod_1.z.string().min(10).max(100),
    recipientId: zod_1.z.string().min(1),
    protocolVersion: zod_1.z.literal('pulse-v1-mlkem768-mldsa65'),
    encryptedEnvelope: zod_1.z.object({
        protocolVersion: zod_1.z.literal('pulse-v1-mlkem768-mldsa65'),
        conversationId: zod_1.z.string().min(1),
        messageId: zod_1.z.string().min(10).max(100),
        senderId: zod_1.z.string().min(1),
        recipientId: zod_1.z.string().min(1),
        senderKeyId: zod_1.z.string().min(1),
        recipientKeyId: zod_1.z.string().min(1),
        keyEncapsulationCiphertext: zod_1.z.string().min(10), // Base64
        nonce: zod_1.z.string().min(10), // Base64
        ciphertext: zod_1.z.string().min(1), // Base64
        tag: zod_1.z.string().min(1), // Base64
        signatureAlgorithm: zod_1.z.literal('ML-DSA-65'),
        signature: zod_1.z.string().min(10), // Base64
        timestamp: zod_1.z.number().int().positive(),
    }),
}).superRefine((body, ctx) => {
    if (body.encryptedEnvelope.messageId !== body.messageId) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['encryptedEnvelope', 'messageId'],
            message: 'Envelope message ID does not match message ID',
        });
    }
    if (body.encryptedEnvelope.recipientId !== body.recipientId) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['encryptedEnvelope', 'recipientId'],
            message: 'Envelope recipient ID does not match recipient ID',
        });
    }
});
async function getConversationMessages(req, res) {
    const userId = req.user?._id;
    const conversationId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const before = req.query.before;
    // Verify user is in conversation
    const conv = await Conversation_js_1.Conversation.findOne({
        _id: conversationId,
        participantIds: userId,
    });
    if (!conv) {
        res.status(404).json({ success: false, error: 'Conversation not found or access denied' });
        return;
    }
    const query = { conversationId };
    if (before) {
        query.createdAt = { $lt: new Date(before) };
    }
    const messages = await Message_js_1.Message.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('_id messageId conversationId senderId recipientId protocolVersion encryptedEnvelope deliveryStatus deliveredAt readAt createdAt');
    res.json({
        success: true,
        messages: messages.reverse(),
    });
}
async function sendEncryptedMessage(req, res) {
    const currentUserId = req.user?._id;
    if (!currentUserId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
    }
    const conversationId = req.params.id;
    const { messageId, recipientId, protocolVersion, encryptedEnvelope } = req.body;
    if (encryptedEnvelope.protocolVersion !== protocolVersion ||
        encryptedEnvelope.conversationId !== conversationId ||
        encryptedEnvelope.messageId !== messageId ||
        encryptedEnvelope.senderId !== currentUserId.toString() ||
        encryptedEnvelope.recipientId !== recipientId) {
        res.status(400).json({ success: false, error: 'Message envelope metadata is inconsistent' });
        return;
    }
    // Verify conversation
    const conversation = await Conversation_js_1.Conversation.findById(conversationId);
    if (!conversation || !conversation.participantIds.some((participantId) => participantId.equals(currentUserId))) {
        res.status(404).json({ success: false, error: 'Conversation not found or unauthorized' });
        return;
    }
    const actualRecipientId = conversation.participantIds
        .find((participantId) => !participantId.equals(currentUserId))
        ?.toString();
    if (!actualRecipientId || actualRecipientId !== recipientId) {
        res.status(400).json({ success: false, error: 'Recipient does not belong to this conversation' });
        return;
    }
    // Check blocking
    const isBlocked = await BlockedUser_js_1.BlockedUser.findOne({
        $or: [
            { blockerId: currentUserId, blockedUserId: actualRecipientId },
            { blockerId: actualRecipientId, blockedUserId: currentUserId },
        ],
    });
    if (isBlocked) {
        res.status(403).json({ success: false, error: 'Cannot send messages to this user' });
        return;
    }
    // Replay check
    const duplicate = await Message_js_1.Message.findOne({ messageId });
    if (duplicate) {
        if (duplicate.senderId.toString() === currentUserId.toString() &&
            duplicate.recipientId.toString() === actualRecipientId &&
            duplicate.conversationId.toString() === conversationId) {
            res.status(200).json({ success: true, message: duplicate });
            return;
        }
        res.status(409).json({ success: false, error: 'Duplicate message submission rejected' });
        return;
    }
    const createdMessage = await Message_js_1.Message.create({
        conversationId: new mongoose_1.Types.ObjectId(conversationId),
        senderId: currentUserId,
        recipientId: new mongoose_1.Types.ObjectId(actualRecipientId),
        messageId,
        protocolVersion,
        encryptedEnvelope,
        deliveryStatus: 'sent',
    });
    conversation.lastMessageAt = new Date();
    await conversation.save();
    res.status(201).json({
        success: true,
        message: createdMessage,
    });
}
async function updateMessageStatus(req, res) {
    const userId = req.user?._id;
    const messageId = req.params.id;
    const { status } = req.body; // 'delivered' or 'read'
    if (!['delivered', 'read'].includes(status)) {
        res.status(400).json({ success: false, error: 'Invalid message status' });
        return;
    }
    const updateFields = { deliveryStatus: status };
    if (status === 'delivered')
        updateFields.deliveredAt = new Date();
    if (status === 'read')
        updateFields.readAt = new Date();
    const updated = await Message_js_1.Message.findOneAndUpdate({
        _id: messageId,
        recipientId: userId, // Only the intended recipient can report delivery or read status
    }, updateFields, { new: true });
    if (!updated) {
        res.status(404).json({ success: false, error: 'Message not found or unauthorized' });
        return;
    }
    res.json({ success: true, message: updated });
}
async function deleteMessage(req, res) {
    const userId = req.user?._id;
    const messageId = req.params.id;
    const deleted = await Message_js_1.Message.findOneAndDelete({
        _id: messageId,
        senderId: userId, // Only sender can delete for everyone
    });
    if (!deleted) {
        res.status(404).json({ success: false, error: 'Message not found or unauthorized' });
        return;
    }
    res.json({ success: true, message: 'Message deleted' });
}
