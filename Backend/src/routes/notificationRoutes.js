import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getNotifications,
  getPushPublicKey,
  markAllNotificationsRead,
  markNotificationRead,
  removePushSubscription,
  savePushSubscription,
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(protect);
router.get('/', getNotifications);
router.get('/push/public-key', getPushPublicKey);
router.post('/push/subscription', savePushSubscription);
router.delete('/push/subscription', removePushSubscription);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);

export default router;
