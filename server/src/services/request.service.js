import mongoose from 'mongoose';
import { Request } from '../models/Request.js';
import { Listing } from '../models/Listing.js';
import { MeetupPoint } from '../models/MeetupPoint.js';
import { Conversation } from '../models/Conversation.js';
import { User } from '../models/User.js';
import { notify } from './notification.service.js';
import { env } from '../config/env.js';

export class RequestService {
  static async createRequest(listingId, buyerId, { message = '', offeredBook = '' }) {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      const err = new Error('Listing not found');
      err.status = 404;
      throw err;
    }

    if (listing.seller.equals(buyerId)) {
      const err = new Error('You cannot request your own listing');
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
      const err = new Error('Cannot send request due to user block');
      err.status = 403;
      throw err;
    }

    if (listing.status !== 'available') {
      const err = new Error('Listing is no longer available');
      err.status = 409;
      throw err;
    }

    if (listing.listingType === 'swap' && (!offeredBook || offeredBook.trim() === '')) {
      const err = new Error('Validation failed');
      err.status = 400;
      err.errors = [{ field: 'offeredBook', message: 'offeredBook is required for swap listings' }];
      throw err;
    }

    // Check if buyer already has an active pending request on this listing
    const existingPending = await Request.findOne({
      listing: listingId,
      buyer: buyerId,
      status: 'pending',
    });
    if (existingPending) {
      const err = new Error('You already have a pending request for this listing');
      err.status = 409;
      throw err;
    }

    // Check if there is an agreed price negotiated via chat
    let agreedPrice = null;
    const existingConv = await Conversation.findOne({
      listing: listingId,
      buyer: buyerId,
    });
    if (existingConv && existingConv.agreedPrice) {
      agreedPrice = existingConv.agreedPrice;
    }

    const request = await Request.create({
      listing: listingId,
      seller: listing.seller,
      buyer: buyerId,
      status: 'pending',
      message,
      offeredBook,
      agreedPrice,
    });

    notify(
      listing.seller,
      'request_received',
      `You received a new exchange/purchase request for "${listing.title}".`,
      `/requests`,
      {
        templateId: env.RESEND_TEMPLATE_BOOK_ENQUIRY,
        subject: `New enquiry for "${listing.title}"`,
        variables: {
          buyer_name: buyer?.name || 'A student',
          book_title: listing.title,
          enquiry_details: message || 'Interested in your book listing.',
          enquiry_url: `${env.CLIENT_URL}/requests`,
        },
      }
    ).catch(err => console.error('[Notify request_received Error]:', err.message));

