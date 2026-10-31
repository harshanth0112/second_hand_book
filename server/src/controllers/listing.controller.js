import { ListingService } from '../services/listing.service.js';

export class ListingController {
  static async createListing(req, res, next) {
    try {
      const listing = await ListingService.createListing(req.user._id, req.body);
      return res.status(201).json(listing);
    } catch (error) {
      next(error);
    }
  }

  static async updateListing(req, res, next) {
    try {
      const listing = await ListingService.updateListing(req.params.id, req.user._id, req.body);
      return res.status(200).json(listing);
    } catch (error) {
      next(error);
    }
  }

  static async deleteListing(req, res, next) {
    try {
      await ListingService.deleteListing(req.params.id, req.user);
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async addImages(req, res, next) {
    try {
      const listing = await ListingService.addImages(req.params.id, req.user._id, req.files);
      return res.status(200).json(listing);
    } catch (error) {
      next(error);
    }
  }

  static async removeImage(req, res, next) {
    try {
      const listing = await ListingService.removeImage(req.params.id, req.user._id, req.params.index);
      return res.status(200).json(listing);
    } catch (error) {
      next(error);
    }
  }

  static async relist(req, res, next) {
    try {
      const listing = await ListingService.relist(req.params.id, req.user._id);
      return res.status(200).json(listing);
    } catch (error) {
      next(error);
    }
  }

  static async getListing(req, res, next) {
    try {
      const listing = await ListingService.getListing(req.params.id, req.user);
      return res.status(200).json(listing);
    } catch (error) {
      next(error);
    }
  }

  static async getMyListings(req, res, next) {
    try {
      const result = await ListingService.getMyListings(req.user._id, req.query);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

