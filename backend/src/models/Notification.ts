import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId;
  notificationType: string;
  metadata: Record<string, unknown>;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    notificationType: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
