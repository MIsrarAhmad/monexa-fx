// src/routes/referralRoutes.js
import express from 'express';
import { getMyReferralTree } from '../controllers/referralController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/my-tree', protect, getMyReferralTree);

export default router;