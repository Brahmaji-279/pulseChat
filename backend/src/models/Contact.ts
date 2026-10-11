import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IContact extends Document {
  requesterId: Types.ObjectId;
  recipientId: Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    requesterId: {
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
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

ContactSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

export const Contact = mongoose.model<IContact>('Contact', ContactSchema);
