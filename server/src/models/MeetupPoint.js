import mongoose from 'mongoose';

const meetupPointSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    area: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const MeetupPoint = mongoose.model('MeetupPoint', meetupPointSchema);

