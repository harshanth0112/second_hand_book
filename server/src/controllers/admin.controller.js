import { AdminService } from '../services/admin.service.js';

export class AdminController {
  static async getReports(req, res, next) {
    try {
      const result = await AdminService.getReports(req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async updateReport(req, res, next) {
    try {
      const report = await AdminService.updateReportStatus(req.params.id, req.body.status);
      res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  }

  static async removeListing(req, res, next) {
    try {
      const listing = await AdminService.removeListing(req.params.id);
      res.status(200).json({
        message: 'Listing removed successfully',
        listing,
      });
    } catch (error) {
      next(error);
    }
  }

  static async setUserBan(req, res, next) {
    try {
      const user = await AdminService.setUserBan(req.params.id, req.body.banned, req.user);
      res.status(200).json({
        message: req.body.banned ? 'User banned successfully' : 'User unbanned successfully',
        user: user.toPublicJSON ? user.toPublicJSON() : user,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createMeetupPoint(req, res, next) {
    try {
      const point = await AdminService.createMeetupPoint(req.body);
      res.status(201).json(point);
    } catch (error) {
      next(error);
    }
  }

  static async updateMeetupPoint(req, res, next) {
    try {
      const point = await AdminService.updateMeetupPoint(req.params.id, req.body);
      res.status(200).json(point);
    } catch (error) {
      next(error);
    }
  }

  static async getMeetupPoints(req, res, next) {
    try {
      const points = await AdminService.getAllMeetupPoints();
      res.status(200).json(points);
    } catch (error) {
      next(error);
    }
  }
}

