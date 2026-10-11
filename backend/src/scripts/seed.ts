import mongoose from 'mongoose';
import argon2 from 'argon2';
import { connectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { PublicKey } from '../models/PublicKey.js';
import { Conversation } from '../models/Conversation.js';

async function seed() {
  console.log('[Seed] Connecting to MongoDB Atlas...');
  await connectDatabase();

  console.log('[Seed] Clearing existing development data...');
  await User.deleteMany({ email: /@pulsechat\.test$/ });

  const passwordHash = await argon2.hash('PulseChat#2026', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  console.log('[Seed] Creating demo users...');
  const alice = await User.create({
    username: 'alice',
    normalizedUsername: 'alice',
    email: 'alice@pulsechat.test',
    normalizedEmail: 'alice@pulsechat.test',
    passwordHash,
    displayName: 'Alice Sterling',
    biography: 'Cryptographic security engineer exploring NIST post-quantum standards.',
    accountStatus: 'active',
  });

  const bob = await User.create({
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
  await Conversation.create({
    participantIds: [alice._id, bob._id],
    conversationType: 'direct',
    lastMessageAt: new Date(),
  });

  console.log('[Seed] Database seeding completed successfully.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
