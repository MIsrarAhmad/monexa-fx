// src/routes/authRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getMe,
  loginUser,
  registerUser,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { COUNTRY_CODES } from '../utils/countries.js';

const router = express.Router();
const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many reset attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const verificationRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many verification email requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many verification attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/countries', (req, res) => {
  res.json({ success: true, data: { countries: COUNTRY_CODES } });
});
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-email', verificationLimiter, verifyEmail);
router.post('/resend-verification', verificationRequestLimiter, resendVerification);
router.post('/forgot-password', passwordResetRequestLimiter, requestPasswordReset);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.get('/me', protect, getMe);

export default router;