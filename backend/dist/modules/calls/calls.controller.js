"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logCallSchema = void 0;
exports.logCall = logCall;
exports.getCallHistory = getCallHistory;
exports.updateCallStatus = updateCallStatus;
const zod_1 = require("zod");
const mongoose_1 = require("mongoose");
const Call_js_1 = require("../../models/Call.js");
const BlockedUser_js_1 = require("../../models/BlockedUser.js");
exports.logCallSchema = zod_1.z.object({
    recipientId: zod_1.z.string().min(1),
    callType: zod_1.z.enum(['voice', 'video']),
    status: zod_1.z.enum(['initiated', 'ringing', 'accepted', 'declined', 'missed', 'ended']).default('initiated'),
    duration: zod_1.z.number().int().nonnegative().default(0),
});
async function logCall(req, res) {
    const initiatorId = req.user?._id;
    if (!initiatorId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
    }
    const { recipientId, callType, status, duration } = req.body;
    // Block check
    const isBlocked = await BlockedUser_js_1.BlockedUser.findOne({
        $or: [
            { blockerId: initiatorId, blockedUserId: recipientId },
            { blockerId: recipientId, blockedUserId: initiatorId },
        ],
    });
    if (isBlocked) {
        res.status(403).json({ success: false, error: 'Call prohibited' });
        return;
    }
    const call = await Call_js_1.Call.create({
        initiatorId,
        recipientId: new mongoose_1.Types.ObjectId(recipientId),
        callType,
        status,
        startedAt: new Date(),
        endedAt: status === 'ended' ? new Date() : undefined,
        duration,
    });
    res.status(201).json({ success: true, call });
}
async function getCallHistory(req, res) {
    const userId = req.user?._id;
    const calls = await Call_js_1.Call.find({
        $or: [{ initiatorId: userId }, { recipientId: userId }],
    })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('initiatorId recipientId', 'username displayName profilePhoto');
    const formatted = calls.map((c) => {
        const isInitiator = c.initiatorId._id.toString() === userId?.toString();
        const otherParticipant = isInitiator ? c.recipientId : c.initiatorId;
        return {
            id: c._id,
            callType: c.callType,
            status: c.status,
            duration: c.duration,
            isOutgoing: isInitiator,
            participant: otherParticipant,
            startedAt: c.startedAt,
            endedAt: c.endedAt,
            createdAt: c.createdAt,
        };
    });
    res.json({ success: true, calls: formatted });
}
async function updateCallStatus(req, res) {
    const userId = req.user?._id;
    const callId = req.params.id;
    const { status, duration } = req.body;
    const call = await Call_js_1.Call.findOne({
        _id: callId,
        $or: [{ initiatorId: userId }, { recipientId: userId }],
    });
    if (!call) {
        res.status(404).json({ success: false, error: 'Call record not found' });
        return;
    }
    if (status)
        call.status = status;
    if (duration !== undefined)
        call.duration = duration;
    if (status === 'ended' || status === 'declined' || status === 'missed') {
        call.endedAt = new Date();
    }
    await call.save();
    res.json({ success: true, call });
}
