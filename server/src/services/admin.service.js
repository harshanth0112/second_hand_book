import { Report } from '../models/Report.js';
import { Listing } from '../models/Listing.js';
import { User } from '../models/User.js';
import { MeetupPoint } from '../models/MeetupPoint.js';
import { Notification } from '../models/Notification.js';

export class AdminService {
  /**
   * Get paginated reports by status with summarized targets.
   */
  static async getReports({ status = 'open', page = 1, limit = 20 }) {
    const filter = status ? { status } : {};
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reporter', 'name email department avatar')
        .populate('targetListing', 'title author price listingType status coverUrl seller')
        .populate('targetUser', 'name email department isBanned role avatar')
        .lean(),
      Report.countDocuments(filter),
    ]);

    return {
      reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Update report status (e.g. resolved / dismissed).
   */
  static async updateReportStatus(reportId, status) {
    const report = await Report.findById(reportId);
    if (!report) {
      const err = new Error('Report not found');
      err.status = 404;
      throw err;
    }

    report.status = status;
    await report.save();
    return report;
  }

  /**
   * Remove a listing by admin, notifying the seller.
   */
  static async removeListing(listingId) {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      const err = new Error('Listing not found');
      err.status = 404;
      throw err;
    }

    listing.status = 'removed';
    await listing.save();

    await Notification.create({
      user: listing.seller,
      type: 'listing_removed',
      message: `Your listing "${listing.title}" was removed by an administrator.`,
      link: '',
    });

    return listing;
  }

  /**
   * Ban or unban a user.
   * Admins cannot ban themselves or another admin.
   * Banning sets isBanned = true and sets user's available listings to 'removed'.
   * Unbanning does not restore listings.
   */
  static async setUserBan(targetUserId, banned, currentAdmin) {
    if (targetUserId.toString() === currentAdmin._id.toString()) {
      const err = new Error('Cannot ban yourself');
      err.status = 400;
      throw err;
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    if (targetUser.role === 'admin') {
      const err = new Error('Cannot ban another administrator');
      err.status = 403;
      throw err;
    }

    targetUser.isBanned = banned;
    if (banned) {
      // Invalidate current sessions
      targetUser.sessionVersion = (targetUser.sessionVersion ?? 0) + 1;
      // Mark available listings as removed
      await Listing.updateMany(
        { seller: targetUser._id, status: 'available' },
        { status: 'removed' }
      );
    }

    await targetUser.save();
    return targetUser;
  }

  /**
   * Create a new meetup point.
   */
  static async createMeetupPoint(data) {
    return await MeetupPoint.create(data);
  }

  /**
   * Update an existing meetup point.
   */
  static async updateMeetupPoint(id, updates) {
    const point = await MeetupPoint.findById(id);
    if (!point) {
      const err = new Error('Meetup point not found');
      err.status = 404;
      throw err;
    }

    Object.assign(point, updates);
    await point.save();
    return point;
  }

  /**
   * List all meetup points (both active and inactive) for admin management.
   */
  static async getAllMeetupPoints() {
    return await MeetupPoint.find().sort({ createdAt: -1 }).lean();
  }
}
