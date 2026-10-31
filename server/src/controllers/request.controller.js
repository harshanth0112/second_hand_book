import { RequestService } from '../services/request.service.js';

export class RequestController {
  static async createRequest(req, res, next) {
    try {
      const request = await RequestService.createRequest(
        req.params.id,
        req.user._id,
        req.body
      );
      return res.status(201).json(request);
    } catch (err) {
      next(err);
    }
  }

  static async handleAction(req, res, next) {
    try {
      const result = await RequestService.handleAction(
        req.params.id,
        req.user,
        req.body
      );
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getSent(req, res, next) {
    try {
      const results = await RequestService.getSentRequests(req.user._id, req.query);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  }

  static async getReceived(req, res, next) {
    try {
      const results = await RequestService.getReceivedRequests(req.user._id, req.query);
      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  }
}

