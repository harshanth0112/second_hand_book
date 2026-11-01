import { Notification } from '../models/Notification.js';
import { Wanted } from '../models/Wanted.js';
import { User } from '../models/User.js';
import { Listing } from '../models/Listing.js';
import { sendMail } from '../utils/mailer.js';
import { getIO } from '../socket/index.js';
import { env } from '../config/env.js';

export async function notify(userId, type, message, link, emailOptions = {}) {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      message,
      link
    });

    // Check user email notification preference (unless critical/security which overrides preference)
    const user = await User.findById(userId).select('email emailNotifications name').lean();
    const shouldSendEmail = user && (emailOptions.isSecurityAlert || user.emailNotifications);

    if (shouldSendEmail) {
      const portalUrl = link ? (link.startsWith('http') ? link : `${env.CLIENT_URL}${link.startsWith('/') ? '' : '/'}${link}`) : env.CLIENT_URL;

      let mailPayload = {
        to: user.email,
        subject: emailOptions.subject || `[Campus Book Exchange] ${message}`,
        text: emailOptions.text || `Hi ${user.name},\n\n${message}\n\nView details: ${portalUrl}\n\nThanks,\nCampus Book Exchange Team`,
      };

      if (emailOptions.templateId) {
        mailPayload.templateId = emailOptions.templateId;
        mailPayload.variables = {
          name: user.name || 'Student',
          message: message,
          link: portalUrl,
          ...emailOptions.variables,
        };
      }

      sendMail(mailPayload).catch((err) => {
        console.error('[Notification Mail Error]:', err.message);
      });
    }

    // Socket real-time delivery
    const io = getIO();
    if (io) {
      io.to(`user:${userId.toString()}`).emit('notification:new', notification);
    }

    return notification;
  } catch (err) {
    console.error('[Notify Error]:', err.message);
  }
}

export async function matchWanted(listing) {
  try {
    // Build query to match active wanted items
    // Condition:
    // User cannot be the listing owner
    // Match either titleNormalized (case-insensitive substring/regex), or subject, or department
    // And maxPrice >= listing.price if maxPrice is defined
    const query = {
      user: { $ne: listing.owner },
      $or: []
    };

    if (listing.title) {
      const escapedTitle = listing.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or.push({
        title: { $regex: new RegExp(escapedTitle, 'i') }
      });
      // Or if wanted has a title that is contained in listing.title
    }

    if (listing.subject) {
      query.$or.push({
        subject: { $regex: new RegExp(`^${listing.subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
    }

    if (listing.department) {
      query.$or.push({
        department: listing.department
      });
    }

    if (query.$or.length === 0) {
      return;
    }

    // Also check maxPrice condition: either maxPrice is not set or maxPrice >= listing.price
    query.$and = [
      {
        $or: [
          { maxPrice: { $exists: false } },
          { maxPrice: null },
          { maxPrice: { $gte: listing.price } }
        ]
      }
    ];

    // Cap at 200 matches
    const wantedMatches = await Wanted.find(query).limit(200).lean();

    const notifiedUserIds = new Set();
    for (const item of wantedMatches) {
      const uId = item.user.toString();
      if (!notifiedUserIds.has(uId)) {
        notifiedUserIds.add(uId);
        await notify(
          item.user,
          'wanted_match',
          `A book matching your wanted request ("${item.title || item.subject}") is now available: "${listing.title}"!`,
          `/listings/${listing._id}`
        );
      }
    }
  } catch (err) {
    console.error('[matchWanted Error]:', err.message);
  }
}

export async function notifyPriceDrop(listing, oldPrice, newPrice) {
  try {
    if (newPrice >= oldPrice) return;

    // Find all users who wishlisted this listing
    const usersWithWishlist = await User.find({ wishlist: listing._id }).select('_id').lean();
    for (const u of usersWithWishlist) {
      if (u._id.toString() !== listing.owner.toString()) {
        await notify(
          u._id,
          'price_drop',
          `Price dropped for "${listing.title}" from $${oldPrice} to $${newPrice}!`,
          `/listings/${listing._id}`
        );
      }
    }
  } catch (err) {
    console.error('[notifyPriceDrop Error]:', err.message);
  }
}

// Wishlist methods
export async function addToWishlist(userId, listingId) {
  const listing = await Listing.findById(listingId);
  if (!listing) {
    const error = new Error('Listing not found');
    error.status = 404;
    throw error;
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { wishlist: listingId } },
    { new: true }
  ).populate('wishlist');

  return user.wishlist;
}

export async function removeFromWishlist(userId, listingId) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { wishlist: listingId } },
    { new: true }
  ).populate('wishlist');

  return user.wishlist;
}

export async function getWishlist(userId, { page = 1, limit = 20 }) {
  const user = await User.findById(userId).populate({
    path: 'wishlist',
    populate: { path: 'seller', select: 'name avatar' }
  });

  const allItems = user.wishlist || [];
  const total = allItems.length;
  const startIndex = (page - 1) * limit;
  const items = allItems.slice(startIndex, startIndex + limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1
    }
  };
}

// Wanted list methods
export async function createWanted(userId, data) {
  const count = await Wanted.countDocuments({ user: userId });
  if (count >= 10) {
    const error = new Error('You cannot have more than 10 active wanted requests');
    error.status = 400;
    throw error;
  }

  const wanted = await Wanted.create({
    user: userId,
    title: data.title,
    titleNormalized: data.title ? data.title.toLowerCase().trim() : undefined,
    subject: data.subject,
    department: data.department,
    maxPrice: data.maxPrice
  });

  return wanted;
}

export async function getWanted(userId) {
  return Wanted.find({ user: userId }).sort({ createdAt: -1 });
}

export async function deleteWanted(userId, wantedId) {
  const item = await Wanted.findOne({ _id: wantedId, user: userId });
  if (!item) {
    const error = new Error('Wanted item not found');
    error.status = 404;
    throw error;
  }
  await Wanted.deleteOne({ _id: wantedId });
  return { message: 'Wanted item removed successfully' };
}

// Notification inbox methods
export async function getNotifications(userId, { page = 1, limit = 20, unread }) {
  const filter = { user: userId };
  if (unread === true) {
    filter.read = false;
  }

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, read: false })
  ]);

  return {
    items,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1
    }
  };
}

export async function markRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { $set: { read: true } },
    { new: true }
  );

  if (!notification) {
    const error = new Error('Notification not found');
    error.status = 404;
    throw error;
  }

  return notification;
}

export async function markAllRead(userId) {
  await Notification.updateMany(
    { user: userId, read: false },
    { $set: { read: true } }
  );

  return { message: 'All notifications marked as read' };
}

