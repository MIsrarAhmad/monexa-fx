// Backend/src/routes/kycRoutes.js
import express from 'express';
import {
  submitKyc,
  getMyKycStatus,
  getPendingKycs,
  reviewKyc,
} from '../controllers/kycController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { uploadKycDocuments } from '../middleware/uploadKyc.js';

const router = express.Router();

// User Routes
router.get('/me', protect, getMyKycStatus);
router.post(
  '/submit',
  protect,
  uploadKycDocuments,
  submitKyc
);

// Admin Routes
router.get('/admin/pending', protect, adminOnly, getPendingKycs);
router.put('/admin/:userId/review', protect, adminOnly, reviewKyc);

export default router;