import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPublicKey extends Document {
  userId: Types.ObjectId;
  keyId: string;
  algorithm: 'ML-KEM-768' | 'ML-DSA-65';
  publicKey: string; // Base64 encoded public key
  keyVersion: number;
  signatureOrBinding?: string; // Signature authenticating this key record
  fingerprint: string;
  isCurrent: boolean;
  createdAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
}

const PublicKeySchema = new Schema<IPublicKey>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    keyId: {
      type: String,
      required: true,
      trim: true,
    },
    algorithm: {
      type: String,
      enum: ['ML-KEM-768', 'ML-DSA-65'],
      required: true,
    },
    publicKey: {
      type: String,
      required: true,
    },
    keyVersion: {
      type: Number,
      required: true,
      default: 1,
    },
    signatureOrBinding: {
      type: String,
    },
    fingerprint: {
      type: String,
      required: true,
      index: true,
    },
    isCurrent: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
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

PublicKeySchema.index({ userId: 1, algorithm: 1, isCurrent: 1 });
PublicKeySchema.index({ userId: 1, keyId: 1 }, { unique: true });

export const PublicKey = mongoose.model<IPublicKey>('PublicKey', PublicKeySchema);
