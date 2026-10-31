import mongoose from 'mongoose';
import { DEPARTMENTS } from './User.js';

const wantedSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    titleNormalized: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 60,
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
    maxPrice: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

wantedSchema.index({ user: 1, createdAt: -1 });

export const Wanted = mongoose.model('Wanted', wantedSchema);

