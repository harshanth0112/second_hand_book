import mongoose from 'mongoose';

export const REPORT_REASONS = [
  'spam',
  'inappropriate_content',
  'counterfeit_or_scam',
  'harassment',
  'no_show',
  'other',
];

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['listing', 'user'],
      required: true,
    },
    targetListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      default: null,
      index: true,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    reason: {
      type: String,
      enum: REPORT_REASONS,
      required: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: [1000, 'Details cannot exceed 1000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['open', 'resolved', 'dismissed'],
      default: 'open',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One open report per reporter and target
reportSchema.index(
  { reporter: 1, targetListing: 1, status: 1 },
  { unique: true, partialFilterExpression: { targetListing: { $type: 'objectId' }, status: 'open' } }
);

reportSchema.index(
  { reporter: 1, targetUser: 1, status: 1 },
  { unique: true, partialFilterExpression: { targetUser: { $type: 'objectId' }, status: 'open' } }
);

export const Report = mongoose.model('Report', reportSchema);

