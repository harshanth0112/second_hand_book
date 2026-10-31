import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { ListingController } from '../controllers/listing.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { changePasswordSchema, updateProfileSchema } from '../validators/auth.validator.js';
import { myListingsQuerySchema } from '../validators/listing.validator.js';

const router = Router();

// All /api/me routes require authentication
router.use(requireAuth);

// GET /api/me — return current user profile
router.get('/', AuthController.getProfile);

// PUT /api/me — update profile fields
router.put('/', validateBody(updateProfileSchema), AuthController.updateProfile);

// PUT /api/me/password — change password
router.put('/password', validateBody(changePasswordSchema), AuthController.changePassword);

// GET /api/me/listings — user's listings
router.get('/listings', validateQuery(myListingsQuerySchema), ListingController.getMyListings);

export default router;

