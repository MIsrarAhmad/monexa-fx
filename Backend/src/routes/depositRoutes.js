// src/routes/depositRoutes.js
import express from 'express';
import { submitManualDeposit } from '../controllers/depositController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadProof } from '../middleware/uploadProof.js';

const router = express.Router();

// Enforce authentication & Multer Cloudinary upload for 'paymentProof'
router.post(
  '/submit',
  protect,
  uploadProof.single('paymentProof'),
  submitManualDeposit
);

export default router;