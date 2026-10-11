import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBlockedUser extends Document {
  blockerId: Types.ObjectId;
  blockedUserId: Types.ObjectId;
  createdAt: Date;
}

const BlockedUserSchema = new Schema<IBlockedUser>(
  {
    blockerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    blockedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

BlockedUserSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true });

export const BlockedUser = mongoose.model<IBlockedUser>('BlockedUser', BlockedUserSchema);
