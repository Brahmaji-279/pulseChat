import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IEncryptedEnvelope {
  protocolVersion: string;
  conversationId: string;
  messageId: string;
  senderId: string;
  recipientId: string;
  senderKeyId: string;
  recipientKeyId: string;
  keyEncapsulationCiphertext: string;
  nonce: string;
  ciphertext: string;
  tag: string;
  signatureAlgorithm: 'ML-DSA-65';
  signature: string;
  timestamp: number;
}

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  recipientId: Types.ObjectId;
  messageId: string;
  protocolVersion: string;
  encryptedEnvelope: IEncryptedEnvelope;
  deliveryStatus: 'sent' | 'delivered' | 'read';
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    messageId: {
      type: String,
      required: true,
      unique: true, // Idempotency & replay protection
      index: true,
    },
    protocolVersion: {
      type: String,
      required: true,
      default: 'pulse-v1-mlkem768-mldsa65',
    },
    encryptedEnvelope: {
      protocolVersion: { type: String, required: true },
      conversationId: { type: String, required: true },
      messageId: { type: String, required: true },
      senderId: { type: String, required: true },
      recipientId: { type: String, required: true },
      senderKeyId: { type: String, required: true },
      recipientKeyId: { type: String, required: true },
      keyEncapsulationCiphertext: { type: String, required: true },
      nonce: { type: String, required: true },
      ciphertext: { type: String, required: true },
      tag: { type: String, required: true },
      signatureAlgorithm: { type: String, required: true, default: 'ML-DSA-65' },
      signature: { type: String, required: true },
      timestamp: { type: Number, required: true },
    },
    deliveryStatus: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
      index: true,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ recipientId: 1, deliveryStatus: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
