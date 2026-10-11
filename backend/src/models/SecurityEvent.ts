import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISecurityEvent extends Document {
  userId?: Types.ObjectId;
  eventType: string;
  metadata: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const SecurityEventSchema = new Schema<ISecurityEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const SecurityEvent = mongoose.model<ISecurityEvent>('SecurityEvent', SecurityEventSchema);
