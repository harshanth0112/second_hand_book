import * as notificationService from '../services/notification.service.js';
import {
  createWantedSchema,
  notificationQuerySchema,
  patchNotificationSchema,
  wishlistQuerySchema
} from '../validators/notification.validator.js';

// Wishlist
export async function addToWishlist(req, res, next) {
  try {
    const { listingId } = req.params;
    const wishlist = await notificationService.addToWishlist(req.user._id, listingId);
    res.json({ ok: true, data: wishlist });
  } catch (err) {
    next(err);
  }
}

export async function removeFromWishlist(req, res, next) {
  try {
    const { listingId } = req.params;
    const wishlist = await notificationService.removeFromWishlist(req.user._id, listingId);
    res.json({ ok: true, data: wishlist });
  } catch (err) {
    next(err);
  }
}

export async function getWishlist(req, res, next) {
  try {
    const query = wishlistQuerySchema.parse(req.query);
    const result = await notificationService.getWishlist(req.user._id, query);
    res.json({ ok: true, data: result.items, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
}

// Wanted
export async function createWanted(req, res, next) {
  try {
    const data = createWantedSchema.parse(req.body);
    const wanted = await notificationService.createWanted(req.user._id, data);
    res.status(201).json({ ok: true, data: wanted });
  } catch (err) {
    next(err);
  }
}

export async function getWanted(req, res, next) {
  try {
    const items = await notificationService.getWanted(req.user._id);
    res.json({ ok: true, data: items });
  } catch (err) {
    next(err);
  }
}

export async function deleteWanted(req, res, next) {
  try {
    const { id } = req.params;
    const result = await notificationService.deleteWanted(req.user._id, id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
}

// Notifications
export async function getNotifications(req, res, next) {
  try {
    const query = notificationQuerySchema.parse(req.query);
    const result = await notificationService.getNotifications(req.user._id, query);
    res.json({
      ok: true,
      data: result.items,
      unreadCount: result.unreadCount,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    patchNotificationSchema.parse(req.body);
    const { id } = req.params;
    const notification = await notificationService.markRead(req.user._id, id);
    res.json({ ok: true, data: notification });
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await notificationService.markAllRead(req.user._id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
}

