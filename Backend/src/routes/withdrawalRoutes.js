// src/routes/withdrawalRoutes.js
import express from 'express';
import { requestWithdrawal } from '../controllers/withdrawalController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/request', protect, requestWithdrawal);

export default router;