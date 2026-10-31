import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  adminReportsQuerySchema,
  updateReportSchema,
  banUserSchema,
  createMeetupPointSchema,
  updateMeetupPointSchema,
} from '../validators/admin.validator.js';

const router = Router();

// All routes require authentication and admin role
router.use(requireAuth, requireRole('admin'));

// Reports
router.get('/reports', validateQuery(adminReportsQuerySchema), AdminController.getReports);
router.patch('/reports/:id', validateBody(updateReportSchema), AdminController.updateReport);

// Listings
router.delete('/listings/:id', AdminController.removeListing);

// Users
router.patch('/users/:id/ban', validateBody(banUserSchema), AdminController.setUserBan);

// Meetup points
router.get('/meetup-points', AdminController.getMeetupPoints);
router.post('/meetup-points', validateBody(createMeetupPointSchema), AdminController.createMeetupPoint);
router.patch('/meetup-points/:id', validateBody(updateMeetupPointSchema), AdminController.updateMeetupPoint);

export default router;
