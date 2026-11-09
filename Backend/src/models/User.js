// Backend/src/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    referralCode: {
      type: String,
      unique: true,
      required: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    hasUsedGracePeriod: {
      type: Boolean,
      default: false,
    },
    firstDepositAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // === NEW KYC VERIFICATION FIELDS ===
    kycStatus: {
      type: String,
      enum: ['UNVERIFIED', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'UNVERIFIED',
    },
    kycDetails: {
      fullName: { type: String, default: '' },
      documentType: { type: String, default: 'PASSPORT' },
      documentNumber: { type: String, default: '' },
      idFrontUrl: { type: String, default: '' },
      idBackUrl: { type: String, default: '' },
      selfieUrl: { type: String, default: '' },
      rejectionReason: { type: String, default: '' },
      submittedAt: { type: Date, default: null },
      reviewedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
export default User;