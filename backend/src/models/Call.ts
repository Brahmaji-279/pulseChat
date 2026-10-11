import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICall extends Document {
  initiatorId: Types.ObjectId;
  recipientId: Types.ObjectId;
  callType: 'voice' | 'video';
  status: 'initiated' | 'ringing' | 'accepted' | 'declined' | 'missed' | 'ended';
  startedAt?: Date;
  endedAt?: Date;
  duration: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema = new Schema<ICall>(
  {
    initiatorId: {
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
    callType: {
      type: String,
      enum: ['voice', 'video'],
      required: true,
    },
    status: {
      type: String,
      enum: ['initiated', 'ringing', 'accepted', 'declined', 'missed', 'ended'],
      default: 'initiated',
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    duration: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

CallSchema.index({ initiatorId: 1, createdAt: -1 });
CallSchema.index({ recipientId: 1, createdAt: -1 });

export const Call = mongoose.model<ICall>('Call', CallSchema);
