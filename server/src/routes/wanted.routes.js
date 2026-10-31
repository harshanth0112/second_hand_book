import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createWanted,
  getWanted,
  deleteWanted
} from '../controllers/notification.controller.js';

const router = Router();

router.use(requireAuth);

router.post('/', createWanted);
router.get('/', getWanted);
router.delete('/:id', deleteWanted);

export default router;
