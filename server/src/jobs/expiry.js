import { Listing } from '../models/Listing.js';
import { Notification } from '../models/Notification.js';
import { env } from '../config/env.js';

/**
 * Runs the expiry and reminder check.
 * Safe to run multiple times without duplicate notifications or side-effects.
 */
export async function runExpiryJob() {
  const now = new Date();

  // 1. Send reminders for listings expiring in 6-7 days with no prior reminder
  const sixDays = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const dueForReminder = await Listing.find({
    status: 'available',
    expiresAt: { $gte: sixDays, $lte: sevenDays },
    reminderSentAt: null,
  });

  for (const listing of dueForReminder) {
    listing.reminderSentAt = now;
    await listing.save();

    try {
      await Notification.create({
        user: listing.seller,
        type: 'listing_expiring',
        message: `Your listing "${listing.title}" is expiring soon.`,
        link: `/listings/${listing._id}`,
      });
    } catch {
      // Ignore notification failures
    }
  }

  // 2. Mark listings with past expiresAt as expired
  const expiredResult = await Listing.updateMany(
    {
      status: 'available',
      expiresAt: { $lt: now },
    },
    {
      status: 'expired',
    }
  );

  return {
    remindersSent: dueForReminder.length,
    expiredCount: expiredResult.modifiedCount ?? 0,
  };
}

let jobInterval = null;

export function startExpiryJob() {
  if (!env.JOBS_ENABLED) {
    return;
  }

  // Run at startup
  runExpiryJob().catch((err) => {
    console.error('[ExpiryJob] Initial run error:', err.message);
  });

  // Run every 6 hours
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  jobInterval = setInterval(() => {
    runExpiryJob().catch((err) => {
      console.error('[ExpiryJob] Scheduled run error:', err.message);
    });
  }, SIX_HOURS);
}

export function stopExpiryJob() {
  if (jobInterval) {
    clearInterval(jobInterval);
    jobInterval = null;
  }
}
