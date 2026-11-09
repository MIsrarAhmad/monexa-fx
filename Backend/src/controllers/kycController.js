// Backend/src/controllers/kycController.js
import User from '../models/User.js';

// @desc    Submit KYC Verification Documents
// @route   POST /api/kyc/submit
// @access  Private (User)
export const submitKyc = async (req, res) => {
  try {
    const { fullName, documentType, documentNumber } = req.body;

    if (!req.files || !req.files.idFront || !req.files.idBack || !req.files.selfie) {
      return res.status(400).json({
        success: false,
        error: 'Please upload all 3 required photos: ID Front, ID Back, and Live Selfie.',
      });
    }

    const idFrontUrl = req.files.idFront[0].path;
    const idBackUrl = req.files.idBack[0].path;
    const selfieUrl = req.files.selfie[0].path;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.kycStatus = 'PENDING';
    user.kycDetails = {
      fullName,
      documentType,
      documentNumber,
      idFrontUrl,
      idBackUrl,
      selfieUrl,
      rejectionReason: '',
      submittedAt: new Date(),
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'KYC documents submitted successfully and are now under review!',
      data: {
        kycStatus: user.kycStatus,
        kycDetails: user.kycDetails,
      },
    });
  } catch (error) {
    console.error('KYC Submission Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get Current User's KYC Status
// @route   GET /api/kyc/me
// @access  Private
export const getMyKycStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('kycStatus kycDetails');
    return res.status(200).json({
      success: true,
      data: {
        kycStatus: user.kycStatus || 'UNVERIFIED',
        kycDetails: user.kycDetails || {},
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get All Pending KYC Submissions (Admin)
// @route   GET /api/admin/kyc/pending
// @access  Private/Admin
export const getPendingKycs = async (req, res) => {
  try {
    const pendingUsers = await User.find({ kycStatus: 'PENDING' })
      .select('name email kycStatus kycDetails createdAt')
      .sort({ 'kycDetails.submittedAt': -1 });

    return res.status(200).json({
      success: true,
      data: pendingUsers,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Approve or Reject User KYC Submission (Admin)
// @route   PUT /api/admin/kyc/:userId/review
// @access  Private/Admin
export const reviewKyc = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body;
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (action === 'APPROVE') {
      user.kycStatus = 'APPROVED';
      user.kycDetails.rejectionReason = '';
      user.kycDetails.reviewedAt = new Date();
    } else if (action === 'REJECT') {
      user.kycStatus = 'REJECTED';
      user.kycDetails.rejectionReason = rejectionReason || 'Documents did not meet compliance standards.';
      user.kycDetails.reviewedAt = new Date();
    } else {
      return res.status(400).json({ success: false, error: 'Invalid action. Must be APPROVE or REJECT.' });
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: `KYC status successfully updated to ${user.kycStatus}`,
      data: {
        userId: user._id,
        kycStatus: user.kycStatus,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};