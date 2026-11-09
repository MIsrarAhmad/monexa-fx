// src/routes/webhookRoutes.js
import express from 'express';
import { handleBinanceWebhook } from '../controllers/webhookController.js';

const router = express.Router();

router.post('/binance', handleBinanceWebhook);

export default router;