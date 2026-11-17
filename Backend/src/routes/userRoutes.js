import express from 'express';
import { updateProfile, changePassword, getProfilePicture, updateProfilePicture, deleteProfilePicture } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadProfilePicture } from '../middleware/uploadProfilePicture.js';

const router = express.Router();

router.put('/profile', protect, updateProfile);
router.get('/profile-picture', protect, getProfilePicture);
router.put('/profile-picture', protect, uploadProfilePicture, updateProfilePicture);
router.delete('/profile-picture', protect, deleteProfilePicture);
router.put('/change-password', protect, changePassword);

export default router;