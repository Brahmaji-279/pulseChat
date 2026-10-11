"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const argon2_1 = __importDefault(require("argon2"));
const database_js_1 = require("../config/database.js");
const User_js_1 = require("../models/User.js");
const Conversation_js_1 = require("../models/Conversation.js");
async function seed() {
    console.log('[Seed] Connecting to MongoDB Atlas...');
    await (0, database_js_1.connectDatabase)();
    console.log('[Seed] Clearing existing development data...');
    await User_js_1.User.deleteMany({ email: /@pulsechat\.test$/ });
    const passwordHash = await argon2_1.default.hash('PulseChat#2026', {
        type: argon2_1.default.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
    });
    console.log('[Seed] Creating demo users...');
    const alice = await User_js_1.User.create({
        username: 'alice',
        normalizedUsername: 'alice',
        email: 'alice@pulsechat.test',
        normalizedEmail: 'alice@pulsechat.test',
        passwordHash,
        displayName: 'Alice Sterling',
        biography: 'Cryptographic security engineer exploring NIST post-quantum standards.',
        accountStatus: 'active',
    });
    const bob = await User_js_1.User.create({
        username: 'bob',
        normalizedUsername: 'bob',
        email: 'bob@pulsechat.test',
        normalizedEmail: 'bob@pulsechat.test',
        passwordHash,
        displayName: 'Bob Martinez',
        biography: 'Distributed systems architect and privacy advocate.',
        accountStatus: 'active',
    });
    console.log(`[Seed] Created demo users:`);
    console.log(`  - Username: ${alice.username} | Password: PulseChat#2026`);
    console.log(`  - Username: ${bob.username} | Password: PulseChat#2026`);
    console.log('[Seed] Creating initial direct conversation...');
    await Conversation_js_1.Conversation.create({
        participantIds: [alice._id, bob._id],
        conversationType: 'direct',
        lastMessageAt: new Date(),
    });
    console.log('[Seed] Database seeding completed successfully.');
    await mongoose_1.default.disconnect();
}
seed().catch((err) => {
    console.error('[Seed Error]', err);
    process.exit(1);
});
