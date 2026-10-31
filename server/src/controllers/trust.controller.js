import { TrustService } from '../services/trust.service.js';
import {
  createReviewSchema,
  createReportSchema,
  paginationQuerySchema,
} from '../validators/review.validator.js';

export class TrustController {
  static async createReview(req, res, next) {
    try {
      const data = createReviewSchema.parse(req.body);
      const review = await TrustService.createReview(req.user._id, data);
      res.status(201).json(review);
    } catch (err) {
      next(err);
    }
  }

  static async getUserProfile(req, res, next) {
    try {
      const profile = await TrustService.getUserProfileWithRatings(req.params.id);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  }

  static async getUserReviews(req, res, next) {
    try {
      const query = paginationQuerySchema.parse(req.query);
      const result = await TrustService.getUserReviews(req.params.id, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async reportListing(req, res, next) {
    try {
      const data = createReportSchema.parse(req.body);
      const report = await TrustService.reportListing(req.user._id, req.params.id, data);
      res.status(201).json(report);
    } catch (err) {
      next(err);
    }
  }

  static async reportUser(req, res, next) {
    try {
      const data = createReportSchema.parse(req.body);
      const report = await TrustService.reportUser(req.user._id, req.params.id, data);
      res.status(201).json(report);
    } catch (err) {
      next(err);
    }
  }

  static async blockUser(req, res, next) {
    try {
      const result = await TrustService.blockUser(req.user._id, req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async unblockUser(req, res, next) {
    try {
      const result = await TrustService.unblockUser(req.user._id, req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getSellerDashboard(req, res, next) {
    try {
      const dashboard = await TrustService.getSellerDashboard(req.user._id);
      res.json(dashboard);
    } catch (err) {
      next(err);
    }
  }
}

