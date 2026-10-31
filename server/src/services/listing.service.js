import { Listing } from '../models/Listing.js';
import { ImageService } from './image.service.js';

export class ListingService {
  static normalizeTitle(title) {
    return title.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  static async createListing(userId, data) {
    const titleNormalized = ListingService.normalizeTitle(data.title);
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

    const listing = await Listing.create({
      ...data,
      seller: userId,
      status: 'available',
      views: 0,
      titleNormalized,
      expiresAt,
    });

    return listing;
  }

  static async updateListing(id, userId, data) {
    const listing = await Listing.findById(id);
    if (!listing) {
      const error = new Error('Listing not found');
      error.status = 404;
      throw error;
    }

    if (!listing.seller.equals(userId)) {
      const error = new Error('Not authorized to edit this listing');
      error.status = 403;
      throw error;
    }

    if (listing.status !== 'available') {
      const error = new Error('Listing cannot be edited in its current status');
      error.status = 409;
      throw error;
    }

    const titleNormalized = ListingService.normalizeTitle(data.title);

    Object.assign(listing, data, { titleNormalized });
    await listing.save();

    return listing;
  }

  static async deleteListing(id, user) {
    const listing = await Listing.findById(id);
    if (!listing) {
      const error = new Error('Listing not found');
      error.status = 404;
      throw error;
    }

    const isOwner = listing.seller.equals(user._id);
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      const error = new Error('Not authorized to delete this listing');
      error.status = 403;
      throw error;
    }

    if (listing.status === 'reserved') {
      const error = new Error('Cancel the active reservation before deleting');
      error.status = 409;
      throw error;
    }

    listing.status = 'removed';
    await listing.save();
  }

  static async addImages(id, userId, files) {
    const listing = await Listing.findById(id);
    if (!listing) {
      const error = new Error('Listing not found');
      error.status = 404;
      throw error;
    }

    if (!listing.seller.equals(userId)) {
      const error = new Error('Not authorized to modify this listing');
      error.status = 403;
      throw error;
    }

    if (!files || files.length === 0) {
      const error = new Error('No images provided');
      error.status = 400;
      throw error;
    }

    if (listing.images.length + files.length > 4) {
      const error = new Error('Listing already has the maximum number of images');
      error.status = 409;
      throw error;
    }

    for (const file of files) {
      const uploaded = await ImageService.uploadImage(file.buffer);
      listing.images.push(uploaded.url);
    }

    await listing.save();
    return listing;
  }

  static async removeImage(id, userId, index) {
    const listing = await Listing.findById(id);
    if (!listing) {
      const error = new Error('Listing not found');
      error.status = 404;
      throw error;
    }

    if (!listing.seller.equals(userId)) {
      const error = new Error('Not authorized to modify this listing');
      error.status = 403;
      throw error;
    }

    if (index < 0 || index >= listing.images.length) {
      const error = new Error('Image index out of range');
      error.status = 400;
      throw error;
    }

    const [removedUrl] = listing.images.splice(index, 1);
    await listing.save();

    if (removedUrl) {
      await ImageService.deleteImage(removedUrl);
    }

    return listing;
  }

  static async relist(id, userId) {
    const listing = await Listing.findById(id);
    if (!listing) {
      const error = new Error('Listing not found');
      error.status = 404;
      throw error;
    }

    if (!listing.seller.equals(userId)) {
      const error = new Error('Not authorized to relist this listing');
      error.status = 403;
      throw error;
    }

    if (listing.status !== 'expired') {
      const error = new Error('Only expired listings can be relisted');
      error.status = 409;
      throw error;
    }

    listing.status = 'available';
    listing.expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    await listing.save();

    return listing;
  }

  static async getListing(id, viewer) {
    const listing = await Listing.findById(id).populate('seller', '_id name avatar department semester createdAt');
    if (!listing) {
      const error = new Error('Listing not found');
      error.status = 404;
      throw error;
    }

    const isOwner = viewer && listing.seller._id.equals(viewer._id);
    const isAdmin = viewer && viewer.role === 'admin';

    if (listing.status === 'removed' && !isOwner && !isAdmin) {
      const error = new Error('Listing not found');
      error.status = 404;
      throw error;
    }

    // Increment views asynchronously if viewer is not the owner
    if (!isOwner) {
      Listing.findByIdAndUpdate(id, { $inc: { views: 1 } }).exec().catch(() => {});
    }

    return listing;
  }

  static async getMyListings(userId, { page = 1, limit = 12, status }) {
    const query = {
      seller: userId,
      status: { $ne: 'removed' },
    };

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Listing.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Listing.countDocuments(query),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

