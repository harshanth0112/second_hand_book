import { PrivacyService } from '../services/privacy.service.js';
import { env } from '../config/env.js';

export class PrivacyController {
  static async exportData(req, res, next) {
    try {
      const data = await PrivacyService.exportUserData(req.user);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="campus-book-exchange-export.json"'
      );
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  static async deleteAccount(req, res, next) {
    try {
      const result = await PrivacyService.deleteUserAccount(req.user, req.body);
      res.clearCookie(env.COOKIE_NAME, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
