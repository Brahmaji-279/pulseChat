import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISession extends Document {
  userId: Types.ObjectId;
  sessionToken: string;
  userAgent?: string;
  ip?: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userAgent: {
      type: String,
      default: '',
    },
    ip: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index automatically expires old documents
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Session = mongoose.model<ISession>('Session', SessionSchema);
