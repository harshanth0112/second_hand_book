import mongoose from 'mongoose';

export const REQUEST_STATUS = ['pending', 'accepted', 'rejected', 'cancelled', 'completed'];

const requestSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: REQUEST_STATUS,
      default: 'pending',
      index: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    offeredBook: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    agreedPrice: {
      type: Number,
      default: null,
    },
    meetupPoint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MeetupPoint',
      default: null,
    },
    meetupTime: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

requestSchema.index({ listing: 1, buyer: 1, status: 1 });

export const Request = mongoose.model('Request', requestSchema);

