// Backend/src/models/User.js
import mongoose from 'mongoose';
import { isValidCountryCode } from '../utils/countries.js';
import { isValidDateOfBirth } from '../utils/dateOfBirth.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    fatherName: {
      type: String,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    dateOfBirth: {
      type: String,
      validate: isValidDateOfBirth,
    },
    country: {
      type: String,
      validate: isValidCountryCode,
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
      minlength: 8,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
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
    adminReferralCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
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
      // Start of the current qualifying 24-hour activation/holding period.
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