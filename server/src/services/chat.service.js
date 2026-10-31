import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Listing } from '../models/Listing.js';
import { User } from '../models/User.js';

export class ChatService {
  static async startConversation(buyerId, listingId) {
    const listing = await Listing.findById(listingId);
    if (!listing || listing.status === 'removed') {
      const err = new Error('Listing not found');
      err.status = 404;
      throw err;
    }

    if (listing.seller.equals(buyerId)) {
      const err = new Error('You cannot start a chat on your own listing');
      err.status = 403;
      throw err;
    }

    // Check if either user has blocked the other
    const [buyer, seller] = await Promise.all([
      User.findById(buyerId).select('blockedUsers').lean(),
      User.findById(listing.seller).select('blockedUsers').lean(),
    ]);

    const buyerBlocked = buyer?.blockedUsers?.some((id) => id.equals(listing.seller));
    const sellerBlocked = seller?.blockedUsers?.some((id) => id.equals(buyerId));

    if (buyerBlocked || sellerBlocked) {
      const err = new Error('Cannot start conversation due to user block');
      err.status = 403;
      throw err;
    }

    // Find or create via atomic upsert
    let conversation = await Conversation.findOneAndUpdate(
      { listing: listingId, buyer: buyerId },
      {
        $setOnInsert: {
          listing: listingId,
          buyer: buyerId,
          seller: listing.seller,
          lastMessage: '',
          lastMessageAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .populate('listing', 'title author price listingType images coverUrl status')
      .populate('seller', '_id name avatar department semester createdAt')
      .populate('buyer', '_id name avatar department semester createdAt');

    return conversation;
  }

  static async getInbox(userId) {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const conversations = await Conversation.find({
      $or: [{ buyer: userObjectId }, { seller: userObjectId }],
    })
      .sort({ lastMessageAt: -1 })
      .populate('listing', 'title author price listingType images coverUrl status')
      .populate('seller', '_id name avatar department semester createdAt')
      .populate('buyer', '_id name avatar department semester createdAt')
      .lean();

    if (conversations.length === 0) return [];

    const conversationIds = conversations.map((c) => c._id);

    // Compute unreadCount per conversation: messages where sender != userId and readAt is null
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          conversation: { $in: conversationIds },
          sender: { $ne: userObjectId },
          readAt: null,
          type: { $ne: 'system' },
        },
      },
      {
        $group: {
          _id: '$conversation',
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    for (const item of unreadCounts) {
      countMap[item._id.toString()] = item.count;
    }

    return conversations.map((conv) => ({
      ...conv,
      unreadCount: countMap[conv._id.toString()] || 0,
    }));
  }

  static async getMessages(conversationId, userId, { before, limit = 30 }) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      const err = new Error('Conversation not found');
      err.status = 404;
      throw err;
    }

    if (!conversation.buyer.equals(userId) && !conversation.seller.equals(userId)) {
      const err = new Error('Not authorized to access these messages');
      err.status = 403;
      throw err;
    }

    const query = { conversation: conversationId };
    if (before) {
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    const messages = await Message.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('sender', '_id name avatar')
      .lean();

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;

    return {
      items,
      hasMore,
    };
  }

  static async markRead(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      const err = new Error('Conversation not found');
      err.status = 404;
      throw err;
    }

    if (!conversation.buyer.equals(userId) && !conversation.seller.equals(userId)) {
      const err = new Error('Not authorized to mark messages as read');
      err.status = 403;
      throw err;
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      }
    );
  }

  static async handleOffer(messageId, sellerId, action) {
    const message = await Message.findById(messageId);
    if (!message || message.type !== 'offer') {
      const err = new Error('Offer message not found');
      err.status = 404;
      throw err;
    }

    const conversation = await Conversation.findById(message.conversation);
    if (!conversation) {
      const err = new Error('Conversation not found');
      err.status = 404;
      throw err;
    }

    if (!conversation.seller.equals(sellerId)) {
      const err = new Error('Only the seller can accept or decline an offer');
      err.status = 403;
      throw err;
    }

    if (message.offerStatus !== 'pending') {
      const err = new Error('Offer has already been resolved');
      err.status = 409;
      throw err;
    }

    if (action === 'accept') {
      message.offerStatus = 'accepted';
      conversation.agreedPrice = message.offerAmount;
      await conversation.save();
    } else {
      message.offerStatus = 'declined';
    }

    await message.save();

    // Create a system message announcing the decision
    const systemText = action === 'accept'
      ? `Seller accepted the offer of ₹${message.offerAmount}.`
      : `Seller declined the offer of ₹${message.offerAmount}.`;

    const systemMsg = await Message.create({
      conversation: conversation._id,
      sender: null,
      type: 'system',
      text: systemText,
      readAt: new Date(),
    });

    conversation.lastMessage = systemText;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    return { message, systemMsg, agreedPrice: conversation.agreedPrice };
  }
}

