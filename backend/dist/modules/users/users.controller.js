"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = void 0;
exports.searchUsers = searchUsers;
exports.getUserByUsername = getUserByUsername;
exports.updateProfile = updateProfile;
exports.uploadProfilePhoto = uploadProfilePhoto;
const zod_1 = require("zod");
const User_js_1 = require("../../models/User.js");
const PublicKey_js_1 = require("../../models/PublicKey.js");
exports.updateProfileSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(1).max(50).optional(),
    biography: zod_1.z.string().max(250).optional(),
    privacySettings: zod_1.z
        .object({
        presenceVisibility: zod_1.z.enum(['everyone', 'contacts', 'nobody']).optional(),
        lastActiveVisibility: zod_1.z.enum(['everyone', 'contacts', 'nobody']).optional(),
        callPermissions: zod_1.z.enum(['everyone', 'contacts', 'nobody']).optional(),
    })
        .optional(),
});
async function searchUsers(req, res) {
    const query = req.query.q?.trim().toLowerCase();
    if (!query || query.length < 1) {
        res.json({ success: true, users: [] });
        return;
    }
    // Escape special regex characters to prevent ReDoS
    const sanitizedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const currentUserId = req.user?._id;
    // Search users by normalizedUsername or displayName
    const users = await User_js_1.User.find({
        _id: { $ne: currentUserId },
        accountStatus: 'active',
        $or: [
            { normalizedUsername: { $regex: `^${sanitizedQuery}` } },
            { displayName: { $regex: sanitizedQuery, $options: 'i' } },
        ],
    })
        .limit(15)
        .select('_id username displayName profilePhoto biography lastActiveAt privacySettings');
    // Fetch their primary ML-DSA public key fingerprint if available
    const userIds = users.map((u) => u._id);
    const publicKeys = await PublicKey_js_1.PublicKey.find({
        userId: { $in: userIds },
        algorithm: 'ML-DSA-65',
        isCurrent: true,
    });
    const keyMap = new Map();
    publicKeys.forEach((k) => keyMap.set(k.userId.toString(), k.fingerprint));
    const result = users.map((u) => ({
        id: u._id,
        username: u.username,
        displayName: u.displayName,
        profilePhoto: u.profilePhoto,
        biography: u.biography,
        fingerprint: keyMap.get(u._id.toString()) || null,
    }));
    res.json({ success: true, users: result });
}
async function getUserByUsername(req, res) {
    const username = req.params.username?.toLowerCase().trim();
    const user = await User_js_1.User.findOne({
        normalizedUsername: username,
        accountStatus: 'active',
    }).select('_id username displayName profilePhoto biography createdAt privacySettings');
    if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
    }
    // Fetch verified public key info
    const keys = await PublicKey_js_1.PublicKey.find({
        userId: user._id,
        isCurrent: true,
    }).select('keyId algorithm fingerprint createdAt');
    res.json({
        success: true,
        user: {
            id: user._id,
            username: user.username,
            displayName: user.displayName,
            profilePhoto: user.profilePhoto,
            biography: user.biography,
            createdAt: user.createdAt,
            keys: keys.map((k) => ({
                keyId: k.keyId,
                algorithm: k.algorithm,
                fingerprint: k.fingerprint,
                createdAt: k.createdAt,
            })),
        },
    });
}
async function updateProfile(req, res) {
    if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
    }
    const { displayName, biography, privacySettings } = req.body;
    if (displayName)
        req.user.displayName = displayName.trim();
    if (biography !== undefined)
        req.user.biography = biography.trim();
    if (privacySettings) {
        req.user.privacySettings = {
            ...req.user.privacySettings,
            ...privacySettings,
        };
    }
    await req.user.save();
    res.json({
        success: true,
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            displayName: req.user.displayName,
            profilePhoto: req.user.profilePhoto,
            biography: req.user.biography,
            privacySettings: req.user.privacySettings,
            createdAt: req.user.createdAt,
        },
    });
}
async function uploadProfilePhoto(req, res) {
    if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
    }
    const savedUrl = req.savedFileUrl;
    if (!savedUrl) {
        res.status(400).json({ success: false, error: 'File upload processing failed' });
        return;
    }
    req.user.profilePhoto = savedUrl;
    await req.user.save();
    res.json({
        success: true,
        profilePhoto: savedUrl,
        message: 'Profile photo updated successfully',
    });
}
