import mongoose from 'mongoose';

export const MESSAGE_TYPE = ['text', 'offer', 'system'];
export const OFFER_STATUS = ['pending', 'accepted', 'declined'];

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for system messages
    },
    type: {
      type: String,
      enum: MESSAGE_TYPE,
      default: 'text',
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    offerAmount: {
      type: Number,
      default: null,
    },
    offerStatus: {
      type: String,
      enum: OFFER_STATUS,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);

