import mongoose from 'mongoose';

export const NOTIFICATION_TYPE = [
  'request_received',
  'request_accepted',
  'request_rejected',
  'request_cancelled',
  'handover_confirmed',
  'message',
  'wanted_match',
  'price_drop',
  'listing_expiring',
  'listing_removed',
  'review_received',
];

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPE,
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);

