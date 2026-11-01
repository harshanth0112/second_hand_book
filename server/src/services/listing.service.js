import { Listing } from '../models/Listing.js';
import { ImageService } from './image.service.js';
import { matchWanted, notifyPriceDrop } from './notification.service.js';

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

    // Fire wanted matching asynchronously without blocking response
    matchWanted({
      _id: listing._id,
      title: listing.title,
      subject: listing.subject,
      department: listing.department,
      price: listing.price,
      owner: userId
    }).catch(err => console.error('[Listing matchWanted Error]:', err.message));

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

    const oldPrice = listing.price;
    const titleNormalized = ListingService.normalizeTitle(data.title);

    Object.assign(listing, data, { titleNormalized });
    await listing.save();

    if (data.price !== undefined && data.price < oldPrice) {
      notifyPriceDrop(
        {
          _id: listing._id,
          title: listing.title,
          owner: listing.seller
        },
        oldPrice,
        data.price
      ).catch(err => console.error('[Listing notifyPriceDrop Error]:', err.message));
    }

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

    // Clean up associated images from Cloudinary upon deletion
    if (listing.images && listing.images.length > 0) {
      for (const img of listing.images) {
        const idOrUrl = typeof img === 'object' && img?.publicId ? img.publicId : (img?.url || img);
        if (idOrUrl) {
          ImageService.deleteImage(idOrUrl).catch((err) =>
            console.error('[Listing deleteImage Error]:', err.message)
          );
        }
      }
    }
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
      const uploaded = await ImageService.uploadImage(file.buffer, 'book-exchange/listings');
      listing.images.push({
        url: uploaded.url,
        publicId: uploaded.publicId,
      });
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

    const [removed] = listing.images.splice(index, 1);
    await listing.save();

    if (removed) {
      const idOrUrl = typeof removed === 'object' && removed?.publicId ? removed.publicId : (removed?.url || removed);
      await ImageService.deleteImage(idOrUrl);
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

  static async searchListings({
    q,
    subject,
    department,
    semester,
    condition,
    listingType,
    minPrice,
    maxPrice,
    sort = 'newest',
    page = 1,
    limit = 12,
  }, user = null) {
    const andConditions = [{ status: 'available' }];

    if (q) {
      andConditions.push({ $text: { $search: q } });
    }

    if (subject) {
      andConditions.push({ subject });
    }

    if (department) {
      andConditions.push({ department });
    }

    if (semester !== undefined) {
      andConditions.push({ semester });
    }

    if (condition) {
      const conditionList = condition.split(',').map((c) => c.trim()).filter(Boolean);
      if (conditionList.length > 0) {
        andConditions.push({ condition: { $in: conditionList } });
      }
    }

    if (listingType) {
      andConditions.push({ listingType });
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter = {};
      if (minPrice !== undefined) priceFilter.$gte = minPrice;
      if (maxPrice !== undefined) priceFilter.$lte = maxPrice;
      andConditions.push({ price: priceFilter });
    }

    if (user && user.blockedUsers && user.blockedUsers.length > 0) {
      andConditions.push({ seller: { $nin: user.blockedUsers } });
    }

    const filter = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };

    let sortOption = { createdAt: -1 };
    let projection = {
      _id: 1,
      title: 1,
      author: 1,
      subject: 1,
      department: 1,
      semester: 1,
      listingType: 1,
      price: 1,
      condition: 1,
      images: 1,
      coverUrl: 1,
      createdAt: 1,
      seller: 1,
    };

    if (sort === 'price_asc') {
      sortOption = { price: 1, createdAt: -1 };
    } else if (sort === 'price_desc') {
      sortOption = { price: -1, createdAt: -1 };
    } else if (sort === 'relevance' && q) {
      sortOption = { score: { $meta: 'textScore' } };
      projection.score = { $meta: 'textScore' };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Listing.find(filter, projection)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate('seller', 'name avatar')
        .lean(),
      Listing.countDocuments(filter),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  static async getPriceHint(userId, { isbn, title }) {
    const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const matchConditions = {
      listingType: 'sell',
      status: { $in: ['sold', 'available'] },
      createdAt: { $gte: twelveMonthsAgo },
      seller: { $ne: userId },
    };

    if (isbn) {
      const cleanIsbn = isbn.replace(/[-\s]/g, '');
      matchConditions.isbn = cleanIsbn;
    } else if (title) {
      matchConditions.titleNormalized = ListingService.normalizeTitle(title);
    }

    const aggregation = [
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          average: { $avg: '$price' },
          min: { $min: '$price' },
          max: { $max: '$price' },
        },
      },
    ];

    const result = await Listing.aggregate(aggregation);

    if (!result || result.length === 0 || result[0].count < 3) {
      return {
        count: result?.[0]?.count || 0,
        hint: null,
      };
    }

    return {
      count: result[0].count,
      hint: {
        average: Math.round(result[0].average),
        min: result[0].min,
        max: result[0].max,
      },
    };
  }
}

