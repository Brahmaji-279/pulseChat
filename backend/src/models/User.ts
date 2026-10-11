import mongoose, { Document, Schema } from 'mongoose';

export interface IPrivacySettings {
  presenceVisibility: 'everyone' | 'contacts' | 'nobody';
  lastActiveVisibility: 'everyone' | 'contacts' | 'nobody';
  callPermissions: 'everyone' | 'contacts' | 'nobody';
}

export interface IUser extends Document {
  username: string;
  normalizedUsername: string;
  email: string;
  normalizedEmail: string;
  passwordHash: string;
  displayName: string;
  profilePhoto?: string;
  biography?: string;
  accountStatus: 'active' | 'suspended' | 'deleted';
  privacySettings: IPrivacySettings;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    normalizedUsername: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never returned by default in API queries
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    biography: {
      type: String,
      default: '',
      maxlength: 250,
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
    },
    privacySettings: {
      presenceVisibility: {
        type: String,
        enum: ['everyone', 'contacts', 'nobody'],
        default: 'everyone',
      },
      lastActiveVisibility: {
        type: String,
        enum: ['everyone', 'contacts', 'nobody'],
        default: 'contacts',
      },
      callPermissions: {
        type: String,
        enum: ['everyone', 'contacts', 'nobody'],
        default: 'everyone',
      },
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
