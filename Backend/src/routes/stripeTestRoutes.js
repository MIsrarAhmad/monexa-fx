// Backend/src/routes/stripeTestRoutes.js
import express from 'express';
import { createStripeTestSession } from '../controllers/stripeTestController.js';
import { protect } from '../middleware/authMiddleware.js'; // Destructured named export

const router = express.Router();

// Protected endpoint to generate test checkout link
router.post('/create-checkout', protect, createStripeTestSession);

export default router;