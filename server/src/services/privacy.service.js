import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Listing } from '../models/Listing.js';
import { Request } from '../models/Request.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Review } from '../models/Review.js';
import { Wanted } from '../models/Wanted.js';
import { Notification } from '../models/Notification.js';

export class PrivacyService {
  /**
   * Export all user data as a sanitized JSON payload.
   */
  static async exportUserData(user) {
    const userId = user._id;

    // Parallel fetch of all related data
    const [
      listings,
      requestsAsBuyer,
      requestsAsSeller,
      conversations,
      reviewsWritten,
      reviewsReceived,
      wishlistItems,
      wantedItems,
      notifications,
    ] = await Promise.all([
      Listing.find({ seller: userId }).lean(),
      Request.find({ buyer: userId }).populate('listing', 'title author').lean(),
      Request.find({ seller: userId }).populate('listing', 'title author').lean(),
      Conversation.find({
        $or: [{ buyer: userId }, { seller: userId }],
      }).lean(),
      Review.find({ reviewer: userId }).populate('listing', 'title').lean(),
      Review.find({ seller: userId }).populate('listing', 'title').lean(),
      Listing.find({ _id: { $in: user.wishlist || [] } }).lean(),
      Wanted.find({ user: userId }).lean(),
      Notification.find({ user: userId }).lean(),
    ]);

    // Fetch messages for each conversation
    const conversationIds = conversations.map((c) => c._id);
    const messages = await Message.find({
      conversation: { $in: conversationIds },
    })
      .sort({ createdAt: 1 })
      .lean();

    const convsWithMessages = conversations.map((c) => ({
      ...c,
      messages: messages.filter((m) => m.conversation.toString() === c._id.toString()),
    }));

    return {
      exportedAt: new Date().toISOString(),
      profile: user.toMeJSON(),
      listings,
      requests: {
        asBuyer: requestsAsBuyer,
        asSeller: requestsAsSeller,
      },
      conversations: convsWithMessages,
      reviews: {
        written: reviewsWritten,
        received: reviewsReceived,
      },
      wishlist: wishlistItems,
      wanted: wantedItems,
      notifications,
    };
  }

  /**
   * Delete user account with full cleanup and anonymization.
   */
  static async deleteUserAccount(user, { confirm, password }) {
    if (confirm !== 'DELETE') {
      const err = new Error('Confirmation string must equal "DELETE"');
      err.status = 400;
      throw err;
    }

    // If account has local password provider and password is set, verify password
    if (user.authProviders?.includes('local') && user.password) {
      if (!password) {
        const err = new Error('Password is required to delete this account');
        err.status = 401;
        throw err;
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        const err = new Error('Incorrect password');
        err.status = 401;
        throw err;
      }
    }

    const userId = user._id;

    // 1. Process active requests involving this user
    const activeRequests = await Request.find({
      $or: [{ buyer: userId }, { seller: userId }],
      status: { $in: ['pending', 'accepted'] },
    });

    for (const req of activeRequests) {
      const isUserBuyer = req.buyer.toString() === userId.toString();
      const otherUserId = isUserBuyer ? req.seller : req.buyer;

      // If user was buyer and request was accepted, return listing to available first
      if (isUserBuyer && req.status === 'accepted') {
        await Listing.updateOne(
          { _id: req.listing, status: 'reserved' },
          { status: 'available', reservedFor: null }
        );
      }

      req.status = 'cancelled';
      await req.save();

      // Notify the other side
      try {
        await Notification.create({
          user: otherUserId,
          type: 'request_cancelled',
          message: 'A request was cancelled because the other user deleted their account.',
          link: '',
        });
      } catch {
        // Continue if notification fails
      }
    }

    // 2. Set user's own listings (available or reserved) to removed
    await Listing.updateMany(
      { seller: userId, status: { $in: ['available', 'reserved'] } },
      { status: 'removed', reservedFor: null }
    );

    // 3. Delete user's notifications and wanted entries
    await Notification.deleteMany({ user: userId });
    await Wanted.deleteMany({ user: userId });

    // 4. Anonymize user document
    user.name = 'Deleted user';
    user.email = `deleted-${userId}@invalid`;
    user.password = null;
    user.googleId = null;
    user.avatar = '';
    user.college = '';
    user.department = '';
    user.semester = null;
    user.wishlist = [];
    user.blockedUsers = [];
    user.authProviders = [];
    user.emailVerificationTokenHash = null;
    user.passwordResetTokenHash = null;
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
    user.deletedAt = new Date();

    await user.save();

    return { message: 'Account deleted successfully' };
  }
}