    return request;
  }

  static async handleAction(requestId, user, body) {
    const { action } = body;

    switch (action) {
      case 'accept':
        return RequestService.acceptRequest(requestId, user._id, body);
      case 'reject':
        return RequestService.rejectRequest(requestId, user._id);
      case 'cancel':
        return RequestService.cancelRequest(requestId, user._id);
      case 'confirmHandover':
        return RequestService.confirmHandover(requestId, user._id);
      default: {
        const err = new Error('Invalid action');
        err.status = 400;
        throw err;
      }
    }
  }

  static async acceptRequest(requestId, sellerId, { meetupPointId, meetupTime }) {
    const request = await Request.findById(requestId);
    if (!request) {
      const err = new Error('Request not found');
      err.status = 404;
      throw err;
    }

    if (!request.seller.equals(sellerId)) {
      const err = new Error('Only the seller can accept this request');
      err.status = 403;
      throw err;
    }

    if (request.status !== 'pending') {
      const err = new Error('Request is no longer pending');
      err.status = 409;
      throw err;
    }

    // Meetup point validation
    const meetupPoint = await MeetupPoint.findById(meetupPointId);
    if (!meetupPoint || !meetupPoint.active) {
      const err = new Error('Invalid or inactive meetup point');
      err.status = 400;
      throw err;
    }

    // Meetup time validation: future and within 14 days
    const time = new Date(meetupTime);
    const now = Date.now();
    const maxFuture = now + 14 * 24 * 60 * 60 * 1000;
    if (isNaN(time.getTime()) || time.getTime() <= now || time.getTime() > maxFuture) {
      const err = new Error('meetupTime must be in the future and within 14 days');
      err.status = 400;
      throw err;
    }

    // Atomic update to reserve listing: ensures only one buyer gets the reservation
    const updatedListing = await Listing.findOneAndUpdate(
      {
        _id: request.listing,
        seller: sellerId,
        status: 'available',
      },
      {
        $set: {
          status: 'reserved',
          reservedFor: request.buyer,
          handoverConfirmedBy: [],
        },
      },
      { new: true }
    );

    if (!updatedListing) {
      const err = new Error('Listing is no longer available');
      err.status = 409;
      throw err;
    }

    // Update the request to accepted
    request.status = 'accepted';
    request.meetupPoint = meetupPointId;
    request.meetupTime = time;
    await request.save();

    // Reject all other pending requests on this listing
    await Request.updateMany(
      {
        listing: request.listing,
        _id: { $ne: request._id },
        status: 'pending',
      },
      {
        $set: { status: 'rejected' },
      }
    );

    notify(
      request.buyer,
      'request_accepted',
      `Your request for "${updatedListing.title}" was accepted! Meetup is set.`,
      `/requests`
    ).catch(err => console.error('[Notify request_accepted Error]:', err.message));

    return request;
  }

  static async rejectRequest(requestId, sellerId) {
    const request = await Request.findById(requestId);
    if (!request) {
      const err = new Error('Request not found');
      err.status = 404;
      throw err;
    }

    if (!request.seller.equals(sellerId)) {
      const err = new Error('Only the seller can reject this request');
      err.status = 403;
      throw err;
    }

    if (request.status !== 'pending') {
      const err = new Error('Only pending requests can be rejected');
      err.status = 409;
      throw err;
    }

    request.status = 'rejected';
    await request.save();

    notify(
      request.buyer,
      'request_rejected',
      `Your request for the book was declined by the seller.`,
      `/requests`
    ).catch(err => console.error('[Notify request_rejected Error]:', err.message));

    return request;
  }

  static async cancelRequest(requestId, userId) {
    const request = await Request.findById(requestId);
    if (!request) {
      const err = new Error('Request not found');
      err.status = 404;
      throw err;
    }

    const isBuyer = request.buyer.equals(userId);
    const isSeller = request.seller.equals(userId);

    if (!isBuyer && !isSeller) {
      const err = new Error('Not authorized to cancel this request');
      err.status = 403;
      throw err;
    }

    if (request.status === 'pending') {
      if (!isBuyer) {
        const err = new Error('Only the buyer can cancel a pending request');
        err.status = 403;
        throw err;
      }
      request.status = 'cancelled';
      await request.save();

      notify(
        request.seller,
        'request_cancelled',
        `A pending request for your book was cancelled by the buyer.`,
        `/requests`
      ).catch(err => console.error('[Notify request_cancelled Error]:', err.message));

      return request;
    }

    if (request.status === 'accepted') {
      // Either seller or buyer can cancel an accepted request
      request.status = 'cancelled';
      await request.save();

      // Return listing to available and clear reservedFor & handover flags
      await Listing.findByIdAndUpdate(request.listing, {
        $set: {
          status: 'available',
          reservedFor: null,
          handoverConfirmedBy: [],
        },
      });

      const recipient = isBuyer ? request.seller : request.buyer;
      notify(
        recipient,
        'request_cancelled',
        `The accepted meetup/request for the book was cancelled.`,
        `/requests`
      ).catch(err => console.error('[Notify request_cancelled Error]:', err.message));

      return request;
    }

    const err = new Error(`Cannot cancel request in "${request.status}" status`);
    err.status = 409;
    throw err;
  }

  static async confirmHandover(requestId, userId) {
    const request = await Request.findById(requestId);
    if (!request) {
      const err = new Error('Request not found');
      err.status = 404;
      throw err;
    }

    const isBuyer = request.buyer.equals(userId);
    const isSeller = request.seller.equals(userId);

    if (!isBuyer && !isSeller) {
      const err = new Error('Only request participants can confirm handover');
      err.status = 403;
      throw err;
    }

    if (request.status !== 'accepted') {
      const err = new Error('Handover can only be confirmed on accepted requests');
      err.status = 409;
      throw err;
    }

    const listing = await Listing.findById(request.listing);
    if (!listing || listing.status !== 'reserved') {
      const err = new Error('Listing is not in reserved status');
      err.status = 409;
      throw err;
    }

    const alreadyConfirmed = listing.handoverConfirmedBy.some((id) => id.equals(userId));
    if (alreadyConfirmed) {
      const err = new Error('You have already confirmed this handover');
      err.status = 409;
      throw err;
    }

    if (listing.handoverConfirmedBy.length === 0) {
      // First confirmation: push user into handoverConfirmedBy array
      listing.handoverConfirmedBy.push(userId);
      await listing.save();
      return { request, listing, completed: false };
    }

    // Second confirmation: finalizes the handover
    listing.handoverConfirmedBy.push(userId);
    listing.status = 'sold';
    listing.buyer = request.buyer;
    listing.soldAt = new Date();
    await listing.save();

    request.status = 'completed';
    await request.save();

    const otherParty = isBuyer ? request.seller : request.buyer;
    notify(
      otherParty,
      'handover_confirmed',
      `Handover confirmed for "${listing.title}". Transaction is now complete!`,
      `/requests`
    ).catch(err => console.error('[Notify handover_confirmed Error]:', err.message));

    return { request, listing, completed: true };
  }

  static async getSentRequests(buyerId, { page = 1, limit = 12, status }) {
    const filter = { buyer: buyerId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Request.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('listing', 'title author price listingType images coverUrl status')
        .populate('seller', '_id name avatar department semester createdAt')
        .populate('meetupPoint', 'name area description')
        .lean(),
      Request.countDocuments(filter),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  static async getReceivedRequests(sellerId, { page = 1, limit = 12, status }) {
    const filter = { seller: sellerId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Request.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('listing', 'title author price listingType images coverUrl status')
        .populate('buyer', '_id name avatar department semester createdAt')
        .populate('meetupPoint', 'name area description')
        .lean(),
      Request.countDocuments(filter),
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

