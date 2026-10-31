import { Router } from 'express';
import { ListingController } from '../controllers/listing.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { requireVerified } from '../middleware/requireVerified.js';
import { uploadImages } from '../middleware/upload.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import {
  listingSchema,
  listingIdParamsSchema,
  imageIndexParamsSchema,
  myListingsQuerySchema,
  searchQuerySchema,
  priceHintQuerySchema,
  isbnParamsSchema,
} from '../validators/listing.validator.js';

const router = Router();

// Search listings (public)
router.get(
  '/',
  validateQuery(searchQuerySchema),
  ListingController.searchListings
);

// Price hint (authenticated)
router.get(
  '/price-hint',
  requireAuth,
  validateQuery(priceHintQuerySchema),
  ListingController.getPriceHint
);

// ISBN lookup (authenticated)
router.get(
  '/isbn/:isbn',
  requireAuth,
  validateParams(isbnParamsSchema),
  ListingController.lookupIsbn
);

// Create listing
router.post(
  '/',
  requireAuth,
  requireVerified,
  validateBody(listingSchema),
  ListingController.createListing
);

// Get my listings (under /api/listings/me or mounted under /api/me/listings)
router.get(
  '/me',
  requireAuth,
  validateQuery(myListingsQuerySchema),
  ListingController.getMyListings
);

// Get single listing (public)
router.get(
  '/:id',
  optionalAuth,
  validateParams(listingIdParamsSchema),
  ListingController.getListing
);

// Update listing
router.put(
  '/:id',
  requireAuth,
  requireVerified,
  validateParams(listingIdParamsSchema),
  validateBody(listingSchema),
  ListingController.updateListing
);

// Delete listing
router.delete(
  '/:id',
  requireAuth,
  validateParams(listingIdParamsSchema),
  ListingController.deleteListing
);

// Add images
router.post(
  '/:id/images',
  requireAuth,
  validateParams(listingIdParamsSchema),
  uploadImages,
  ListingController.addImages
);

// Remove image
router.delete(
  '/:id/images/:index',
  requireAuth,
  validateParams(imageIndexParamsSchema),
  ListingController.removeImage
);

// Relist
router.post(
  '/:id/relist',
  requireAuth,
  validateParams(listingIdParamsSchema),
  ListingController.relist
);

export default router;

