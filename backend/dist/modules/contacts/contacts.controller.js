"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContacts = getContacts;
exports.sendContactRequest = sendContactRequest;
exports.getContactRequests = getContactRequests;
exports.respondContactRequest = respondContactRequest;
exports.deleteContact = deleteContact;
exports.blockUser = blockUser;
exports.unblockUser = unblockUser;
exports.getBlockedUsers = getBlockedUsers;
const mongoose_1 = require("mongoose");
const Contact_js_1 = require("../../models/Contact.js");
const BlockedUser_js_1 = require("../../models/BlockedUser.js");
const User_js_1 = require("../../models/User.js");
const PublicKey_js_1 = require("../../models/PublicKey.js");
async function getContacts(req, res) {
    const userId = req.user?._id;
    const contacts = await Contact_js_1.Contact.find({
        $or: [{ requesterId: userId }, { recipientId: userId }],
        status: 'accepted',
    }).populate('requesterId recipientId', 'username displayName profilePhoto biography lastActiveAt');
    const contactList = contacts.map((c) => {
        const isRequester = c.requesterId._id.toString() === userId?.toString();
        const otherUser = isRequester ? c.recipientId : c.requesterId;
        return {
            contactId: c._id,
            user: {
                id: otherUser._id,
                username: otherUser.username,
                displayName: otherUser.displayName,
                profilePhoto: otherUser.profilePhoto,
                biography: otherUser.biography,
                lastActiveAt: otherUser.lastActiveAt,
            },
            createdAt: c.createdAt,
        };
    });
    // Attach ML-DSA public key fingerprint for verified identity
    const userIds = contactList.map((c) => c.user.id);
    const keys = await PublicKey_js_1.PublicKey.find({
        userId: { $in: userIds },
        algorithm: 'ML-DSA-65',
        isCurrent: true,
    });
    const keyMap = new Map();
    keys.forEach((k) => keyMap.set(k.userId.toString(), k.fingerprint));
    const enriched = contactList.map((c) => ({
        ...c,
        user: {
            ...c.user,
            fingerprint: keyMap.get(c.user.id.toString()) || null,
        },
    }));
    res.json({ success: true, contacts: enriched });
}
async function sendContactRequest(req, res) {
    const currentUserId = req.user?._id;
    const { recipientId, recipientUsername } = req.body;
    let targetUserId = recipientId;
    if (!targetUserId && recipientUsername) {
        const targetUser = await User_js_1.User.findOne({
            normalizedUsername: recipientUsername.toLowerCase().trim(),
        });
        if (!targetUser) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        targetUserId = targetUser._id;
    }
    if (!targetUserId) {
        res.status(400).json({ success: false, error: 'Target user is required' });
        return;
    }
    if (targetUserId.toString() === currentUserId?.toString()) {
        res.status(400).json({ success: false, error: 'Cannot add yourself as contact' });
        return;
    }
    // Check if either user has blocked the other
    const isBlocked = await BlockedUser_js_1.BlockedUser.findOne({
        $or: [
            { blockerId: currentUserId, blockedUserId: targetUserId },
            { blockerId: targetUserId, blockedUserId: currentUserId },
        ],
    });
    if (isBlocked) {
        res.status(403).json({ success: false, error: 'Operation prohibited' });
        return;
    }
    // Check existing contact or request
    const existing = await Contact_js_1.Contact.findOne({
        $or: [
            { requesterId: currentUserId, recipientId: targetUserId },
            { requesterId: targetUserId, recipientId: currentUserId },
        ],
    });
    if (existing) {
        if (existing.status === 'accepted') {
            res.status(400).json({ success: false, error: 'User is already in your contacts' });
            return;
        }
        if (existing.status === 'pending') {
            res.status(400).json({ success: false, error: 'A contact request is already pending' });
            return;
        }
    }
    let newRequest;
    try {
        newRequest = await Contact_js_1.Contact.create({
            requesterId: currentUserId,
            recipientId: targetUserId,
            status: 'pending',
        });
    }
    catch (error) {
        if (typeof error !== 'object' ||
            error === null ||
            !('code' in error) ||
            error.code !== 11000) {
            throw error;
        }
        const duplicate = await Contact_js_1.Contact.findOne({
            requesterId: currentUserId,
            recipientId: targetUserId,
        });
        if (!duplicate) {
            throw error;
        }
        const message = duplicate.status === 'accepted'
            ? 'User is already in your contacts'
            : duplicate.status === 'pending'
                ? 'A contact request is already pending'
                : 'A previous contact request was rejected';
        res.status(400).json({ success: false, error: message });
        return;
    }
    res.status(201).json({
        success: true,
        request: newRequest,
        message: 'Contact request sent successfully',
    });
}
async function getContactRequests(req, res) {
    const userId = req.user?._id;
    const incoming = await Contact_js_1.Contact.find({
        recipientId: userId,
        status: 'pending',
    }).populate('requesterId', 'username displayName profilePhoto');
    const outgoing = await Contact_js_1.Contact.find({
        requesterId: userId,
        status: 'pending',
    }).populate('recipientId', 'username displayName profilePhoto');
    res.json({
        success: true,
        incoming: incoming.map((r) => ({
            _id: r._id,
            id: r._id,
            requester: r.requesterId,
            user: r.requesterId,
            createdAt: r.createdAt,
        })),
        outgoing: outgoing.map((r) => ({
            _id: r._id,
            id: r._id,
            recipient: r.recipientId,
            user: r.recipientId,
            createdAt: r.createdAt,
        })),
    });
}
async function respondContactRequest(req, res) {
    const userId = req.user?._id;
    const requestId = req.params.id;
    const { action } = req.body; // 'accept' or 'reject'
    if (!['accept', 'reject'].includes(action)) {
        res.status(400).json({ success: false, error: 'Action must be accept or reject' });
        return;
    }
    if (!requestId || !mongoose_1.Types.ObjectId.isValid(requestId)) {
        res.status(400).json({ success: false, error: 'Invalid contact request ID' });
        return;
    }
    const request = await Contact_js_1.Contact.findOne({
        _id: requestId,
        recipientId: userId,
        status: 'pending',
    });
    if (!request) {
        res.status(404).json({ success: false, error: 'Contact request not found or unauthorized' });
        return;
    }
    if (action === 'accept') {
        request.status = 'accepted';
        await request.save();
        res.json({ success: true, message: 'Contact request accepted' });
    }
    else {
        request.status = 'rejected';
        await request.save();
        res.json({ success: true, message: 'Contact request rejected' });
    }
}
async function deleteContact(req, res) {
    const userId = req.user?._id;
    const contactId = req.params.id;
    const deleted = await Contact_js_1.Contact.findOneAndDelete({
        _id: contactId,
        $or: [{ requesterId: userId }, { recipientId: userId }],
    });
    if (!deleted) {
        res.status(404).json({ success: false, error: 'Contact not found' });
        return;
    }
    res.json({ success: true, message: 'Contact removed' });
}
async function blockUser(req, res) {
    const blockerId = req.user?._id;
    const blockedUserId = req.params.id;
    if (blockerId?.toString() === blockedUserId) {
        res.status(400).json({ success: false, error: 'Cannot block yourself' });
        return;
    }
    // Remove any existing contact
    await Contact_js_1.Contact.deleteMany({
        $or: [
            { requesterId: blockerId, recipientId: blockedUserId },
            { requesterId: blockedUserId, recipientId: blockerId },
        ],
    });
    await BlockedUser_js_1.BlockedUser.findOneAndUpdate({ blockerId, blockedUserId: new mongoose_1.Types.ObjectId(blockedUserId) }, { blockerId, blockedUserId: new mongoose_1.Types.ObjectId(blockedUserId) }, { upsert: true });
    res.json({ success: true, message: 'User blocked' });
}
async function unblockUser(req, res) {
    const blockerId = req.user?._id;
    const blockedUserId = req.params.id;
    await BlockedUser_js_1.BlockedUser.findOneAndDelete({
        blockerId,
        blockedUserId: new mongoose_1.Types.ObjectId(blockedUserId),
    });
    res.json({ success: true, message: 'User unblocked' });
}
async function getBlockedUsers(req, res) {
    const blockerId = req.user?._id;
    const blocked = await BlockedUser_js_1.BlockedUser.find({ blockerId }).populate('blockedUserId', 'username displayName profilePhoto');
    res.json({
        success: true,
        blocked: blocked.map((b) => b.blockedUserId),
    });
}
