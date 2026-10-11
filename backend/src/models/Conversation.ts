import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IConversation extends Document {
  participantIds: Types.ObjectId[];
  conversationType: 'direct' | 'group';
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participantIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    conversationType: {
      type: String,
      enum: ['direct', 'group'],
      default: 'direct',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ participantIds: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
