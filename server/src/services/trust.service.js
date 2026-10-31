import mongoose from 'mongoose';
import { Review } from '../models/Review.js';
import { Request } from '../models/Request.js';
import { Listing } from '../models/Listing.js';
import { User } from '../models/User.js';
import { Report } from '../models/Report.js';
import { notify } from './notification.service.js';

export class TrustService {
  // ── Reviews ─────────────────────────────────────────────────────────────
  static async createReview(userId, { requestId, rating, comment = '' }) {
    const req = await Request.findById(requestId);
    if (!req) {
      const err = new Error('Request not found');
      err.status = 404;
      throw err;
    }

    if (!req.buyer.equals(userId)) {
      const err = new Error('Only the buyer of the completed request can leave a review');
      err.status = 403;
      throw err;
    }

    if (req.status !== 'completed') {
      const err = new Error('Reviews can only be submitted for completed transactions');
      err.status = 409;
      throw err;
    }

    // Check if review already exists for this listing/request
    const existing = await Review.findOne({ listing: req.listing });
    if (existing) {
      const err = new Error('A review has already been submitted for this listing');
      err.status = 409;
      throw err;
    }

    const review = await Review.create({
      request: req._id,
      listing: req.listing,
      seller: req.seller,
      reviewer: userId,
      rating,
      comment,
    });

    // Notify seller
    notify(
      req.seller,
      'review_received',
      `You received a new ${rating}-star review for your book sale!`,
      `/users/${req.seller}`
    ).catch((err) => console.error('[Review Notify Error]:', err.message));

    return review;
  }

  static async getUserProfileWithRatings(targetUserId) {
    const user = await User.findById(targetUserId);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const targetOid = new mongoose.Types.ObjectId(targetUserId);
    const stats = await Review.aggregate([
      { $match: { seller: targetOid } },
      {
        $group: {
          _id: null,
          ratingAverage: { $avg: '$rating' },
          ratingCount: { $sum: 1 },
        },
      },
    ]);

    const ratingAverage = stats.length > 0 ? Math.round(stats[0].ratingAverage * 10) / 10 : 0;
    const ratingCount = stats.length > 0 ? stats[0].ratingCount : 0;

    return {
      ...user.toPublicJSON(),
      ratingAverage,
      ratingCount,
    };
  }

  static async getUserReviews(targetUserId, { page = 1, limit = 20 }) {
    const user = await User.findById(targetUserId);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const [items, total] = await Promise.all([
      Review.find({ seller: targetUserId })
        .populate('reviewer', 'name avatar')
        .populate('listing', 'title')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments({ seller: targetUserId }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // ── Reports ─────────────────────────────────────────────────────────────
  static async reportListing(reporterId, listingId, { reason, details = '' }) {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      const err = new Error('Listing not found');
      err.status = 404;
      throw err;
    }

    if (listing.seller.equals(reporterId)) {
      const err = new Error('You cannot report your own listing');
      err.status = 400;
      throw err;
    }

    const existing = await Report.findOne({
      reporter: reporterId,
      targetListing: listingId,
      status: 'open',
    });

    if (existing) {
      const err = new Error('You already have an open report for this listing');
      err.status = 409;
      throw err;
    }

    const report = await Report.create({
      reporter: reporterId,
      targetType: 'listing',
      targetListing: listingId,
      reason,
      details,
    });

    return report;
  }

  static async reportUser(reporterId, targetUserId, { reason, details = '' }) {
    if (reporterId.toString() === targetUserId.toString()) {
      const err = new Error('You cannot report yourself');
      err.status = 400;
      throw err;
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const existing = await Report.findOne({
      reporter: reporterId,
      targetUser: targetUserId,
      status: 'open',
    });

    if (existing) {
      const err = new Error('You already have an open report for this user');
      err.status = 409;
      throw err;
    }

    const report = await Report.create({
      reporter: reporterId,
      targetType: 'user',
      targetUser: targetUserId,
      reason,
      details,
    });

    return report;
  }

  // ── Blocking ────────────────────────────────────────────────────────────
  static async blockUser(userId, targetUserId) {
    if (userId.toString() === targetUserId.toString()) {
      const err = new Error('You cannot block yourself');
      err.status = 400;
      throw err;
    }

    const target = await User.findById(targetUserId);
    if (!target) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { blockedUsers: targetUserId },
    });

    return { message: 'User blocked' };
  }

  static async unblockUser(userId, targetUserId) {
    await User.findByIdAndUpdate(userId, {
      $pull: { blockedUsers: targetUserId },
    });

    return { message: 'User unblocked' };
  }

  // ── Seller Dashboard ────────────────────────────────────────────────────
  static async getSellerDashboard(userId) {
    const userOid = new mongoose.Types.ObjectId(userId);

    const [
      activeListings,
      totalViewsAgg,
      requestsAgg,
      booksSold,
      booksGivenAway,
      earningsAgg,
      recentListings,
    ] = await Promise.all([
      // activeListings
      Listing.countDocuments({ seller: userOid, status: 'available' }),

      // totalViews
      Listing.aggregate([
        { $match: { seller: userOid } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } },
      ]),

      // requests: received and pending
      Request.aggregate([
        { $match: { seller: userOid } },
        {
          $group: {
            _id: null,
            received: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
          },
        },
      ]),

      // booksSold (status 'sold' and listingType 'sell' or 'swap')
      Listing.countDocuments({ seller: userOid, status: 'sold', listingType: 'sell' }),

      // booksGivenAway (status 'sold' and listingType 'free')
      Listing.countDocuments({ seller: userOid, status: 'sold', listingType: 'free' }),

      // earnings: sum over sold listings of completed request's agreedPrice (or listing price fallback)
      Request.aggregate([
        {
          $match: {
            seller: userOid,
            status: 'completed',
          },
        },
        {
          $lookup: {
            from: 'listings',
            localField: 'listing',
            foreignField: '_id',
            as: 'listingObj',
          },
        },
        { $unwind: '$listingObj' },
        {
          $match: {
            'listingObj.listingType': 'sell',
          },
        },
        {
          $project: {
            price: {
              $ifNull: ['$agreedPrice', '$listingObj.price'],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$price' },
          },
        },
      ]),

      // perListing: up to 20 most recent
      Listing.aggregate([
        { $match: { seller: userOid } },
        { $sort: { createdAt: -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: 'requests',
            localField: '_id',
            foreignField: 'listing',
            as: 'reqs',
          },
        },
        {
          $project: {
            _id: '$_id',
            title: '$title',
            views: '$views',
            status: '$status',
            requests: { $size: '$reqs' },
          },
        },
      ]),
    ]);

    const totalViews = totalViewsAgg.length > 0 ? totalViewsAgg[0].totalViews : 0;
    const reqStats = requestsAgg.length > 0 ? requestsAgg[0] : { received: 0, pending: 0 };
    const earnings = earningsAgg.length > 0 ? earningsAgg[0].totalEarnings : 0;

    return {
      activeListings,
      totalViews,
      requests: {
        received: reqStats.received,
        pending: reqStats.pending,
      },
      booksSold,
      booksGivenAway,
      earnings,
      perListing: recentListings,
    };
  }
}

