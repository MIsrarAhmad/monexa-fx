// Backend/src/routes/adminRoutes.js
import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  getAdminStats,
  getPendingWithdrawals,
  processWithdrawalAction,
  getPendingDeposits,
  processDepositAction,
  getMaintenanceStatus,
  toggleMaintenanceStatus,
  permanentlyDeleteUser,
  getAdminReferralCode,
  createAnnouncement,
} from '../controllers/adminController.js';

const router = express.Router();

// Public route to check maintenance mode
router.get('/maintenance', getMaintenanceStatus);

// Protected Admin routes
router.use(protect, adminOnly);
router.get('/stats', getAdminStats);
router.get('/referral-code', getAdminReferralCode);
router.post('/announcements', createAnnouncement);
router.delete('/users/:userId', permanentlyDeleteUser);
router.get('/withdrawals/pending', getPendingWithdrawals);
router.put('/withdrawals/:id/action', processWithdrawalAction);

// Admin Deposit Approval Routes (FIXES 404 ERROR)
router.get('/deposits/pending', getPendingDeposits);
router.put('/deposits/:id/action', processDepositAction);

router.put('/maintenance', toggleMaintenanceStatus);

export default router;