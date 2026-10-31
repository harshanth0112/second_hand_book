import mongoose from 'mongoose';
import { DEPARTMENTS } from './User.js';

export const LISTING_TYPE = ['sell', 'free', 'swap'];
export const CONDITION = ['like new', 'good', 'fair'];
export const LISTING_STATUS = ['available', 'reserved', 'sold', 'removed', 'expired'];

const listingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [1, 'Title must be at least 1 character'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    titleNormalized: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
      minlength: [1, 'Author must be at least 1 character'],
      maxlength: [100, 'Author cannot exceed 100 characters'],
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [60, 'Subject cannot exceed 60 characters'],
      default: '',
    },
    isbn: {
      type: String,
      trim: true,
      default: '',
    },
    courseCode: {
      type: String,
      trim: true,
      maxlength: [20, 'Course code cannot exceed 20 characters'],
      default: '',
    },
    department: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || DEPARTMENTS.includes(v);
        },
        message: (props) => `${props.value} is not a valid department`,
      },
      default: '',
    },
    semester: {
      type: Number,
      min: [1, 'Semester must be between 1 and 8'],
      max: [8, 'Semester must be between 1 and 8'],
      default: null,
    },
    listingType: {
      type: String,
      required: [true, 'Listing type is required'],
      enum: LISTING_TYPE,
    },
    condition: {
      type: String,
      required: [true, 'Condition is required'],
      enum: CONDITION,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be at least 0'],
      max: [100000, 'Price cannot exceed 100,000'],
      default: 0,
    },
    swapFor: {
      type: String,
      trim: true,
      maxlength: [150, 'Swap for cannot exceed 150 characters'],
      default: '',
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
      default: '',
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          return !v || v.length <= 4;
        },
        message: 'A listing can have at most 4 images',
      },
    },
    coverUrl: {
      type: String,
      default: '',
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller is required'],
      index: true,
    },
    status: {
      type: String,
      enum: LISTING_STATUS,
      default: 'available',
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    reminderSentAt: {
      type: Date,
      default: null,
    },
    reservedFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    soldAt: {
      type: Date,
      default: null,
    },
    handoverConfirmedBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

listingSchema.index({ title: 'text', author: 'text' });

export const Listing = mongoose.model('Listing', listingSchema);

